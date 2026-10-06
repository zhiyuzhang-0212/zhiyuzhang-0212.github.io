#!/usr/bin/env bash
# Deploy the visitor-log Worker.
# Auth: a Cloudflare API token in $CLOUDFLARE_API_TOKEN or in worker/.cf_token, with
#   Account > Workers Scripts:Edit, Account > D1:Edit, Account > Account Settings:Read,
#   Zone > Workers Routes:Edit (for the api.zhiyuzhang.com custom domain).
# Usage:  bash deploy.sh
set -euo pipefail
cd "$(dirname "$0")"

WR="./node_modules/.bin/wrangler"
DB_NAME="zzy-visitors"

# Load token from file if not already in env
if [[ -z "${CLOUDFLARE_API_TOKEN:-}" && -f .cf_token ]]; then
  export CLOUDFLARE_API_TOKEN="$(tr -d '[:space:]' < .cf_token)"
fi
if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  echo "ERROR: set CLOUDFLARE_API_TOKEN or put the token in worker/.cf_token" >&2
  exit 1
fi

# Resolve account id if not pinned
if [[ -z "${CLOUDFLARE_ACCOUNT_ID:-}" ]]; then
  CLOUDFLARE_ACCOUNT_ID="$(curl -s -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
    https://api.cloudflare.com/client/v4/accounts | node -e \
    'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s);if(!j.success){console.error(JSON.stringify(j.errors));process.exit(1);}console.log(j.result[0].id)})')"
  export CLOUDFLARE_ACCOUNT_ID
fi
echo "account: $CLOUDFLARE_ACCOUNT_ID"

echo "running tests…"
node --test test/*.test.mjs > /tmp/visitor_log_tests.log 2>&1 || { tail -40 /tmp/visitor_log_tests.log; echo "ERROR: tests failed, not deploying" >&2; exit 1; }

# Create the D1 database if wrangler.toml still has the placeholder
if grep -q 'REPLACE_WITH_D1_ID' wrangler.toml; then
  echo "creating D1 database $DB_NAME…"
  OUT="$("$WR" d1 create "$DB_NAME" --location apac 2>&1)"
  echo "$OUT"
  DBID="$(echo "$OUT" | grep -oE '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' | head -1)"
  if [[ -z "$DBID" ]]; then echo "ERROR: could not parse the D1 database id" >&2; exit 1; fi
  sed -i "s/REPLACE_WITH_D1_ID/$DBID/" wrangler.toml
  echo "D1 id: $DBID"
fi

echo "applying migrations…"
"$WR" d1 migrations apply "$DB_NAME" --remote

echo "deploying…"
"$WR" deploy

# Set the secrets the Worker does not have yet, from the gitignored .dev.vars.
# An existing secret is never replaced: a different SALT would make every
# returning visitor look new.
if [[ -f .dev.vars ]]; then
  HAVE="$("$WR" secret list 2>/dev/null || true)"
  for NAME in SALT ADMIN_KEY; do
    VALUE="$(grep -E "^${NAME}=" .dev.vars | head -1 | cut -d= -f2- || true)"
    if [[ -z "$VALUE" ]]; then
      echo "note: $NAME is not in .dev.vars, skipping"
    elif grep -q "\"$NAME\"" <<<"$HAVE"; then
      echo "secret $NAME already set, left as is"
    else
      echo "setting secret $NAME…"
      printf %s "$VALUE" | "$WR" secret put "$NAME" 2>&1 | tail -2
    fi
  done
fi
