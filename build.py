#!/usr/bin/env python3
"""EU AI Governance Tracker — validator + generator.

Reads data/*.csv, validates every row (bad row = build stops), and writes
index.html by replacing the placeholder /*__DATA__*/null in template.html
with the full dataset as a JSON blob. Also writes tracker-data.json
(the same payload, for reuse). Modelled on the ASEAN AI Governance
Tracker's build.py. Run: python3 build.py
"""
import csv, json, os, re, sys
from collections import Counter, defaultdict

ROOT = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(ROOT, "data")
VERSION = "0.1"
VERIFIED = "2026-11-22"
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

data = {
    "meta": {
        "version": VERSION,
        "verified": VERIFIED,
        "built": VERIFIED,
        "credit": CREDIT,
        "counts": {"incidents": len(incidents), "responses": len(responses),
                   "instruments": len(instruments), "backlog": len(backlog)},
    },
    "places": [{"code": c, "name": n} for c, n in PLACES],
    "coverage": coverage,
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
out = tpl.replace("/*__DATA__*/null", json.dumps(data, ensure_ascii=False), 1)
with open(os.path.join(ROOT, "index.html"), "w", encoding="utf-8") as f:
    f.write(out)
with open(os.path.join(ROOT, "tracker-data.json"), "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=1)
print(f"OK — {len(incidents)} incidents, {len(responses)} responses, "
      f"{len(instruments)} instruments, {len(backlog)} backlog; index.html + tracker-data.json written.")
