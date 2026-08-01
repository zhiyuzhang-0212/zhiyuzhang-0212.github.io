/* =========================================================
   Visitor "Browsing Log" — Cloudflare Worker
   ---------------------------------------------------------
   - Reads COARSE, city-level geo straight from request.cf
     (provided by Cloudflare's edge — no third-party IP API).
   - Stores ONLY a salted hash of the IP, never the raw IP,
     and only to dedupe repeat visits within a short window.
   - Keeps a ring buffer of the most recent visitors in KV and
     returns them (plus a running total) as JSON for the globe.

   Bindings expected (see wrangler.toml):
     - KV namespace `VISITS`
     - var `SALT` (any random string)
   ========================================================= */

const MAX = 60;            // recent visitors kept in the ring buffer
const DEDUPE_HOURS = 6;    // same visitor within this window updates in place
const ALLOW_ORIGIN = "https://zhiyuzhang-0212.github.io";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = {
      "Access-Control-Allow-Origin": ALLOW_ORIGIN,
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Max-Age": "86400",
    };
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    if (url.pathname !== "/visits") {
      return new Response("Not found", { status: 404, headers: cors });
    }

    const cf = request.cf || {};
    const now = Date.now();

    // Load current buffer
    let store;
    try { store = JSON.parse((await env.VISITS.get("log")) || "{}"); }
    catch (e) { store = {}; }
    let list = Array.isArray(store.visitors) ? store.visitors : [];
    let total = typeof store.total === "number" ? store.total : 0;

    // Record this visitor only when the edge gave us a location
    const lat = parseFloat(cf.latitude), lng = parseFloat(cf.longitude);
    let me = null;
    if (isFinite(lat) && isFinite(lng)) {
      const ip = request.headers.get("CF-Connecting-IP") || "";
      const id = await hash(ip + "|" + (env.SALT || "salt"));
      const cutoff = now - DEDUPE_HOURS * 3600 * 1000;
      const idx = list.findIndex((v) => v.id === id);
      const isNew = idx === -1 || list[idx].ts < cutoff;

      me = {
        id,
        city: cf.city || "",
        region: cf.region || "",
        country: cf.country || "",
        flag: countryFlag(cf.country),
        lat: round(lat),
        lng: round(lng),
        ts: now,
      };
      if (idx !== -1) list.splice(idx, 1);
      list.unshift(me);
      if (list.length > MAX) list = list.slice(0, MAX);
      if (isNew) total += 1;
      await env.VISITS.put("log", JSON.stringify({ visitors: list, total }));
    }

    // Strip the hashed id before sending anything back to the browser
    const strip = (v) => ({
      city: v.city, region: v.region, country: v.country,
      flag: v.flag, lat: v.lat, lng: v.lng, ts: v.ts,
    });
    const body = JSON.stringify({
      total,
      you: me ? strip(me) : null,
      visitors: list.map(strip),
    });
    return new Response(body, {
      headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  },
};

function round(n) { return Math.round(n * 100) / 100; }

async function hash(str) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].slice(0, 8)
    .map((b) => b.toString(16).padStart(2, "0")).join("");
}

function countryFlag(cc) {
  if (!cc || cc.length !== 2) return "";
  const A = 0x1f1e6, base = "A".charCodeAt(0);
  return String.fromCodePoint(A + cc.charCodeAt(0) - base, A + cc.charCodeAt(1) - base);
}
