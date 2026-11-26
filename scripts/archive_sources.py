#!/usr/bin/env python3
"""Save the tracker's sources to the Internet Archive (the Wayback Machine), and remember each archived copy.

For every source link in data/*.csv that has no archived copy yet:
  1. ask the Wayback Machine whether it already holds a copy (most well-known pages are already there);
  2. if not, ask Save Page Now to make one, and wait for it.
Each copy goes into data/archive.json, which the tracker page reads to show an "archived copy" link beside the source.

It goes gently: a limit on checks and saves per run, a pause between requests, and it stops for the run if the
archive says to slow down (HTTP 429). Links that fail are retried on later runs, up to three times, a week apart.

Save Page Now works without an account, but is much more limited. With a free archive.org account, put its keys
(https://archive.org/account/s3.php) in the repository's secrets as IA_ACCESS_KEY and IA_SECRET_KEY.
Standard library only. For tests, the archive's addresses can be replaced with IA_AVAILABLE_URL and IA_SAVE_URL.
"""
import csv, json, os, re, sys, time, datetime, pathlib, urllib.parse, urllib.request, urllib.error

ROOT = pathlib.Path(__file__).resolve().parent.parent if pathlib.Path(__file__).parent.name == "scripts" else pathlib.Path(__file__).resolve().parent
DATA = ROOT / "data"; OUT = DATA / "archive.json"
AVAILABLE = os.environ.get("IA_AVAILABLE_URL", "https://archive.org/wayback/available")
SAVE = os.environ.get("IA_SAVE_URL", "https://web.archive.org/save").rstrip("/")
KEYS = (os.environ.get("IA_ACCESS_KEY", ""), os.environ.get("IA_SECRET_KEY", ""))
MAX_CHECKS = int(os.environ.get("ARCHIVE_MAX_CHECKS", "150"))     # availability look-ups per run
MAX_SAVES = int(os.environ.get("ARCHIVE_MAX_SAVES", "25"))        # new copies per run
PAUSE = float(os.environ.get("ARCHIVE_PAUSE", "6"))               # seconds between requests to the archive
TODAY = datetime.date.today().isoformat()
UA = "AI-Benar-tracker-archiver/1.0 (+https://aibenar.dev/)"
SKIP_HOSTS = ("web.archive.org", "archive.org", "archive.ph", "archive.today")
URL_RX = re.compile(r"https?://[^\s;,|\"<>]+")

class SlowDown(Exception): pass

def collect():
    """Every distinct source link in the data, in a stable order."""
    seen, urls = set(), []
    for f in sorted(DATA.glob("*.csv")):
        for row in csv.DictReader(open(f, encoding="utf-8")):
            for k, v in row.items():
                if not v or not (k.endswith("url") or k.endswith("sources") or k == "aim_url"): continue
                for u in URL_RX.findall(v):
                    u = u.rstrip(").")
                    host = urllib.parse.urlsplit(u).hostname or ""
                    if any(host == h or host.endswith("." + h) for h in SKIP_HOSTS) or u in seen: continue
                    seen.add(u); urls.append(u)
    return urls

class KeepRedirect(urllib.request.HTTPRedirectHandler):
    """Save Page Now answers 'here is your copy' by redirecting to it: read that address instead of following it."""
    def redirect_request(self, *a, **k): return None
PLAIN, NO_FOLLOW = urllib.request.build_opener(), urllib.request.build_opener(KeepRedirect)

def http(url, data=None, headers=None, timeout=60, follow=True):
    h = {"User-Agent": UA, "Accept": "application/json"}; h.update(headers or {})
    req = urllib.request.Request(url, data=urllib.parse.urlencode(data).encode() if data else None, headers=h)
    try:
        with (PLAIN if follow else NO_FOLLOW).open(req, timeout=timeout) as r: return r.status, r.headers, r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        if e.code == 429: raise SlowDown("the archive asked us to slow down (HTTP 429)")
        if e.code in (301, 302, 303, 307, 308): return e.code, e.headers, ""        # a redirect we chose not to follow
        return e.code, e.headers, e.read().decode("utf-8", "replace")

def snapshot_url(ts, original): return f"https://web.archive.org/web/{ts}/{original}"

def already_archived(url):
    code, _, body = http(f"{AVAILABLE}?{urllib.parse.urlencode({'url': url})}")
    if code != 200: return None
    c = (json.loads(body or "{}").get("archived_snapshots") or {}).get("closest") or {}
    if c.get("available") and str(c.get("status", "200")).startswith("2") and c.get("timestamp"):
        return {"snapshot": snapshot_url(c["timestamp"], url), "timestamp": c["timestamp"]}
    return None

def save(url):
    """Ask Save Page Now for a copy. With keys: the official API, polled until done. Without: the simple form."""
    if all(KEYS):
        auth = {"Authorization": f"LOW {KEYS[0]}:{KEYS[1]}"}
        code, _, body = http(SAVE, data={"url": url, "skip_first_archive": "1", "if_not_archived_within": "30d"}, headers=auth)
        job = json.loads(body or "{}").get("job_id") if code == 200 else None
        if not job: raise RuntimeError(f"Save Page Now refused it (HTTP {code}): {body[:160]}")
        for _ in range(30):
            time.sleep(max(PAUSE, 2)); code, _, body = http(f"{SAVE}/status/{job}", headers=auth); st = json.loads(body or "{}")
            if st.get("status") == "success": return {"snapshot": snapshot_url(st["timestamp"], st.get("original_url", url)), "timestamp": st["timestamp"]}
            if st.get("status") == "error": raise RuntimeError(st.get("message") or st.get("status_ext") or "the archive could not save it")
        raise RuntimeError("the archive was still saving it after several minutes; it will be checked again next time")
    code, headers, _ = http(f"{SAVE}/{url}", timeout=120, follow=False)
    loc = headers.get("Content-Location") or headers.get("Location") or ""
    m = re.search(r"/web/(\d{14})/", loc)
    if code in (200, 302) and m: return {"snapshot": snapshot_url(m.group(1), url), "timestamp": m.group(1)}
    raise RuntimeError(f"Save Page Now did not confirm a copy (HTTP {code})")

def due(entry):
    """A link needs work if it has no copy yet, and any earlier failure was over a week ago (three tries at most)."""
    if not entry: return True
    if entry.get("snapshot"): return False
    if entry.get("attempts", 0) >= 3: return False
    last = entry.get("checked", "2000-01-01")
    return (datetime.date.fromisoformat(TODAY) - datetime.date.fromisoformat(last)).days >= 7

def main():
    store = json.loads(OUT.read_text(encoding="utf-8")) if OUT.exists() else {}
    links = store.get("links", {})
    urls = collect(); todo = [u for u in urls if due(links.get(u))]
    found = saved = failed = checks = 0; stopped = ""
    try:
        for u in todo:
            if checks >= MAX_CHECKS: stopped = f"the limit of {MAX_CHECKS} checks for one run"; break
            checks += 1; e = links.get(u, {})
            try:
                hit = already_archived(u)
                if hit: links[u] = {**hit, "checked": TODAY, "how": "already in the archive"}; found += 1
                elif saved < MAX_SAVES:
                    time.sleep(PAUSE); links[u] = {**save(u), "checked": TODAY, "how": "saved by this tracker"}; saved += 1
                else: continue
            except SlowDown: raise
            except Exception as ex:
                links[u] = {"checked": TODAY, "attempts": e.get("attempts", 0) + 1, "error": str(ex)[:200]}; failed += 1
            time.sleep(PAUSE)
    except SlowDown as ex: stopped = str(ex)
    # forget links no longer in the data, so the file mirrors the tracker
    links = {u: links[u] for u in urls if u in links}
    archived = sum(1 for v in links.values() if v.get("snapshot"))
    store = {"about": "Archived copies of this tracker's sources, in the Internet Archive's Wayback Machine. Updated by scripts/archive_sources.py.",
             "updated": TODAY, "sources": len(urls), "archived": archived, "links": dict(sorted(links.items()))}
    OUT.write_text(json.dumps(store, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    report = (f"Sources: {len(urls)}. Archived: {archived} ({round(100 * archived / max(1, len(urls)))}%).\n"
              f"This run: {found} found already in the archive, {saved} newly saved, {failed} failed (tried again next week)."
              + (f"\nStopped early: {stopped}." if stopped else "") + ("" if all(KEYS) else "\nNo archive.org keys were set, so saving used the slower public route."))
    print(report)
    if os.environ.get("GITHUB_STEP_SUMMARY"): open(os.environ["GITHUB_STEP_SUMMARY"], "a").write("## Internet Archive\n\n" + report.replace("\n", "\n\n") + "\n")

if __name__ == "__main__":
    main()
