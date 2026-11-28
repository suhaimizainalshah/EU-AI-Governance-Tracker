# EU AI Governance and Safety Tracker

A public, verifiable record of **AI governance and AI safety** across the European Union and its 27 member states: AI incidents, official responses, policy instruments and compute. Modelled on the [ASEAN AI Governance Tracker](https://aibenar.dev/ASEAN-AI-Governance-Tracker/) by the same author.

**Status: Version 0.2 · 7 incidents · 16 responses · 29 instruments · 6 backlog items · data verified 23 November 2026 · Compute tab added 26 November 2026.** Every row has a source link to a primary or official source.

## What it covers

- **Incidents** — documented AI incidents in the EU (a harmful deployment, a breach, a misuse), dated to the earliest public record.
- **Responses** — any action by a government body or a person with official authority: statements, advisories, investigations, orders, fines, laws. Company, party, researcher and news statements do not count.
- **Instruments** — laws, regulations, strategies, guidance and institutions, from the EU AI Act and GDPR down to national AI laws and strategies. EU-wide instruments (the AI Act, the Digital Services Act, the Digital Omnibus) sit under "EU", not under one member state.
- **Map** — a tile-grid cartogram on the Cases tab only: every place is one clearly labelled tile, coloured by how many rows it has, with a metric toggle (total / incidents / responses / instruments). Hover or tap a tile to see its numbers; click it to filter the Cases list below. The map reads its numbers from the data, never from hard-coded figures. Tiles are not geographic borders.

## Coverage in this release

Sixteen member states have a verified row (Austria, Czechia, Denmark, Estonia, Finland, France, Germany, Greece, Ireland, Italy, Luxembourg, Netherlands, Poland, Portugal, Spain, Sweden) plus the EU-wide entry. Eleven member states have no verified row yet — Belgium, Bulgaria, Croatia, Cyprus, Hungary, Latvia, Lithuania, Malta, Romania, Slovakia and Slovenia — that is a finding about this release, not about those states. A follow-up pass will target their national AI strategies and data-protection actions. Unsure items are in `data/backlog.csv`, never in the data.

## Compute tab (new in 0.2)

AI governance and safety depend on compute: the chips and data centres that train and run AI. The Compute tab keeps to three parts, each row with an official source and the date it was checked:

- **The rules** (`data/compute_measures.csv`): the AI Act's compute threshold (general-purpose AI models trained with more than 10^25 floating-point operations are presumed to carry systemic risk; the Commission says the threshold is under review), its application and enforcement dates, data-centre reporting under the Energy Efficiency Directive, and the AI Factories and AI Gigafactories milestones.
- **Public compute projects** (`data/compute_sites.csv`): the AI Factories whose names are confirmed on official pages (13 of the 19 so far). AI Gigafactory sites are added once selected (expected early 2027).
- **Can it be checked?** (`data/compute_profile.csv`): three questions for the EU and four large markets (Germany, France, Ireland, the Netherlands): a public list of data centres, energy reporting, and official figures. A cell that was not checked has no row and shows as "not checked yet".

`build.py` checks every compute row (places, kinds, statuses, dates, https sources, unique ids, one profile row per place and question). Megawatt capacity figures are left out until they can be sourced to something a reader can open and check. The ASEAN tracker has a matching Compute tab, so the two can be compared.

## How to use it

Open `index.html` (or the GitHub Pages site). Use the tabs: Cases, Policies, Compare, Updates, Review, Method. Filter by place, theme or search; download the filtered rows as CSV; copy a link to any filtered view. Every row has a stable link — use the "Copy link to this row" button on any card. Full-text search (top of the filter rail) covers every case, response and policy. The Review tab lists every row verified on the latest date with tick boxes, for checking an update before it is merged.

The data is reusable: the full dataset is `data.json`, with one JSON file per row type under `data/` (e.g. `data/incidents.json`), and `rows.html` lists every row as plain text. Updates are available as [RSS](feed.xml) and [JSON Feed](feed.json), generated from the changelog at every build.

## Workflow

- Edit only `data/*.csv`. Every row needs a source URL.
- Run `python3 build.py`. The build refuses bad data: impossible dates, missing sources, unknown links, a response dated before its incident, duplicate IDs. It also regenerates `index.html`, the JSON exports, `rows.html` and the feeds.
- Regenerate the search index: `npx -y pagefind@1.3.0 --site .` (committed under `pagefind/`; the index is static files, so search works with no server).
- Log changes in `data/changelog.csv`.
- Updates are proposed as a pull request and reviewed on the Review tab. Nothing is pushed straight to `main`.
- Pull requests are checked automatically: `datapackage.json` validates the CSVs (required fields, date formats, unique IDs, valid country codes, well-formed source URLs, foreign keys) and a link checker verifies every link in the built site and the CSVs. Bot-protected domains are excluded in `.lycheeignore`; a weekly run also catches link rot in already-merged rows.

## Schema notes

- Country codes are ISO 3166-1 alpha-2 (GR for Greece). "EU" is the EU-wide entry.
- A response's `incident_id` may be empty: several regulator actions (fines, blocks, reports) are not tied to a single incident row, and inventing a link would be false precision. The viewer counts those responses under their own id prefix (e.g. `NL-R-01` under the Netherlands). They are counted in the header totals and the Compare tab and listed on the Review tab, but they are not attached to a case card — so the "official responses" figure in the Cases glance counts only the responses shown on the case cards below it, as in the ASEAN tracker.
- `names_risk` is "yes" where the instrument itself names AI risk tiers or systemic-risk duties (the AI Act, the GPAI Code of Practice, the Digital Omnibus).
- `legal_basis` is one of `not_applicable`, `none_stated`, `new_law`, `existing_law`.
- Themes: `deepfake-fraud`, `sexual-deepfakes`, `political-deepfakes`, `election-integrity`, `online-safety`, `general-ai`, `data-protection`.
- Response types: `statement`, `advisory`, `engagement`, `block_takedown`, `restriction_lifted`, `enforcement`, `legislation`. Policy statuses: `in_force`, `adopted`, `draft`, `proposed`, `superseded`.

## Privacy and security

- **Privacy.** The page sets no cookies, loads no third-party resources and collects no personal data — see [`PRIVACY.md`](PRIVACY.md), linked from the page footer on every tab. It stores two things in the visitor's own browser only, never sent anywhere: the dark/light theme choice and the Review tab tick boxes. Outbound source links load only when a visitor clicks them. Rows about biometric enforcement (for example the CNIL's €20m fine against Clearview AI for unlawful biometric processing) are public-record rows about what a regulator did; the page itself does not collect or process biometric data.
- **Security headers.** The site is hosted on GitHub Pages, which cannot set custom HTTP response headers. The page therefore sets what it can through `<meta>` tags: Content-Security-Policy and Referrer-Policy. Three of the headers a security audit typically asks for have no `<meta>` equivalent and cannot be set while the site is hosted on GitHub Pages: X-Content-Type-Options (`nosniff`), X-Frame-Options (likewise CSP `frame-ancestors`, which browsers ignore in a `<meta>` tag) and Permissions-Policy (browsers ignore a Permissions-Policy `<meta>` tag). That is a hosting limitation, not an oversight — if the site moves to a host that allows response headers, those three should be set server-side. The exposure is limited in practice: the page loads no third-party scripts, styles or images, so there is nothing for a MIME-sniffing or framing attack to borrow, and the meta CSP still constrains scripts and styles to the site itself plus its own inline code. The CSP needs `'unsafe-inline'` because all page JavaScript and CSS is inline, and `'wasm-unsafe-eval'` so the search index (Pagefind, a WebAssembly module served from the site itself) can load — it permits compiling WebAssembly from the site's own files only — so it is a partial mitigation.

## Licences and corrections

Data: CC BY 4.0 (`DATA-LICENSE.md`). Code: MIT (`LICENSE`). Corrections: suhaimizainalshah@gmail.com or GitHub issues.

*Prepared by Suhaimi Zainal Shah with assistance from Muse and Claude AI (Anthropic). Version 0.1, data verified 23 November 2026.*
## Addresses
The tracker lives at **https://aibenar.dev/EU-AI-Governance-Tracker/**. Old `suhaimizainalshah.github.io` links redirect there automatically.
The feeds' update IDs keep the old address on purpose (`FEED_ID_BASE` in `build.py`): an ID is a label, not a link, and changing it would make feed
readers show every past update again.

*Built and maintained by Suhaimi Zainal Shah · [AI Benar Advisory](https://aibenar.dev/AI-Benar-Advisory/) — independent AI compliance and governance.*

## Sources saved to the Internet Archive
Every week (and whenever `data/*.csv` changes on main), `.github/workflows/archive-sources.yml` runs `scripts/archive_sources.py`.
For each source link without an archived copy, it asks the Wayback Machine whether a copy exists, and if not, asks Save Page Now
to make one. The copies are listed in `data/archive.json`, and the page shows an **archived copy** link beside each source that has one.

- It works without an account, slowly. For more reliable saving, create a free archive.org account, get its keys at
  https://archive.org/account/s3.php, and add them under **Settings → Secrets and variables → Actions** as `IA_ACCESS_KEY` and `IA_SECRET_KEY`.
- It is gentle: at most 150 checks and 25 new copies a run (change the number when running it by hand), with pauses, and it stops
  for the run if the archive asks it to slow down. Failed links are retried a week later, up to three times.
- To run it now: **Actions → Archive sources → Run workflow**.
