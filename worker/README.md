# Browsing-log backend (Cloudflare Worker)

Tiny free backend that powers the **Browsing Log** globe on the site. It reads a
**coarse, city-level** location from Cloudflare's edge (`request.cf`) — no third-party
IP-geolocation service — and stores only a **salted hash** of the visitor's IP (never the
raw IP) to avoid counting the same person twice. It keeps the last ~60 visitors in a KV
ring buffer and returns them as JSON.

## One-time deploy

You need a **free** Cloudflare account. Run these from this `worker/` folder.

```sh
npm i -g wrangler          # if you don't have it
wrangler login             # opens a browser — approve access (do this yourself)

# 1) Create the KV namespace, then paste the printed id into wrangler.toml
wrangler kv namespace create VISITS

# 2) Pick a random salt (edit SALT in wrangler.toml, or set it as a secret):
#    wrangler secret put SALT   # and remove SALT from [vars] if you use a secret

# 3) Deploy
wrangler deploy
```

`wrangler deploy` prints a URL like `https://zzy-browsing-log.<you>.workers.dev`.

## Wire it to the site

Open `data/meta.json` and set:

```json
"browsingApi": "https://zzy-browsing-log.<you>.workers.dev/visits"
```

(Note the `/visits` path.) Bump the `?v=` cache-buster, commit, push. Until this is set,
the globe still renders — it just shows a neutral "warming up" note instead of live data.

## Notes

- `ALLOW_ORIGIN` in `worker.js` is locked to `https://zhiyuzhang-0212.github.io`; change it
  if the site moves to a custom domain.
- Only city/region/country + rounded lat-lng + a timestamp are stored. The IP hash never
  leaves the Worker (it's stripped from every response).
