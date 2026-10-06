-- Visitor log for zhiyuzhang.com (Cloudflare D1 / SQLite).
-- `visitors` holds one row per visitor, `visits` one row per visit.

CREATE TABLE visitors (
  id        TEXT PRIMARY KEY,            -- salted hash of the IP: what makes two requests "the same visitor"
  ip        TEXT,                        -- full IP address; NULL for visitors imported from the old KV log
  asn       INTEGER,                     -- network number the IP belongs to (from Cloudflare)
  org       TEXT,                        -- network operator / organisation (from Cloudflare)
  city      TEXT    NOT NULL DEFAULT '',
  region    TEXT    NOT NULL DEFAULT '',
  country   TEXT    NOT NULL DEFAULT '',
  flag      TEXT    NOT NULL DEFAULT '',
  lat       REAL    NOT NULL,
  lng       REAL    NOT NULL,
  first_ts  INTEGER NOT NULL,            -- first request ever seen (ms since epoch)
  last_ts   INTEGER NOT NULL,            -- most recent request
  prev_ts   INTEGER,                     -- the request before that; NULL until the visitor comes back
  visits    INTEGER NOT NULL DEFAULT 1,  -- number of visits (see VISIT_GAP_MS in worker.js)
  legacy    INTEGER NOT NULL DEFAULT 0   -- 1 = imported from KV: whatever happened before the import is unknown
);
CREATE INDEX visitors_by_last_ts ON visitors (last_ts DESC);

CREATE TABLE visits (
  n          INTEGER PRIMARY KEY AUTOINCREMENT,
  visitor_id TEXT    NOT NULL REFERENCES visitors (id),
  ts         INTEGER NOT NULL            -- when this visit started
);
CREATE INDEX visits_by_visitor ON visits (visitor_id, ts);
CREATE INDEX visits_by_ts ON visits (ts);
