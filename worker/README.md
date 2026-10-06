# Visitor log (Cloudflare Worker + D1)

The backend behind the visitor map on zhiyuzhang.com, served at `api.zhiyuzhang.com`.

## Endpoints

- `GET /visits` is public; the map calls it on every page load. It records the caller and
  returns what the map draws: for each visitor the city, region, country, flag, rounded
  coordinates and the time of the last request. Nothing else leaves this endpoint.
- `GET /admin/export` is for the site owner. It needs `Authorization: Bearer <ADMIN_KEY>`,
  returns everything that is stored, and never records a visit.

## What is stored

Two tables in D1 (`migrations/0001_init.sql`):

| table | one row per | what it holds |
|---|---|---|
| `visitors` | distinct IP address | the IP, its network operator (ASN and organisation, as Cloudflare reports them), the city-level location, first and last request, number of visits |
| `visits` | visit | which visitor, and when the visit started |

A visitor is identified by a salted hash of the IP. One person on two networks is
therefore two visitors, and several people behind one address are one.

A request starts a new visit when it arrives more than 5 minutes after the same visitor's
previous request (`VISIT_GAP_MS` in `visitor-log.js`). Anything sooner belongs to the visit
already in progress.

Visitors imported from the KV log this Worker used before are flagged `legacy`. That log
kept only the hash and the last request of each visitor, so they have no IP and one known
visit until they come back.

## Files

- `worker.js` is the entry point; `visitor-log.js` holds the request handling and the SQL.
- `migrations/` is the database schema.
- `test/` runs the real SQL against Node's built-in SQLite: `npm test` (Node 22.13+).
- `tools/visitors.py` reads the log through the admin export (see below).
- `tools/kv-to-d1.mjs` converted the old KV log into SQL for the one-off import.
- `.dev.vars` (not in git) holds `SALT` and `ADMIN_KEY` for local runs and for `deploy.sh`.

## Deploying

`bash deploy.sh` needs a Cloudflare API token in `CLOUDFLARE_API_TOKEN` or in `.cf_token`
(not in git), with Workers Scripts, Workers Routes and D1 edit rights. It creates the
database on first use, applies pending migrations, deploys, and sets any secret the Worker
does not have yet. It never replaces an existing secret: changing `SALT` would make every
returning visitor look new.

To try changes without touching production:

```sh
npx wrangler d1 migrations apply zzy-visitors --local
npx wrangler dev --local
```

## Reading the log

```sh
python3 tools/visitors.py pull        # download everything into exports/ (not in git)
python3 tools/visitors.py show        # visits, newest first, Beijing time
python3 tools/visitors.py visitors    # one line per visitor
python3 tools/visitors.py show --csv visits.csv
```

Where an IP is stored, the tool labels its network or institution with the QQWry (纯真)
IPv4 database, which it downloads into `exports/` on first use.

Opening `/visits` yourself counts as a visit; the export does not.
