// A minimal stand-in for the D1 binding, backed by Node's built-in SQLite, so the
// Worker's real SQL runs in tests. Only the calls visitor-log.js makes are covered.
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";

class Statement {
  constructor(db, sql, args = []) { this.db = db; this.sql = sql; this.args = args; }
  bind(...args) {
    for (const a of args) {
      if (a === undefined) throw new TypeError("D1_TYPE_ERROR: Type 'undefined' not supported");
    }
    return new Statement(this.db, this.sql, args);
  }
  exec() {
    const results = this.db.prepare(this.sql).all(...this.args).map((r) => ({ ...r }));
    return { success: true, results, meta: {} };
  }
  async all() { return this.exec(); }
  async run() { return this.exec(); }
}

export class FakeD1 {
  constructor(schemaPath) {
    this.db = new DatabaseSync(":memory:");
    this.db.exec("PRAGMA foreign_keys = ON");       // D1 enforces foreign keys
    if (schemaPath) this.db.exec(readFileSync(schemaPath, "utf8"));
    this.batches = 0;
  }
  prepare(sql) { return new Statement(this.db, sql); }
  async batch(statements) {                          // D1 runs a batch as one transaction
    this.batches++;
    this.db.exec("BEGIN");
    try {
      const out = statements.map((s) => s.exec());
      this.db.exec("COMMIT");
      return out;
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
  }
  // test helpers
  exec(sql) { this.db.exec(sql); }
  rows(sql, ...args) { return this.db.prepare(sql).all(...args).map((r) => ({ ...r })); }
}
