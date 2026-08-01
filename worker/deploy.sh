#!/usr/bin/env bash
# One-shot deploy for the browsing-log Worker.
# Auth: expects a Cloudflare API token in the environment or in worker/.cf_token.
#   Token scopes needed: Account > Workers Scripts:Edit, Account > Workers KV Storage:Edit,
#   Account > Account Settings:Read (to resolve the account id).
# Usage:  bash deploy.sh
set -euo pipefail
cd "$(dirname "$0")"

WR="./node_modules/.bin/wrangler"

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

# Create KV namespace if wrangler.toml still has the placeholder
if grep -q 'REPLACE_WITH_KV_ID' wrangler.toml; then
  echo "creating KV namespace VISITS…"
  OUT="$("$WR" kv namespace create VISITS 2>&1)"
  echo "$OUT"
  KVID="$(echo "$OUT" | grep -oE '"?id"?[[:space:]]*[:=][[:space:]]*"[0-9a-f]{32}"' | grep -oE '[0-9a-f]{32}' | head -1)"
  if [[ -z "$KVID" ]]; then echo "ERROR: could not parse KV id" >&2; exit 1; fi
  sed -i "s/REPLACE_WITH_KV_ID/$KVID/" wrangler.toml
  echo "KV id: $KVID"
fi

echo "deploying…"
"$WR" deploy 2>&1 | tee /tmp/wr_deploy.log

# Push the salt (from gitignored .dev.vars) as a Worker secret
if [[ -f .dev.vars ]]; then
  SALT_VAL="$(grep -E '^SALT=' .dev.vars | head -1 | cut -d= -f2-)"
  if [[ -n "$SALT_VAL" ]]; then
    echo "setting SALT secret…"
    printf %s "$SALT_VAL" | "$WR" secret put SALT 2>&1 | tail -2
  fi
fi

# Print the workers.dev URL for convenience
grep -oE 'https://[a-z0-9.-]+\.workers\.dev' /tmp/wr_deploy.log | head -1
