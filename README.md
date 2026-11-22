# EU AI Governance Tracker

A public, verifiable record of AI incidents, official responses and policy instruments across the European Union and its 27 member states. Modelled on the [ASEAN AI Governance Tracker](https://suhaimizainalshah.github.io/ASEAN-AI-Governance-Tracker/) by the same author.

**Status: first release. Version 0.1 · 4 incidents · 9 responses · 17 instruments · 8 backlog items · data verified 22 November 2026.** Every row has a source link to a primary or official source.

## What it covers

- **Incidents** — documented AI incidents in the EU (a harmful deployment, a breach, a misuse), dated to the earliest public record.
- **Responses** — any action by a government body or a person with official authority: statements, advisories, investigations, orders, fines, laws. Company, party, researcher and news statements do not count.
- **Instruments** — laws, regulations, strategies, guidance and institutions, from the EU AI Act and GDPR down to national AI laws and strategies. EU-wide instruments (the AI Act, the Digital Services Act, the Digital Omnibus) sit under "EU", not under one member state.
- **Map** — a tile-grid cartogram on the Cases tab only: every place is one clearly labelled tile, coloured by how many rows it has, with a metric toggle (total / incidents / responses / instruments). Hover or tap a tile to see its numbers; click it to filter the Cases list below. The map reads its numbers from the data, never from hard-coded figures. Tiles are not geographic borders.

## Coverage in this release

Eight member states have a verified row (France, Germany, Denmark, Netherlands, Poland, Ireland, Spain, Italy) plus the EU-wide entry. Nineteen member states have no verified row yet — that is a finding about this first release, not about those states. A follow-up pass will target their national AI strategies and data-protection actions. Unsure items are in `data/backlog.csv`, never in the data.

## How to use it

Open `index.html` (or the GitHub Pages site). Use the tabs: Cases, Policies, Compare, Updates, Review, Method. Filter by place, theme or search; download the filtered rows as CSV; copy a link to any filtered view. The Review tab lists every row verified on the latest date with tick boxes, for checking an update before it is merged.

## Workflow

- Edit only `data/*.csv`. Every row needs a source URL.
- Run `python3 build.py`. The build refuses bad data: impossible dates, missing sources, unknown links, a response dated before its incident, duplicate IDs.
- Log changes in `data/changelog.csv`.
- Updates are proposed as a pull request and reviewed on the Review tab. Nothing is pushed straight to `main`.

## Schema notes

- Country codes are ISO 3166-1 alpha-2 (GR for Greece). "EU" is the EU-wide entry.
- A response's `incident_id` may be empty: several regulator actions (fines, blocks, reports) are not tied to a single incident row, and inventing a link would be false precision. The viewer counts those responses under their own id prefix (e.g. `NL-R-01` under the Netherlands). They are counted in the header totals and the Compare tab and listed on the Review tab, but they are not attached to a case card — so the "official responses" figure in the Cases glance counts only the responses shown on the case cards below it, as in the ASEAN tracker.
- `names_risk` is "yes" where the instrument itself names AI risk tiers or systemic-risk duties (the AI Act, the GPAI Code of Practice, the Digital Omnibus).
- `legal_basis` is one of `not_applicable`, `none_stated`, `new_law`, `existing_law`.
- Themes: `deepfake-fraud`, `sexual-deepfakes`, `political-deepfakes`, `election-integrity`, `online-safety`, `general-ai`, `data-protection`.
- Response types: `statement`, `advisory`, `engagement`, `block_takedown`, `restriction_lifted`, `enforcement`, `legislation`. Policy statuses: `in_force`, `adopted`, `draft`, `proposed`, `superseded`.

## Privacy and security

- **Privacy.** The page sets no cookies, loads no third-party resources and collects no personal data — see [`PRIVACY.md`](PRIVACY.md), linked from the page footer on every tab. It stores two things in the visitor's own browser only, never sent anywhere: the dark/light theme choice and the Review tab tick boxes. Outbound source links load only when a visitor clicks them. Rows about biometric enforcement (for example the CNIL's €20m fine against Clearview AI for unlawful biometric processing) are public-record rows about what a regulator did; the page itself does not collect or process biometric data.
- **Security headers.** The site is hosted on GitHub Pages, which cannot set custom HTTP response headers. The page therefore sets what it can through `<meta>` tags: Content-Security-Policy and Referrer-Policy. Three of the headers a security audit typically asks for have no `<meta>` equivalent and cannot be set while the site is hosted on GitHub Pages: X-Content-Type-Options (`nosniff`), X-Frame-Options (likewise CSP `frame-ancestors`, which browsers ignore in a `<meta>` tag) and Permissions-Policy (browsers ignore a Permissions-Policy `<meta>` tag). That is a hosting limitation, not an oversight — if the site moves to a host that allows response headers, those three should be set server-side. The exposure is limited in practice: the page loads no third-party scripts, styles or images, so there is nothing for a MIME-sniffing or framing attack to borrow, and the meta CSP still constrains scripts and styles to the site itself plus its own inline code. The CSP needs `'unsafe-inline'` because all page JavaScript and CSS is inline, so it is a partial mitigation.

## Licences and corrections

Data: CC BY 4.0 (`DATA-LICENSE.md`). Code: MIT (`LICENSE`). Corrections: suhaimizainalshah@gmail.com or GitHub issues.

*Prepared by Suhaimi Zainal Shah with assistance from Muse and Claude AI (Anthropic). Version 0.1, data verified 22 November 2026.*
*Built and maintained by Suhaimi Zainal Shah · [AI Benar Advisory](https://suhaimizainalshah.github.io/AI-Benar-Advisory/) — independent AI compliance and governance.*
