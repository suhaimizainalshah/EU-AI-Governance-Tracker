#!/usr/bin/env python3
"""The review checklist for a pull request: every case, official response and policy it adds or changes.

    python3 scripts/review_checklist.py BASE_DATA.json HEAD_DATA.json            # print the checklist
    python3 scripts/review_checklist.py BASE_DATA.json HEAD_DATA.json --post     # post it on the pull request (in GitHub Actions)

The GitHub Action (.github/workflows/review-checklist.yml) builds data.json for the main branch and for the pull
request, then posts this checklist as one comment. On later commits the same comment is updated: a tick is kept
for a row that has not changed since, and cleared for a row that was edited, so it is checked again.
The ticked comment is the official record of the review. Uses only the Python standard library.
"""
import hashlib
import json
import os
import re
import sys
import urllib.request

MARK = "<!-- review-checklist -->"
KINDS = [("incidents", "cases"), ("responses", "official responses"), ("instruments", "policies")]
ROW = re.compile(r"- \[[xX]\] .*?<!-- row:([A-Za-z0-9_.:-]+?):([0-9a-f]{10}) -->")


def fingerprint(row):
    return hashlib.sha1(json.dumps(row, sort_keys=True, ensure_ascii=False).encode("utf-8")).hexdigest()[:10]


def clean(text, n=140):
    t = re.sub(r"\s+", " ", str(text or "")).strip().replace("|", "/")
    return t if len(t) <= n else t[: n - 1].rstrip() + "…"


def describe(kind, r):
    if kind == "incidents":
        what, where = r.get("title"), r.get("country")
    elif kind == "responses":
        what, where = f"{r.get('actor', '')}: {r.get('summary', '')}", f"on case {r.get('incident_id', '')}"
    else:
        what, where = r.get("short_title") or r.get("title"), r.get("jurisdiction")
    src = r.get("source_url")
    link = f" [{clean(r.get('source_title') or 'Source', 70)}]({src})" if src else " (no source link)"
    return f"**{r.get('id')}** {clean(what)} ({clean(where, 40)}, {r.get('date', 'no date')}).{link}"


def build(base, head, previous="", run_url=""):
    ticked = set(ROW.findall(previous or ""))
    out = [MARK, "## Review checklist", "",
           "Each row below is new or changed in this pull request. For each one, open the source and check that:",
           "1. the **date** is the earliest public record you can find;",
           "2. the **actor** is a government body or official (for responses);",
           "3. the **summary** says only what the source says.", "",
           "Tick the box when the row checks out. If a row cannot be confirmed, move it to the backlog instead of merging it. "
           "**Merge only when every box is ticked and the checks below have passed.**", ""]
    total = 0
    for kind, name in KINDS:
        b = {r["id"]: r for r in base.get(kind, []) if "id" in r}
        h = {r["id"]: r for r in head.get(kind, []) if "id" in r}
        added = [h[i] for i in sorted(h) if i not in b]
        changed = [h[i] for i in sorted(h) if i in b and fingerprint(h[i]) != fingerprint(b[i])]
        removed = [b[i] for i in sorted(b) if i not in h]
        for title, rows in ((f"New {name}", added), (f"Changed {name}", changed)):
            if rows:
                out.append(f"### {title} ({len(rows)})")
                for r in rows:
                    fp = fingerprint(r)
                    box = "x" if (r["id"], fp) in ticked else " "
                    out.append(f"- [{box}] {describe(kind, r)} <!-- row:{r['id']}:{fp} -->")
                    total += 1
                out.append("")
        if removed:
            out.append(f"### Removed {name} ({len(removed)}), listed for information")
            out += [f"- **{r.get('id')}** {clean(r.get('title') or r.get('summary'))}" for r in removed]
            out.append("")
    if not total:
        out.append("_No case, response or policy rows were added or changed, so there is nothing to tick._")
        out.append("")
    if run_url:
        out.append(f"**Preview of the site with these changes:** open [this run]({run_url}), download **preview-site** under Artifacts, "
                   "unzip it, run `python3 -m http.server` in the folder and open http://localhost:8000. The preview has a Review tab and a banner.")
    out.append("")
    out.append("_This comment is updated on each new commit. Ticks are kept for rows that have not changed since; a row that was edited is un-ticked to be checked again._")
    return "\n".join(out).rstrip() + "\n", total


def api(method, url, token, body=None):
    req = urllib.request.Request(url, method=method, data=json.dumps(body).encode("utf-8") if body is not None else None,
                                 headers={"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json",
                                          "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "review-checklist"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode("utf-8") or "null")


def post(base, head):
    token, repo, pr = os.environ["GITHUB_TOKEN"], os.environ["GITHUB_REPOSITORY"], os.environ["PR_NUMBER"]
    root = os.environ.get("GITHUB_API_URL", "https://api.github.com").rstrip("/")
    mine, page = None, 1
    while True:
        batch = api("GET", f"{root}/repos/{repo}/issues/{pr}/comments?per_page=100&page={page}", token) or []
        for c in batch:
            if (c.get("body") or "").startswith(MARK):
                mine = c
        if len(batch) < 100:
            break
        page += 1
    body, total = build(base, head, mine.get("body", "") if mine else "", os.environ.get("RUN_URL", ""))
    if mine and mine.get("body") == body:
        print(f"Checklist unchanged ({total} rows to check).")
    elif mine:
        api("PATCH", f"{root}/repos/{repo}/issues/comments/{mine['id']}", token, {"body": body})
        print(f"Checklist updated ({total} rows to check).")
    else:
        api("POST", f"{root}/repos/{repo}/issues/{pr}/comments", token, {"body": body})
        print(f"Checklist posted ({total} rows to check).")


def main(argv):
    args = [a for a in argv if not a.startswith("--")]
    if len(args) != 2:
        sys.exit(__doc__)
    base, head = (json.load(open(p, encoding="utf-8")) for p in args)
    if "--post" in argv:
        post(base, head)
    else:
        print(build(base, head)[0])


if __name__ == "__main__":
    main(sys.argv[1:])
