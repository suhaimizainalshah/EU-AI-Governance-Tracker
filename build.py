#!/usr/bin/env python3
"""EU AI Governance Tracker — validator + generator.

Reads data/*.csv, validates every row (bad row = build stops), and writes
index.html by replacing the placeholder /*__DATA__*/null in template.html
with the full dataset as a JSON blob. Also writes tracker-data.json
(the same payload, for reuse), data.json (the canonical full export),
one JSON file per row type under data/, a static rows.html page (every row
as plain HTML — the source Pagefind indexes for full-text search), and
feed.xml / feed.json (RSS 2.0 and JSON Feed 1.1) from data/changelog.csv.
Modelled on the ASEAN AI Governance Tracker's build.py.
Run: python3 build.py
Then, to regenerate the search index: npx -y pagefind@1.3.0 --site .
"""
import csv, json, os, re, sys
from collections import Counter, defaultdict
from datetime import date, datetime, time
from email.utils import format_datetime
from html import escape as hesc
from xml.sax.saxutils import escape as xesc

SITE_URL = "https://aibenar.dev/EU-AI-Governance-Tracker"
# Each feed update's ID keeps the tracker's first address. An ID is a fixed label, not a link: changing it would make feed readers show
# every past update again as new. Links, the canonical address and sharing tags use SITE_URL.
FEED_ID_BASE = "https://suhaimizainalshah.github.io/EU-AI-Governance-Tracker"

ROOT = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(ROOT, "data")
VERSION = "0.2"
VERIFIED = "2026-11-23"
# How often the tracker is checked, and when it last was. After EVERY check, set LAST_CHECKED to that day, even if nothing new was found:
# the page says "Updated every two weeks. Last checked …" and shows an overdue notice by itself if a check is late.
UPDATE_EVERY_DAYS = 14
LAST_CHECKED = "2026-11-27"
LAST_CHECKED = max(LAST_CHECKED, VERIFIED)
CREDIT = "Prepared by Suhaimi Zainal Shah with assistance from Muse and Claude AI (Anthropic)."

PLACES = [
    ("EU", "European Union (EU-wide)"),
    ("AT", "Austria"), ("BE", "Belgium"), ("BG", "Bulgaria"),
    ("HR", "Croatia"), ("CY", "Cyprus"), ("CZ", "Czechia"),
    ("DK", "Denmark"), ("EE", "Estonia"), ("FI", "Finland"),
    ("FR", "France"), ("DE", "Germany"), ("GR", "Greece"),
    ("HU", "Hungary"), ("IE", "Ireland"), ("IT", "Italy"),
    ("LV", "Latvia"), ("LT", "Lithuania"), ("LU", "Luxembourg"),
    ("MT", "Malta"), ("NL", "Netherlands"), ("PL", "Poland"),
    ("PT", "Portugal"), ("RO", "Romania"), ("SK", "Slovakia"),
    ("SI", "Slovenia"), ("ES", "Spain"), ("SE", "Sweden"),
]
PLACE_CODES = {c for c, _ in PLACES}
THEMES = {"deepfake-fraud", "sexual-deepfakes", "political-deepfakes",
          "election-integrity", "online-safety", "general-ai", "data-protection"}
RESPONSE_TYPES = {"statement", "advisory", "engagement", "block_takedown",
                  "restriction_lifted", "enforcement", "legislation"}
INSTRUMENT_TYPES = {"guideline", "institution", "declaration", "framework",
                    "strategy", "law", "circular", "regulation", "bill",
                    "agreement", "partnership", "policy", "advisory"}
LAYERS = {"Voluntary AI guidance", "Institution", "Strategy or declaration",
          "Deepfake-specific rules", "Online safety and platform rules",
          "Data protection", "Binding AI law", "law"}
STATUSES = {"in_force", "adopted", "draft", "proposed", "superseded"}
DATE_RE = re.compile(r"^\d{4}-\d{2}(-\d{2})?$")

errors = []

def read(name):
    p = os.path.join(DATA, name)
    with open(p, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))

def check(cond, msg):
    if not cond:
        errors.append(msg)

def valid_date(s, precision):
    if not s:
        return False
    if not DATE_RE.match(s):
        return False
    if precision == "day":
        return bool(re.match(r"^\d{4}-\d{2}-\d{2}$", s))
    if precision == "month":
        return bool(re.match(r"^\d{4}-\d{2}$", s))
    if precision == "year":
        return bool(re.match(r"^\d{4}$", s))
    return False

incidents = read("incidents.csv")
responses = read("responses.csv")
instruments = read("instruments.csv")
backlog = read("backlog.csv")
changelog = read("changelog.csv")
events = read("events.csv")

# --- incidents ---
seen = set()
for r in incidents:
    check(r["id"] and r["id"] not in seen, f"incident duplicate/empty id: {r['id']}")
    seen.add(r["id"])
    check(r["country"] in PLACE_CODES, f"{r['id']}: unknown country {r['country']}")
    check(valid_date(r["date"], r["date_precision"]), f"{r['id']}: bad date {r['date']} ({r['date_precision']})")
    check(r["date_precision"] in ("day", "month", "year"), f"{r['id']}: bad date_precision")
    check(r["onset_certainty"] in ("documented", "approximate", "unknown"), f"{r['id']}: bad onset_certainty")
    check(r["title"], f"{r['id']}: missing title")
    check(r["summary"], f"{r['id']}: missing summary")
    check(r["source_url"].startswith("http"), f"{r['id']}: missing source_url")
    check(r["confidence"] in ("high", "medium"), f"{r['id']}: bad confidence")
    for t in r["themes"].split(";"):
        if t:
            check(t in THEMES, f"{r['id']}: unknown theme {t}")
    if r["event_id"]:
        check(any(e["id"] == r["event_id"] for e in events), f"{r['id']}: unknown event {r['event_id']}")

# --- responses ---
inc_by_id = {r["id"]: r for r in incidents}
seen = set()
for r in responses:
    check(r["id"] and r["id"] not in seen, f"response duplicate/empty id: {r['id']}")
    seen.add(r["id"])
    check(valid_date(r["date"], r["date_precision"]), f"{r['id']}: bad date {r['date']} ({r['date_precision']})")
    check(r["actor"], f"{r['id']}: missing actor")
    check(r["type"] in RESPONSE_TYPES, f"{r['id']}: bad type {r['type']}")
    check(r["binding"] in ("yes", "no"), f"{r['id']}: bad binding")
    check(r["legal_basis"] in ("not_applicable", "none_stated", "new_law", "existing_law"),
          f"{r['id']}: bad legal_basis {r['legal_basis']}")
    check(r["source_url"].startswith("http"), f"{r['id']}: missing source_url")
    check(r["confidence"] in ("high", "medium"), f"{r['id']}: bad confidence")
    if r["incident_id"]:
        check(r["incident_id"] in inc_by_id, f"{r['id']}: unknown incident {r['incident_id']}")
        if r["incident_id"] in inc_by_id:
            check(r["date"] >= inc_by_id[r["incident_id"]]["date"],
                  f"{r['id']}: response before its incident {r['incident_id']}")
    if r["instrument_id"]:
        check(any(p["id"] == r["instrument_id"] for p in instruments),
              f"{r['id']}: unknown instrument {r['instrument_id']}")

# --- instruments ---
seen = set()
for r in instruments:
    check(r["id"] and r["id"] not in seen, f"instrument duplicate/empty id: {r['id']}")
    seen.add(r["id"])
    check(r["jurisdiction"] in PLACE_CODES, f"{r['id']}: unknown jurisdiction {r['jurisdiction']}")
    check(valid_date(r["date"], r["date_precision"]), f"{r['id']}: bad date {r['date']} ({r['date_precision']})")
    if r["effective_date"]:
        check(valid_date(r["effective_date"], "day"), f"{r['id']}: bad effective_date")
    check(r["instrument_type"] in INSTRUMENT_TYPES, f"{r['id']}: bad instrument_type {r['instrument_type']}")
    check(r["layer"] in LAYERS, f"{r['id']}: bad layer {r['layer']}")
    check(r["binding"] in ("yes", "no"), f"{r['id']}: bad binding")
    check(r["status"] in STATUSES, f"{r['id']}: bad status {r['status']}")
    check(r["names_risk"] in ("yes", "no"), f"{r['id']}: bad names_risk")
    check(r["source_url"].startswith("http"), f"{r['id']}: missing source_url")
    check(r["confidence"] in ("high", "medium"), f"{r['id']}: bad confidence")
    for t in r["themes"].split(";"):
        if t:
            check(t in THEMES, f"{r['id']}: unknown theme {t}")

# --- backlog / changelog / events ---
for r in backlog:
    check(r["item"], "backlog: empty item")
    check(r["country"] in PLACE_CODES or r["country"] == "all", f"backlog: unknown country {r['country']}")
    check(r["priority"] in ("high", "medium", "low"), f"backlog: bad priority {r['priority']}")
for r in events:
    check(r["id"], "event: empty id")
    check(valid_date(r["onset"], r["onset_precision"]), f"event {r['id']}: bad onset")

if errors:
    print(f"BUILD FAILED — {len(errors)} error(s):")
    for e in errors:
        print(" -", e)
    sys.exit(1)

# --- coverage per place ---
resp_by_incident = defaultdict(list)
for r in responses:
    if r["incident_id"]:
        resp_by_incident[r["incident_id"]].append(r)
coverage = {}
for code, name in PLACES:
    incs = [i for i in incidents if i["country"] == code]
    resps = [r for r in responses
             if (r["incident_id"] and inc_by_id[r["incident_id"]]["country"] == code)]
    # responses without an incident are counted under their own id prefix
    resps += [r for r in responses
              if not r["incident_id"] and r["id"].split("-")[0] == code]
    insts = [p for p in instruments if p["jurisdiction"] == code]
    binding = sum(1 for r in resps if r["binding"] == "yes")
    coverage[code] = {
        "name": name,
        "incidents": len(incs),
        "incidents_with_response": sum(1 for i in incs if resp_by_incident.get(i["id"])),
        "responses": len(resps),
        "binding": binding,
        "instruments": len(insts),
        "total": len(incs) + len(resps) + len(insts),
    }

# ---------- Compute: chips, data centres and verification (0.2). Optional files: the tracker builds without them.
C_PLACES = {"EU", "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE"}
C_KIND = {"ai_rule", "guidance", "data_centre_rule", "public_investment", "publication"}
C_SITE_STATUS = {"selected", "operational", "under_construction", "announced", "cancelled"}
C_PQ = {"public_list", "energy_reporting", "official_figures"}
C_PS = {"yes", "partly", "checked_not_found"}          # a cell that was not checked has no row: the page shows "not checked yet"
C_CONF = {"high", "medium", "low"}
def real_date(v):                                  # the pattern check accepts 2026-13-40; this checks the calendar too
    import datetime
    try:
        if len(v) == 10: datetime.date.fromisoformat(v)
        elif len(v) == 7: datetime.date.fromisoformat(v + "-01")
        return True
    except ValueError:
        return False
def read_optional(name):
    return read(name) if os.path.exists(os.path.join(DATA, name)) else []
def https(t, i, v, required=True):
    check(bool(v) or not required, f"compute {t} {i}: a source link is required")
    check(not v or v.startswith("https://"), f"compute {t} {i}: source links must start with https://")
compute_measures, compute_sites, compute_profile = read_optional("compute_measures.csv"), read_optional("compute_sites.csv"), read_optional("compute_profile.csv")
for r in compute_measures:
    i = r.get("id", "?")
    check(r.get("jurisdiction") in C_PLACES, f"compute measure {i}: jurisdiction must be EU or a member-state code such as DE")
    check(r.get("date_precision") in ("day", "month", "year") and valid_date(r.get("date", ""), r.get("date_precision", "")) and real_date(r.get("date", "")), f"compute measure {i}: date must be a real date matching its date_precision")
    check(r.get("kind") in C_KIND, f"compute measure {i}: kind must be one of {sorted(C_KIND)}")
    check(r.get("binding") in ("yes", "no"), f"compute measure {i}: binding must be yes or no")
    check(r.get("confidence") in C_CONF, f"compute measure {i}: confidence must be high, medium or low")
    check(bool(r.get("title")) and bool(r.get("summary")), f"compute measure {i}: title and summary are required")
    check(valid_date(r.get("verified_on", ""), "day"), f"compute measure {i}: verified_on must be YYYY-MM-DD")
    https("measure", i, r.get("source_url", "")); https("measure", i, r.get("more_sources", ""), False)
for r in compute_sites:
    i = r.get("id", "?")
    check(r.get("country") in C_PLACES - {"EU"}, f"compute site {i}: country must be a member-state code such as DE")
    check(r.get("status") in C_SITE_STATUS, f"compute site {i}: status must be one of {sorted(C_SITE_STATUS)}")
    check(not r.get("announced") or (valid_date(r["announced"], "month") and real_date(r["announced"])), f"compute site {i}: announced must be a real YYYY-MM or empty")
    check(not r.get("capacity_mw") or re.match(r"^\d+(\.\d+)?$", r["capacity_mw"]), f"compute site {i}: capacity_mw must be a number or empty")
    check(r.get("confidence") in C_CONF, f"compute site {i}: confidence must be high, medium or low")
    https("site", i, r.get("source_url", ""))
_seen = set()
for r in compute_profile:
    i = r.get("id", "?")
    check(r.get("country") in C_PLACES, f"compute profile {i}: country must be EU or a member-state code")
    check(r.get("question") in C_PQ, f"compute profile {i}: question must be one of {sorted(C_PQ)}")
    check(r.get("status") in C_PS, f"compute profile {i}: status must be one of {sorted(C_PS)} (leave a cell out if it was not checked)")
    check((r.get("country"), r.get("question")) not in _seen, f"compute profile {i}: this place and question already have a row")
    _seen.add((r.get("country"), r.get("question")))
    check(bool(r.get("detail")), f"compute profile {i}: detail is required: say what was found, or where you looked")
    check(valid_date(r.get("checked_on", ""), "day"), f"compute profile {i}: checked_on must be YYYY-MM-DD")
    check(r.get("confidence") in C_CONF, f"compute profile {i}: confidence must be high, medium or low")
    https("profile", i, r.get("source_url", ""), r.get("status") != "checked_not_found")
for t, rows in (("measure", compute_measures), ("site", compute_sites), ("profile", compute_profile)):
    ids = [r.get("id") for r in rows]; check(len(ids) == len(set(ids)), f"compute {t}: every id must be unique")
compute_measures.sort(key=lambda m: m["date"], reverse=True)
if errors:                                         # the compute checks run after the main ones, so report their errors here too
    print(f"{len(errors)} problem(s) in the compute data; nothing was written:", file=sys.stderr)
    for e in errors:
        print("  - " + e, file=sys.stderr)
    sys.exit(1)

data = {
    "meta": {
        "version": VERSION,
        "verified": VERIFIED,
        "checked": LAST_CHECKED,
        "update_every_days": UPDATE_EVERY_DAYS,
        "built": VERIFIED,
        "credit": CREDIT,
        "counts": {"incidents": len(incidents), "responses": len(responses),
                   "instruments": len(instruments), "backlog": len(backlog)},
    },
    "places": [{"code": c, "name": n} for c, n in PLACES],
    "coverage": coverage,
    "compute": {"measures": compute_measures, "sites": compute_sites, "profile": compute_profile},
    "incidents": incidents,
    "responses": responses,
    "instruments": instruments,
    "backlog": backlog,
    "changelog": changelog,
    "events": events,
}

with open(os.path.join(ROOT, "template.html"), encoding="utf-8") as f:
    tpl = f.read()
assert "/*__DATA__*/null" in tpl, "template placeholder missing"
PREVIEW = "--preview" in sys.argv or os.environ.get("PREVIEW") == "1"     # pull-request preview: shows the Review tab and a banner
# Visitor counting with GoatCounter (no cookies), on the same account as the ASEAN tracker. Set to "" to switch it off.
GOATCOUNTER_CODE = (os.environ.get("GOATCOUNTER_CODE") or "suhaimizs").strip().lower()
if GOATCOUNTER_CODE in {"off", "none"}: GOATCOUNTER_CODE = ""
meta = {**data["meta"], "analytics": {"goatcounter": GOATCOUNTER_CODE}}
page = {**data, "meta": {**meta, "preview": True} if PREVIEW else meta}
print("Visitor counting:", f"ON ({GOATCOUNTER_CODE}.goatcounter.com)" if GOATCOUNTER_CODE else "OFF")
out = tpl.replace("/*__DATA__*/null", json.dumps(page, ensure_ascii=False), 1)
if PREVIEW:
    print("PREVIEW build: the Review tab and a preview banner are shown. Do not commit this index.html.")
with open(os.path.join(ROOT, "index.html"), "w", encoding="utf-8") as f:
    f.write(out)
with open(os.path.join(ROOT, "tracker-data.json"), "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=1)
# data.json is the canonical full export (same payload as tracker-data.json,
# which is kept for compatibility with anything already linking to it).
with open(os.path.join(ROOT, "data.json"), "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=1)
# One JSON file per row type, next to the CSVs they mirror.
for name, rows in (("incidents", incidents), ("responses", responses),
                   ("instruments", instruments), ("backlog", backlog),
                   ("changelog", changelog), ("events", events)):
    with open(os.path.join(DATA, f"{name}.json"), "w", encoding="utf-8") as f:
        json.dump(rows, f, ensure_ascii=False, indent=1)

# --- rows.html: every row as plain static HTML ---------------------------
# The viewer renders rows with JavaScript, so a search indexer sees only
# the page shell. This static page exists so Pagefind (and any search
# engine) can index the actual row text. Each article carries the row id
# as its HTML id and links back to the row on the tracker.
def row_anchor(row_id, tab):
    return f"index.html#tab={tab}&row={row_id}"

place_name = dict(PLACES)
articles = []
for i in incidents:
    articles.append(f"""<article id="{hesc(i['id'])}">
<h2>{hesc(i['title'])}</h2>
<p><strong>Case · {hesc(i['country'])} — {hesc(place_name.get(i['country'], i['country']))} · {hesc(i['date'])}</strong></p>
<p>{hesc(i['summary'])}</p>
<p>Source: <a href="{hesc(i['source_url'])}">{hesc(i['source_title'] or i['source_url'])}</a></p>
<p><a href="{row_anchor(i['id'], 'cases')}">Open this case in the tracker</a></p>
</article>""")
resp_by_id = {r["id"]: r for r in responses}
for r in responses:
    if r["incident_id"]:
        target = row_anchor(r["incident_id"], "cases")
        target_text = f"Open the case it responds to ({hesc(r['incident_id'])}) in the tracker"
    else:
        target = "index.html#tab=compare"
        target_text = "See it in the Compare tab"
    articles.append(f"""<article id="{hesc(r['id'])}">
<h2>{hesc(r['actor'])} — {hesc(r['type'])}</h2>
<p><strong>Official response · {hesc(r['date'])} · binding: {hesc(r['binding'])}</strong></p>
<p>{hesc(r['summary'])}</p>
<p>Source: <a href="{hesc(r['source_url'])}">{hesc(r['source_title'] or r['source_url'])}</a></p>
<p><a href="{target}">{target_text}</a></p>
</article>""")
for p in instruments:
    articles.append(f"""<article id="{hesc(p['id'])}">
<h2>{hesc(p['title'])}</h2>
<p><strong>Policy · {hesc(p['jurisdiction'])} — {hesc(place_name.get(p['jurisdiction'], p['jurisdiction']))} · {hesc(p['date'])} · {hesc(p['status'].replace('_', ' '))}</strong></p>
<p>{hesc(p['summary'])}</p>
<p>Source: <a href="{hesc(p['source_url'])}">{hesc(p['source_title'] or p['source_url'])}</a></p>
<p><a href="{row_anchor(p['id'], 'policies')}">Open this policy in the tracker</a></p>
</article>""")
rows_html = f"""<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="canonical" href="{SITE_URL}/index.html">
<title>All entries — EU AI Governance Tracker</title>
<meta name="description" content="Every incident, official response and policy instrument in the EU AI Governance Tracker, as plain text.">
<style>body{{font:16px/1.55 system-ui,sans-serif;max-width:760px;margin:0 auto;padding:1rem;color:#1c2b26}}article{{border:1px solid #c9d4cf;border-radius:10px;padding:1rem;margin:0 0 1rem}}h2{{font-size:1.1rem;margin:.1rem 0 .4rem}}a{{color:#1b5e4f}}</style>
</head>
<body>
<h1>All entries — EU AI Governance Tracker</h1>
<p>A plain-text list of every entry in the tracker, for search engines and the
site's own full-text search. Use the <a href="index.html">tracker</a> to
filter, compare and review entries. Data: CC BY 4.0.</p>
{''.join(articles)}
</body>
</html>
"""
with open(os.path.join(ROOT, "rows.html"), "w", encoding="utf-8") as f:
    f.write(rows_html)

# --- feed.xml (RSS 2.0) and feed.json (JSON Feed 1.1) ----------------------
# Built from data/changelog.csv, so the feeds stay in step with the Updates
# tab without any hand-editing.
def changelog_date(s):
    y, m, d = (int(x) for x in s.split("-"))
    return date(y, m, d)

feed_items_rss = []
feed_items_json = []
for c in changelog:
    d = changelog_date(c["date"])
    pub = format_datetime(datetime.combine(d, time(12, 0)))
    guid = f"{FEED_ID_BASE}/index.html#tab=updates-{c['date']}-{c['rows']}"
    title = c["change"] if len(c["change"]) <= 140 else c["change"][:137] + "…"
    feed_items_rss.append(
        f"<item><title>{xesc(title)}</title><link>{SITE_URL}/index.html#tab=updates</link>"
        f"<guid isPermaLink=\"false\">{xesc(guid)}</guid><pubDate>{pub}</pubDate>"
        f"<description>{xesc(c['change'])}</description></item>")
    feed_items_json.append({
        "id": guid,
        "url": f"{SITE_URL}/index.html#tab=updates",
        "title": title,
        "content_text": c["change"],
        "date_published": f"{c['date']}T12:00:00+00:00",
    })
feed_xml = ("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n"
            "<rss version=\"2.0\"><channel>"
            "<title>EU AI Governance Tracker — updates</title>"
            f"<link>{SITE_URL}/</link>"
            "<description>Updates to the EU AI Governance Tracker: new verified rows, corrections and releases.</description>"
            "<language>en-GB</language>"
            + "".join(feed_items_rss) +
            "</channel></rss>\n")
with open(os.path.join(ROOT, "feed.xml"), "w", encoding="utf-8") as f:
    f.write(feed_xml)
feed_json = {
    "version": "https://jsonfeed.org/version/1.1",
    "title": "EU AI Governance Tracker — updates",
    "home_page_url": SITE_URL + "/",
    "feed_url": SITE_URL + "/feed.json",
    "description": "Updates to the EU AI Governance Tracker: new verified rows, corrections and releases.",
    "items": feed_items_json,
}
with open(os.path.join(ROOT, "feed.json"), "w", encoding="utf-8") as f:
    json.dump(feed_json, f, ensure_ascii=False, indent=1)

print(f"OK — {len(incidents)} incidents, {len(responses)} responses, "
      f"{len(instruments)} instruments, {len(backlog)} backlog; index.html + tracker-data.json written.")
print(f"Exports written: data.json, data/*.json (per row type), rows.html "
      f"({len(articles)} rows), feed.xml + feed.json ({len(feed_items_rss)} items).")
print("Search index: run 'npx -y pagefind@1.3.0 --site .' to regenerate pagefind/ after this build.")
