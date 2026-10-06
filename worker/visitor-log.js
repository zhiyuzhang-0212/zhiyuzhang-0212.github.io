/* =========================================================
   Visitor log behind the site's map — request handling
   ---------------------------------------------------------
   GET /visits         public; the map calls it on every page load.
                       Records the caller, then returns the city-level
                       list the map draws. Nothing else is exposed here.
   GET /admin/export   owner only (Authorization: Bearer <ADMIN_KEY>).
                       Returns everything that is stored. Read-only: it
                       never records a visit.

   Storage (D1, see migrations/0001_init.sql):
     visitors  one row per distinct IP — the IP itself, its network
               operator (from request.cf), the city-level location
               Cloudflare reports, first / last request, visit count.
     visits    one row per visit — which visitor, and when it started.

   A visitor is identified by a salted hash of the IP. A request starts
   a new visit when it arrives more than VISIT_GAP_MS after the same
   visitor's previous request; anything sooner belongs to the visit
   already in progress.

   Bindings (wrangler.toml): D1 database `DB`.
   Secrets: `SALT` (visitor hash), `ADMIN_KEY` (enables /admin/export).
   ========================================================= */

const ALLOW_ORIGINS = [
  "https://zhiyuzhang.com",
  "https://www.zhiyuzhang.com",
  "https://zhiyuzhang-0212.github.io",
];

export const VISIT_GAP_MS = 5 * 60 * 1000;

// Insert the visitor, or refresh the existing row. In the UPDATE branch every
// right-hand side still sees the row as it was before this request, so the
// `last_ts` read below is the previous request's time.
const UPSERT_VISITOR = `
  INSERT INTO visitors (id, ip, asn, org, city, region, country, flag, lat, lng,
                        first_ts, last_ts, prev_ts, visits, legacy)
  VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?11, NULL, 1, 0)
  ON CONFLICT (id) DO UPDATE SET
    visits  = visits + (CASE WHEN ?11 - last_ts > ?12 THEN 1 ELSE 0 END),
    prev_ts = last_ts,
    last_ts = ?11,
    ip = COALESCE(?2, ip), asn = COALESCE(?3, asn), org = COALESCE(?4, org),
    city = ?5, region = ?6, country = ?7, flag = ?8, lat = ?9, lng = ?10`;

// Runs right after the upsert, in the same transaction: add a visit row when
// the visitor is new (no previous request) or came back after the gap.
const INSERT_VISIT_IF_NEW = `
  INSERT INTO visits (visitor_id, ts)
  SELECT id, last_ts FROM visitors
  WHERE id = ?1 AND (prev_ts IS NULL OR last_ts - prev_ts > ?2)`;

// The only columns that ever leave through the public endpoint.
const LIST_PUBLIC = `
  SELECT city, region, country, flag, lat, lng, last_ts AS ts
  FROM visitors ORDER BY last_ts DESC`;

const EXPORT_VISITORS = `
  SELECT id, ip, asn, org, city, region, country, flag, lat, lng,
         first_ts, last_ts, visits, legacy
  FROM visitors ORDER BY last_ts DESC`;

const EXPORT_VISITS = `SELECT n, visitor_id, ts FROM visits ORDER BY ts DESC, n DESC`;

export async function handle(request, env, now = Date.now()) {
  const url = new URL(request.url);
  if (url.pathname === "/admin/export") return adminExport(request, env, now);

  const origin = request.headers.get("Origin") || "";
  const allowOrigin = ALLOW_ORIGINS.includes(origin) ? origin : ALLOW_ORIGINS[0];
  const cors = {
    "Access-Control-Allow-Origin": allowOrigin,
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Max-Age": "86400",
  };
  if (request.method === "OPTIONS") return new Response(null, { headers: cors });
  if (url.pathname !== "/visits") {
    return new Response("Not found", { status: 404, headers: cors });
  }
  if (request.method !== "GET") {
    return new Response("Method not allowed", { status: 405, headers: { ...cors, "Allow": "GET, OPTIONS" } });
  }

  const cf = request.cf || {};
  const statements = [];

  // Record this visitor only when the edge gave us a location
  const lat = parseFloat(cf.latitude), lng = parseFloat(cf.longitude);
  let me = null;
  if (isFinite(lat) && isFinite(lng)) {
    const ip = request.headers.get("CF-Connecting-IP") || "";
    const id = await hash(ip + "|" + (env.SALT || "salt"));
    me = {
      city: cf.city || "",
      region: cf.region || "",
      country: cf.country || "",
      flag: countryFlag(cf.country),
      lat: round(lat),
      lng: round(lng),
      ts: now,
    };
    statements.push(
      env.DB.prepare(UPSERT_VISITOR).bind(
        id, ip || null, Number.isFinite(cf.asn) ? cf.asn : null, cf.asOrganization || null,
        me.city, me.region, me.country, me.flag, me.lat, me.lng, now, VISIT_GAP_MS),
      env.DB.prepare(INSERT_VISIT_IF_NEW).bind(id, VISIT_GAP_MS),
    );
  }
  statements.push(env.DB.prepare(LIST_PUBLIC));

  // One transaction: the write (if any) and the list the map needs
  const results = await env.DB.batch(statements);
  const visitors = results[results.length - 1].results;
  const body = JSON.stringify({ total: visitors.length, you: me, visitors });
  return new Response(body, {
    headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

async function adminExport(request, env, now) {
  // No key configured means the endpoint does not exist
  if (!env.ADMIN_KEY) return new Response("Not found", { status: 404 });
  if (request.method !== "GET") {
    return new Response("Method not allowed", { status: 405, headers: { "Allow": "GET" } });
  }
  const m = /^Bearer\s+(.+)$/i.exec(request.headers.get("Authorization") || "");
  if (!m || !(await sameSecret(m[1], env.ADMIN_KEY))) {
    return new Response("Unauthorized", { status: 401, headers: { "WWW-Authenticate": "Bearer" } });
  }
  const [visitors, visits] = await env.DB.batch([
    env.DB.prepare(EXPORT_VISITORS),
    env.DB.prepare(EXPORT_VISITS),
  ]);
  const body = JSON.stringify({
    generated: now,
    visitGapMs: VISIT_GAP_MS,
    visitors: visitors.results,
    visits: visits.results,
  });
  return new Response(body, {
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function round(n) { return Math.round(n * 100) / 100; }

export async function hash(str) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].slice(0, 8)
    .map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Compare two secrets without leaking, through timing, where they first differ
async function sameSecret(a, b) {
  const enc = new TextEncoder();
  const [x, y] = (await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(a)),
    crypto.subtle.digest("SHA-256", enc.encode(b)),
  ])).map((d) => new Uint8Array(d));
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

function countryFlag(cc) {
  if (!cc || cc.length !== 2) return "";
  const A = 0x1f1e6, base = "A".charCodeAt(0);
  return String.fromCodePoint(A + cc.charCodeAt(0) - base, A + cc.charCodeAt(1) - base);
}
