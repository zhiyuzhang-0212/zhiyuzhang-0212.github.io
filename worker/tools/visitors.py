#!/usr/bin/env python3
"""Read the visitor log of zhiyuzhang.com from the Worker's owner-only export.

    python3 tools/visitors.py pull            # download the full log into exports/
    python3 tools/visitors.py show            # recent visits, one line each (Beijing time)
    python3 tools/visitors.py visitors        # one line per visitor
    python3 tools/visitors.py show --csv visits.csv

`pull` needs the admin key: set VISITOR_LOG_ADMIN_KEY, or keep ADMIN_KEY in the
gitignored .dev.vars next to wrangler.toml. Reading through this export never
records a visit, unlike opening the public /visits endpoint.

Institutions come from the QQWry (纯真) IPv4 database, fetched on first use into
exports/qqwry.dat. Visitors imported from the old KV log have no IP stored, so
they can only be shown at city level.
"""
import argparse, csv, json, os, socket, struct, sys, time, urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EXPORTS = ROOT / "exports"
LATEST = EXPORTS / "latest.json"
QQWRY = EXPORTS / "qqwry.dat"
QQWRY_URL = "https://github.com/metowolf/qqwry.dat/releases/latest/download/qqwry.dat"
BEIJING = timezone(timedelta(hours=8))


def admin_key():
    key = os.environ.get("VISITOR_LOG_ADMIN_KEY")
    if key:
        return key.strip()
    dev_vars = ROOT / ".dev.vars"
    if dev_vars.exists():
        for line in dev_vars.read_text().splitlines():
            if line.startswith("ADMIN_KEY="):
                return line.split("=", 1)[1].strip()
    sys.exit("no admin key: set VISITOR_LOG_ADMIN_KEY or put ADMIN_KEY=... in .dev.vars")


def pull(base):
    req = urllib.request.Request(base.rstrip("/") + "/admin/export",
                                 headers={"Authorization": "Bearer " + admin_key(),
                                          "User-Agent": "visitor-log-tool"})
    try:
        with urllib.request.urlopen(req, timeout=30) as res:
            data = json.load(res)
    except urllib.error.HTTPError as e:
        sys.exit(f"export refused: HTTP {e.code} {e.reason}")
    EXPORTS.mkdir(exist_ok=True)
    stamp = datetime.fromtimestamp(data["generated"] / 1000, BEIJING).strftime("%Y%m%d-%H%M%S")
    for path in (EXPORTS / f"visitors-{stamp}.json", LATEST):
        path.write_text(json.dumps(data, ensure_ascii=False))
    print(f"{len(data['visitors'])} visitors, {len(data['visits'])} visits -> {LATEST.relative_to(ROOT)}")
    return data


def load():
    if not LATEST.exists():
        sys.exit("nothing pulled yet: run `python3 tools/visitors.py pull` first")
    return json.loads(LATEST.read_text())


class QQWry:
    """Reader for the QQWry IPv4 database (legacy .dat layout)."""

    def __init__(self, path):
        self.buf = Path(path).read_bytes()
        self.first, last = struct.unpack_from("<II", self.buf, 0)
        self.count = (last - self.first) // 7 + 1

    def _u3(self, off):
        return int.from_bytes(self.buf[off:off + 3], "little")

    def _str(self, off):
        end = self.buf.index(b"\0", off)
        raw = self.buf[off:end]
        for enc in ("gbk", "utf-8"):
            try:
                return raw.decode(enc), end + 1
            except UnicodeDecodeError:
                pass
        return raw.decode("gbk", "replace"), end + 1

    def _area(self, off):
        if self.buf[off] in (1, 2):
            target = self._u3(off + 1)
            return self._str(target)[0] if target else ""
        return self._str(off)[0]

    def _record(self, off):
        mode = self.buf[off]
        if mode == 1:
            return self._record(self._u3(off + 1))
        if mode == 2:
            return self._str(self._u3(off + 1))[0], self._area(off + 4)
        place, nxt = self._str(off)
        return place, self._area(nxt)

    def lookup(self, ip):
        """-> (place, owner), e.g. ('中国–江苏–南京', '教育网/东南大学'); ('', '') if unknown."""
        try:
            n = struct.unpack("!I", socket.inet_aton(ip))[0]
        except OSError:
            return "", ""                                   # IPv6 is not in this database
        lo, hi = 0, self.count - 1
        while lo < hi:                                      # last index entry starting at or before n
            mid = (lo + hi + 1) // 2
            if struct.unpack_from("<I", self.buf, self.first + mid * 7)[0] <= n:
                lo = mid
            else:
                hi = mid - 1
        rec = self._u3(self.first + lo * 7 + 4)
        if n > struct.unpack_from("<I", self.buf, rec)[0]:
            return "", ""
        clean = lambda s: "" if s.strip() in ("", "CZ88.NET") else s.strip()
        place, owner = self._record(rec + 4)
        return clean(place), clean(owner)


def qqwry(download=True):
    if not QQWRY.exists():
        if not download:
            return None
        print(f"fetching the QQWry database into {QQWRY.relative_to(ROOT)} ...", file=sys.stderr)
        EXPORTS.mkdir(exist_ok=True)
        tmp = QQWRY.with_suffix(".part")
        urllib.request.urlretrieve(QQWRY_URL, tmp)
        tmp.rename(QQWRY)
    return QQWry(QQWRY)


def when(ts):
    return datetime.fromtimestamp(ts / 1000, BEIJING).strftime("%Y-%m-%d %H:%M")


def describe(v, db):
    """City-level place plus, when the IP is known, what the IP database says about it."""
    place = " / ".join(x for x in (v["country"], v["region"], v["city"]) if x)
    owner = ""
    if v.get("ip") and db:
        qq_place, owner = db.lookup(v["ip"])
        if qq_place:
            place = qq_place
    return place, owner


def table(rows, header):
    widths = [max(display_width(str(r[i])) for r in [header] + rows) for i in range(len(header))]
    for r in [header] + rows:
        print("  ".join(str(c) + " " * (w - display_width(str(c))) for c, w in zip(r, widths)).rstrip())


def display_width(s):
    return sum(2 if "ᄀ" <= ch <= "ￜ" or "\U0001f000" <= ch <= "\U0001faff" else 1 for ch in s)


def cmd_show(args):
    data, db = load(), qqwry(not args.no_download)
    by_id = {v["id"]: v for v in data["visitors"]}
    seen = {}
    rows = []
    for visit in sorted(data["visits"], key=lambda x: (x["ts"], x["n"])):       # oldest first, to number them
        seen[visit["visitor_id"]] = seen.get(visit["visitor_id"], 0) + 1
        v = by_id[visit["visitor_id"]]
        place, owner = describe(v, db)
        nth = f"{seen[visit['visitor_id']]}/{v['visits']}" + ("*" if v["legacy"] else "")
        rows.append([when(visit["ts"]), place, owner or v.get("org") or "-", v.get("ip") or "-", nth])
    rows.reverse()
    header = ["time (Beijing)", "place", "network / institution", "ip", "visit"]
    if args.csv:
        with open(args.csv, "w", newline="", encoding="utf-8-sig") as f:
            csv.writer(f).writerows([header] + rows)
        print(f"{len(rows)} visits -> {args.csv}")
        return
    print(f"{len(data['visitors'])} visitors, {len(data['visits'])} visits, as of {when(data['generated'])} Beijing time")
    print(f"a new visit starts after {data['visitGapMs'] // 60000} minutes without a request; "
          "* = imported from the old log, earlier visits unknown\n")
    table(rows[: args.limit], header)


def cmd_visitors(args):
    data, db = load(), qqwry(not args.no_download)
    rows = []
    for v in data["visitors"]:
        place, owner = describe(v, db)
        rows.append([when(v["last_ts"]), when(v["first_ts"]) + ("*" if v["legacy"] else ""), v["visits"],
                     place, owner or v.get("org") or "-", v.get("ip") or "-"])
    header = ["last seen", "first seen", "visits", "place", "network / institution", "ip"]
    if args.csv:
        with open(args.csv, "w", newline="", encoding="utf-8-sig") as f:
            csv.writer(f).writerows([header] + rows)
        print(f"{len(rows)} visitors -> {args.csv}")
        return
    print(f"{len(rows)} visitors, as of {when(data['generated'])} Beijing time; "
          "* = imported from the old log, first seen is the last request it recorded\n")
    table(rows[: args.limit], header)


def main():
    p = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    sub = p.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("pull", help="download the full log")
    s.add_argument("--base", default="https://api.zhiyuzhang.com", help="Worker base URL")
    for name, fn, text in (("show", cmd_show, "list visits, newest first"),
                           ("visitors", cmd_visitors, "list visitors, most recent first")):
        s = sub.add_parser(name, help=text)
        s.add_argument("-n", "--limit", type=int, default=50, help="rows to print (default 50)")
        s.add_argument("--csv", metavar="FILE", help="write every row to a CSV file instead")
        s.add_argument("--no-download", action="store_true", help="skip the IP database if it is not there yet")
        s.set_defaults(fn=fn)
    args = p.parse_args()
    if args.cmd == "pull":
        pull(args.base)
    else:
        args.fn(args)


if __name__ == "__main__":
    main()
