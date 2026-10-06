// One-off: turn a backup of the old KV log ({ visitors: [...], total }) into SQL for D1.
//   node tools/kv-to-d1.mjs backup.json > import.sql
// The statements are idempotent, so a half-finished import can simply be run again.
// Imported visitors are flagged legacy = 1: the old log kept only each visitor's last
// request, so that single request is all we know about them.
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const text = (s) => "'" + String(s ?? "").replace(/'/g, "''") + "'";
const number = (n, what) => {
  if (typeof n !== "number" || !Number.isFinite(n)) throw new Error(`bad ${what}: ${n}`);
  return String(n);
};

export function toSql(log) {
  if (!log || !Array.isArray(log.visitors)) throw new Error("not a KV log: no visitors array");
  const seen = new Set(), out = [];
  for (const v of log.visitors) {
    if (!/^[0-9a-f]{16}$/.test(v.id || "")) throw new Error(`unexpected visitor id: ${v.id}`);
    if (seen.has(v.id)) throw new Error(`duplicate visitor id: ${v.id}`);
    seen.add(v.id);
    const id = text(v.id), ts = number(v.ts, "ts");
    out.push(
      "INSERT OR IGNORE INTO visitors (id, city, region, country, flag, lat, lng, first_ts, last_ts, visits, legacy) " +
      `VALUES (${id}, ${text(v.city)}, ${text(v.region)}, ${text(v.country)}, ${text(v.flag)}, ` +
      `${number(v.lat, "lat")}, ${number(v.lng, "lng")}, ${ts}, ${ts}, 1, 1);`,
      `INSERT INTO visits (visitor_id, ts) SELECT ${id}, ${ts} ` +
      `WHERE NOT EXISTS (SELECT 1 FROM visits WHERE visitor_id = ${id} AND ts = ${ts});`,
    );
  }
  return out.join("\n") + "\n";
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  const file = process.argv[2];
  if (!file) { console.error("usage: node tools/kv-to-d1.mjs backup.json > import.sql"); process.exit(2); }
  const log = JSON.parse(readFileSync(file, "utf8"));
  process.stdout.write(toSql(log));
  console.error(`${log.visitors.length} visitors -> ${log.visitors.length * 2} statements`);
}
