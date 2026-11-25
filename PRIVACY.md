# Privacy

This tracker page sets no cookies and collects no personal data of its own. Since 25 November 2026 it counts visits with **GoatCounter**, a small, privacy-focused, open-source service, on the same account as the ASEAN AI Governance Tracker. Counting is aggregate only: there is no individual tracking, no tracking pixel and no fingerprinting.

## Visitor counting

- **What is counted:** page loads, which tab was opened, the site that sent the visitor, the visitor's country, and broad browser, system and screen-size details.
- **How:** the page loads GoatCounter's script from `gc.zgo.at` and sends each count to `suhaimizs.goatcounter.com`. GoatCounter sets no cookies and, according to its privacy policy, does not store visitors' IP addresses.
- **What is shown publicly:** the Visitors tab shows live totals (visits and tabs opened, for the last 30 days and all time), fetched from GoatCounter's public counter. No individual is ever shown.
- **Opting out:** if your browser sends Do Not Track or Global Privacy Control, the page does not load GoatCounter, sends nothing, and does not fetch the live totals. Nothing is counted when the page is opened from a local file.
- **Your own visits:** the owner excludes their own visits by opening the page with `#toggle-goatcounter` once on each browser.

## What the page loads

Apart from GoatCounter's counting script and its counting endpoints, the page's scripts, styles and data all come from the tracker site itself. The only other third parties involved are the source sites linked from each row (the EU Official Journal, the European Commission, national regulators and similar), and those load only if a visitor follows a link.

## What the page stores in your browser

Two things, both kept on your device only and never sent anywhere:

- **Theme choice** (`localStorage` key `euat_theme`): whether you picked dark or light mode, so the choice survives a reload.
- **Review tick boxes** (`localStorage` key `euat_review_v1`): which rows on the Review tab you ticked while checking an update, so the ticks survive a reload.

Clearing the site's data in your browser removes both. Neither is a cookie, and neither identifies you.

## Biometric data

The tracker records public enforcement actions that concern biometric processing — for example the CNIL's €20m fine against Clearview AI for unlawful biometric processing (row `FR-R-01`). Those are public-record rows about what a regulator did. The page itself does not collect, process or ask for any biometric data.

## Security headers

The site is hosted on GitHub Pages, which cannot set custom HTTP response headers. The page therefore sets Content-Security-Policy and Referrer-Policy through `<meta>` tags. Permissions-Policy has no `<meta>` equivalent — browsers ignore a Permissions-Policy `<meta>` tag — and neither do X-Content-Type-Options and X-Frame-Options (and CSP `frame-ancestors`, which browsers ignore in a `<meta>` tag), so none of them can be set while the site is hosted on GitHub Pages. If the site moves to a host that allows response headers, those should be set server-side. The CSP needs `'unsafe-inline'` because all page JavaScript and CSS is inline, so it is a partial mitigation. See the README for the full note.

## The tracker data

The tracker data itself is a public record of AI incidents, official responses and policy instruments, each with a source link. It contains no personal data: rows name regulators, companies and public bodies, not private individuals.

Data: CC BY 4.0. Code: MIT. Corrections: suhaimizainalshah@gmail.com or GitHub issues.
