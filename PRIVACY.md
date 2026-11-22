# Privacy

This tracker page sets no cookies and collects no personal data. There is no visitor counting in version 0.1 — no analytics, no tracking pixel, no fingerprinting. If visitor counting is added later, this file will say so, and it will be aggregate-only with no individual tracking.

## What the page loads

The page loads no third-party resources: its scripts, styles and data all come from the tracker site itself. The only third parties involved are the source sites linked from each row (the EU Official Journal, the European Commission, national regulators and similar), and those load only if a visitor clicks a source link. Nothing is fetched from anywhere else when the page opens.

## What the page stores in your browser

Two things, both kept on your device only and never sent anywhere:

- **Theme choice** (`localStorage` key `euat_theme`): whether you picked dark or light mode, so the choice survives a reload.
- **Review tick boxes** (`localStorage` key `euat_review_v1`): which rows on the Review tab you ticked while checking an update, so the ticks survive a reload.

Clearing the site's data in your browser removes both. Neither is a cookie, and neither identifies you.

## Biometric data

The tracker records public enforcement actions that concern biometric processing — for example the CNIL's €20m fine against Clearview AI for unlawful biometric processing (row `FR-R-01`). Those are public-record rows about what a regulator did. The page itself does not collect, process or ask for any biometric data.

## Security headers

The site is hosted on GitHub Pages, which cannot set custom HTTP response headers. The page therefore sets Content-Security-Policy, Referrer-Policy and Permissions-Policy through `<meta>` tags. X-Content-Type-Options and X-Frame-Options (and CSP `frame-ancestors`, which browsers ignore in a `<meta>` tag) have no `<meta>` equivalent and cannot be set while the site is hosted on GitHub Pages. If the site moves to a host that allows response headers, those should be set server-side. See the README for the full note.

## The tracker data

The tracker data itself is a public record of AI incidents, official responses and policy instruments, each with a source link. It contains no personal data beyond the names of public officials and office-holders named in the official sources.

Data: CC BY 4.0. Code: MIT. Corrections: suhaimizainalshah@gmail.com or GitHub issues.
