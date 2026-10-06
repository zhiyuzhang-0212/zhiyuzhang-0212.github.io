import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { handle, hash, VISIT_GAP_MS } from "../visitor-log.js";
import { toSql } from "../tools/kv-to-d1.mjs";
import { FakeD1 } from "./fake-d1.mjs";

const SCHEMA = new URL("../migrations/0001_init.sql", import.meta.url);
const MIN = 60_000, DAY = 24 * 60 * MIN;
const T0 = Date.UTC(2026, 9, 6, 4, 0, 0);
const SALT = "test-salt";
const PUBLIC_FIELDS = ["city", "country", "flag", "lat", "lng", "region", "ts"];

const SHANGHAI = { latitude: "31.22222", longitude: "121.45806", city: "Shanghai", region: "Shanghai", country: "CN",
  asn: 4812, asOrganization: "CHINANET SHANGHAI PROVINCE NETWORK" };
const NANJING = { latitude: "32.06167", longitude: "118.77778", city: "Nanjing", region: "Jiangsu", country: "CN",
  asn: 4538, asOrganization: "China Education and Research Network Center" };

function setup(extraEnv = {}) {
  const DB = new FakeD1(SCHEMA);
  return { DB, env: { DB, SALT, ...extraEnv } };
}
function request({ path = "/visits", method = "GET", ip = "1.2.3.4", cf = SHANGHAI, origin, auth } = {}) {
  const headers = {};
  if (ip) headers["CF-Connecting-IP"] = ip;
  if (origin) headers["Origin"] = origin;
  if (auth) headers["Authorization"] = auth;
  const r = new Request("https://api.zhiyuzhang.com" + path, { method, headers });
  if (cf) Object.defineProperty(r, "cf", { value: cf });
  return r;
}
async function visit(env, now, opts) {
  const res = await handle(request(opts), env, now);
  assert.equal(res.status, 200);
  return res.json();
}
const visitors = (DB) => DB.rows("SELECT * FROM visitors ORDER BY last_ts DESC");
const visitTimes = (DB, id) => DB.rows("SELECT ts FROM visits WHERE visitor_id = ? ORDER BY ts", id).map((r) => r.ts);

test("the 5-minute gap is what the owner asked for", () => {
  assert.equal(VISIT_GAP_MS, 5 * MIN);
});

test("a first request creates one visitor and one visit", async () => {
  const { DB, env } = setup();
  const body = await visit(env, T0);

  const me = { city: "Shanghai", region: "Shanghai", country: "CN", flag: "🇨🇳", lat: 31.22, lng: 121.46, ts: T0 };
  assert.deepEqual(body, { total: 1, you: me, visitors: [me] });
  assert.equal(DB.batches, 1, "one round trip to the database per request");

  const [row] = visitors(DB);
  assert.equal(row.ip, "1.2.3.4");
  assert.equal(row.asn, 4812);
  assert.equal(row.org, "CHINANET SHANGHAI PROVINCE NETWORK");
  assert.deepEqual([row.first_ts, row.last_ts, row.prev_ts, row.visits, row.legacy], [T0, T0, null, 1, 0]);
  assert.deepEqual(visitTimes(DB, row.id), [T0]);
});

test("requests within 5 minutes of the previous one belong to the same visit", async () => {
  const { DB, env } = setup();
  // each step is at most 5 minutes after the one before, even though the span is 11 minutes
  for (const t of [T0, T0 + 2 * MIN, T0 + 6 * MIN, T0 + 11 * MIN]) await visit(env, t);

  const [row] = visitors(DB);
  assert.equal(row.visits, 1);
  assert.equal(row.first_ts, T0);
  assert.equal(row.last_ts, T0 + 11 * MIN, "the last-seen time still follows every request");
  assert.deepEqual(visitTimes(DB, row.id), [T0]);
});

test("a request more than 5 minutes after the previous one is a new visit", async () => {
  const { DB, env } = setup();
  const second = T0 + 5 * MIN + 1, third = second + DAY;
  await visit(env, T0);
  await visit(env, second);
  const body = await visit(env, third);

  assert.equal(body.total, 1, "still one visitor");
  const [row] = visitors(DB);
  assert.equal(row.visits, 3);
  assert.equal(row.first_ts, T0);
  assert.equal(row.last_ts, third);
  assert.deepEqual(visitTimes(DB, row.id), [T0, second, third]);
});

test("different IPs are different visitors, most recent first", async () => {
  const { env } = setup();
  await visit(env, T0, { ip: "1.2.3.4", cf: SHANGHAI });
  let body = await visit(env, T0 + MIN, { ip: "5.6.7.8", cf: NANJING });
  assert.equal(body.total, 2);
  assert.deepEqual(body.visitors.map((v) => v.city), ["Nanjing", "Shanghai"]);
  assert.equal(body.you.city, "Nanjing");

  body = await visit(env, T0 + 2 * MIN, { ip: "1.2.3.4", cf: SHANGHAI });
  assert.equal(body.total, 2, "a returning IP does not add a visitor");
  assert.deepEqual(body.visitors.map((v) => v.city), ["Shanghai", "Nanjing"]);
});

test("the public response carries city-level fields only", async () => {
  const { DB, env } = setup();
  await visit(env, T0, { ip: "1.2.3.4", cf: SHANGHAI });
  const res = await handle(request({ ip: "203.0.113.77", cf: NANJING }), env, T0 + MIN);
  const raw = await res.text();
  const body = JSON.parse(raw);

  assert.deepEqual(Object.keys(body).sort(), ["total", "visitors", "you"]);
  for (const v of [body.you, ...body.visitors]) assert.deepEqual(Object.keys(v).sort(), PUBLIC_FIELDS);
  for (const row of visitors(DB)) {
    for (const secret of [row.ip, row.id, row.org, String(row.asn)]) {
      assert.ok(!raw.includes(secret), `public response must not contain ${secret}`);
    }
  }
});

test("without a location from the edge nothing is recorded", async () => {
  const { DB, env } = setup();
  let body = await visit(env, T0, { cf: null });
  assert.deepEqual(body, { total: 0, you: null, visitors: [] });

  await visit(env, T0 + MIN, { cf: SHANGHAI });
  body = await visit(env, T0 + 2 * MIN, { ip: "9.9.9.9", cf: { city: "Nowhere" } });
  assert.equal(body.you, null);
  assert.equal(body.total, 1, "the existing list is still returned");
  assert.equal(visitors(DB).length, 1);
});

test("location follows the latest request; stored network details are never blanked", async () => {
  const { DB, env } = setup();
  await visit(env, T0, { cf: SHANGHAI });
  await visit(env, T0 + MIN, { cf: NANJING });
  let [row] = visitors(DB);
  assert.deepEqual([row.city, row.region, row.lat, row.lng], ["Nanjing", "Jiangsu", 32.06, 118.78]);
  assert.equal(row.org, "China Education and Research Network Center");

  await visit(env, T0 + 2 * MIN, { cf: { latitude: "32.06167", longitude: "118.77778" } });
  [row] = visitors(DB);
  assert.equal(row.ip, "1.2.3.4");
  assert.equal(row.asn, 4538);
  assert.equal(row.org, "China Education and Research Network Center");
});

test("the visitor id is the same salted hash the KV version used", async () => {
  const { DB, env } = setup();
  await visit(env, T0, { ip: "1.2.3.4" });
  const expected = createHash("sha256").update("1.2.3.4|" + SALT).digest("hex").slice(0, 16);
  assert.equal(visitors(DB)[0].id, expected);
  assert.equal(await hash("1.2.3.4|" + SALT), expected);
});

test("CORS, methods and unknown paths", async () => {
  const { DB, env } = setup();
  let res = await handle(request({ origin: "https://www.zhiyuzhang.com" }), env, T0);
  assert.equal(res.headers.get("Access-Control-Allow-Origin"), "https://www.zhiyuzhang.com");
  res = await handle(request({ origin: "https://evil.example" }), env, T0);
  assert.equal(res.headers.get("Access-Control-Allow-Origin"), "https://zhiyuzhang.com");
  assert.equal(res.headers.get("Cache-Control"), "no-store");

  const before = DB.batches;
  res = await handle(request({ method: "OPTIONS", origin: "https://zhiyuzhang.com" }), env, T0);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("Access-Control-Allow-Methods"), "GET, OPTIONS");
  res = await handle(request({ path: "/" }), env, T0);
  assert.equal(res.status, 404);
  res = await handle(request({ method: "POST", ip: "7.7.7.7" }), env, T0);
  assert.equal(res.status, 405);
  assert.equal(DB.batches, before, "none of these touch the database");
  assert.equal(visitors(DB).length, 1);
});

test("the admin export is off without a key and refuses wrong ones", async () => {
  let { env } = setup();
  let res = await handle(request({ path: "/admin/export", auth: "Bearer anything" }), env, T0);
  assert.equal(res.status, 404, "no ADMIN_KEY configured means no endpoint");

  ({ env } = setup({ ADMIN_KEY: "correct horse battery staple" }));
  for (const auth of [undefined, "Bearer wrong", "correct horse battery staple", "Basic Zm9vOmJhcg=="]) {
    res = await handle(request({ path: "/admin/export", auth }), env, T0);
    assert.equal(res.status, 401, `auth=${auth}`);
    assert.equal(await res.text(), "Unauthorized");
  }
  res = await handle(request({ path: "/admin/export", method: "POST", auth: "Bearer correct horse battery staple" }), env, T0);
  assert.equal(res.status, 405);
});

test("the admin export returns everything and records nothing", async () => {
  const { DB, env } = setup({ ADMIN_KEY: "k3y" });
  await visit(env, T0, { ip: "1.2.3.4", cf: SHANGHAI });
  await visit(env, T0 + 10 * MIN, { ip: "1.2.3.4", cf: SHANGHAI });
  await visit(env, T0 + 11 * MIN, { ip: "5.6.7.8", cf: NANJING });

  const res = await handle(request({ path: "/admin/export", ip: "66.66.66.66", auth: "Bearer k3y" }), env, T0 + HOUR());
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("Access-Control-Allow-Origin"), null, "not readable from other websites");
  const out = await res.json();

  assert.equal(out.visitGapMs, VISIT_GAP_MS);
  assert.deepEqual(out.visitors.map((v) => [v.ip, v.org, v.city, v.first_ts, v.last_ts, v.visits, v.legacy]), [
    ["5.6.7.8", "China Education and Research Network Center", "Nanjing", T0 + 11 * MIN, T0 + 11 * MIN, 1, 0],
    ["1.2.3.4", "CHINANET SHANGHAI PROVINCE NETWORK", "Shanghai", T0, T0 + 10 * MIN, 2, 0],
  ]);
  assert.deepEqual(out.visits.map((v) => v.ts), [T0 + 11 * MIN, T0 + 10 * MIN, T0]);
  const ids = new Set(out.visitors.map((v) => v.id));
  assert.ok(out.visits.every((v) => ids.has(v.visitor_id)), "every visit points at a visitor");

  assert.equal(visitors(DB).length, 2, "the caller of the export was not recorded");
  assert.equal(DB.rows("SELECT COUNT(*) AS c FROM visits")[0].c, 3);
});
function HOUR() { return 60 * MIN; }

test("the KV log imports cleanly and old visitors keep matching", async () => {
  const { DB, env } = setup();
  const idA = await hash("10.0.0.1|" + SALT), idB = await hash("10.0.0.2|" + SALT), idC = await hash("10.0.0.3|" + SALT);
  const log = { total: 3, visitors: [
    { id: idA, city: "Nanjing", region: "Jiangsu", country: "CN", flag: "🇨🇳", lat: 32.06, lng: 118.78, ts: T0 - DAY },
    { id: idB, city: "Xi’an", region: "Shaanxi", country: "CN", flag: "🇨🇳", lat: 34.26, lng: 108.93, ts: T0 - 2 * DAY },
    { id: idC, city: "O'Fallon", region: "Missouri", country: "US", flag: "🇺🇸", lat: 38.81, lng: -90.7, ts: T0 - 3 * DAY },
  ] };
  const sql = toSql(log);
  DB.exec(sql);
  DB.exec(sql);                                   // running the import twice changes nothing

  let rows = visitors(DB);
  assert.deepEqual(rows.map((r) => [r.city, r.ip, r.first_ts, r.last_ts, r.visits, r.legacy]), [
    ["Nanjing", null, T0 - DAY, T0 - DAY, 1, 1],
    ["Xi’an", null, T0 - 2 * DAY, T0 - 2 * DAY, 1, 1],
    ["O'Fallon", null, T0 - 3 * DAY, T0 - 3 * DAY, 1, 1],
  ]);
  assert.equal(DB.rows("SELECT COUNT(*) AS c FROM visits")[0].c, 3);

  // an imported visitor comes back: same row, IP filled in, a second visit recorded
  const body = await visit(env, T0, { ip: "10.0.0.1", cf: NANJING });
  assert.equal(body.total, 3, "no new visitor");
  const a = DB.rows("SELECT * FROM visitors WHERE id = ?", idA)[0];
  assert.deepEqual([a.ip, a.first_ts, a.last_ts, a.visits, a.legacy], ["10.0.0.1", T0 - DAY, T0, 2, 1]);
  assert.deepEqual(visitTimes(DB, idA), [T0 - DAY, T0]);

  // ...whereas one who returns within 5 minutes of the imported request is still on that visit
  await visit(env, T0 - 2 * DAY + 3 * MIN, { ip: "10.0.0.2", cf: NANJING });
  const b = DB.rows("SELECT * FROM visitors WHERE id = ?", idB)[0];
  assert.deepEqual([b.ip, b.visits], ["10.0.0.2", 1]);
  assert.deepEqual(visitTimes(DB, idB), [T0 - 2 * DAY]);
});

test("the import tool rejects data it does not understand", () => {
  const ok = { id: "0123456789abcdef", city: "A", region: "B", country: "CN", flag: "", lat: 1, lng: 2, ts: T0 };
  assert.throws(() => toSql({}), /no visitors array/);
  assert.throws(() => toSql({ visitors: [{ ...ok, id: "not-a-hash" }] }), /unexpected visitor id/);
  assert.throws(() => toSql({ visitors: [ok, ok] }), /duplicate visitor id/);
  assert.throws(() => toSql({ visitors: [{ ...ok, ts: "yesterday" }] }), /bad ts/);
  assert.throws(() => toSql({ visitors: [{ ...ok, lat: NaN }] }), /bad lat/);
  assert.match(toSql({ visitors: [{ ...ok, city: "x'); DROP TABLE visitors;--" }] }), /'x''\); DROP TABLE visitors;--'/);
});
