# Phase M / P1 — Redirect sample check

**Date:** 2026-08-04 20:10 UTC
**Method:** `GET` without following redirects; User-Agent browser-like.
**Origin:** live `sweet-home.co.il` via Cloudflare → Render.

## Verdict

**PASS.** Sample URLs return **301** to `sweethome-immobilien.de` (path+query preserved). No **302** observed. No **200 old HTML** on apex sample URLs (including `/`, `/en`, `/blog` without cachebust).

## Notes

- App middleware already uses `res.redirect(301, …)` (`middleware/domainRedirect.js`). Live responses match.
- `www.sweet-home.co.il` currently **301 → apex** `https://sweet-home.co.il/` (Cloudflare), then apex **301 → .de**. Both hops are 301 (acceptable; ideal would be www → .de in one hop).
- Adi’s earlier **302** / **200 cached HTML** findings are **not reproducible** from this check (2026-08-04). If her region still sees stale 200s, purge Cloudflare cache for `sweet-home.co.il` (Ronli).

## Results (33 URLs)

| Status | Code | Old URL | Location | Expected | CF-Cache |
|---|---|---|---|---|---|
| PASS | 301 | `https://sweet-home.co.il/` | `https://sweethome-immobilien.de/` | `https://sweethome-immobilien.de/` | DYNAMIC |
| PASS | 301 | `https://sweet-home.co.il/en` | `https://sweethome-immobilien.de/en` | `https://sweethome-immobilien.de/en` | DYNAMIC |
| PASS | 301 | `https://sweet-home.co.il/about` | `https://sweethome-immobilien.de/about` | `https://sweethome-immobilien.de/about` | DYNAMIC |
| PASS | 301 | `https://sweet-home.co.il/contact` | `https://sweethome-immobilien.de/contact` | `https://sweethome-immobilien.de/contact` | DYNAMIC |
| PASS | 301 | `https://sweet-home.co.il/properties` | `https://sweethome-immobilien.de/properties` | `https://sweethome-immobilien.de/properties` | DYNAMIC |
| PASS | 301 | `https://sweet-home.co.il/projects` | `https://sweethome-immobilien.de/projects` | `https://sweethome-immobilien.de/projects` | DYNAMIC |
| PASS | 301 | `https://sweet-home.co.il/blog` | `https://sweethome-immobilien.de/blog` | `https://sweethome-immobilien.de/blog` | DYNAMIC |
| PASS | 301 | `https://sweet-home.co.il/wohnungen-berlin-kaufen` | `https://sweethome-immobilien.de/wohnungen-berlin-kaufen` | `https://sweethome-immobilien.de/wohnungen-berlin-kaufen` | DYNAMIC |
| PASS | 301 | `https://sweet-home.co.il/wohnung-kaufen-moabit` | `https://sweethome-immobilien.de/wohnung-kaufen-moabit` | `https://sweethome-immobilien.de/wohnung-kaufen-moabit` | DYNAMIC |
| PASS | 301 | `https://sweet-home.co.il/immobilien-dubai-kaufen` | `https://sweethome-immobilien.de/immobilien-dubai-kaufen` | `https://sweethome-immobilien.de/immobilien-dubai-kaufen` | DYNAMIC |
| PASS | 301 | `https://sweet-home.co.il/immobilien-zypern-kaufen` | `https://sweethome-immobilien.de/immobilien-zypern-kaufen` | `https://sweethome-immobilien.de/immobilien-zypern-kaufen` | DYNAMIC |
| PASS | 301 | `https://sweet-home.co.il/en/properties-for-sale-berlin` | `https://sweethome-immobilien.de/en/properties-for-sale-berlin` | `https://sweethome-immobilien.de/en/properties-for-sale-berlin` | DYNAMIC |
| PASS | 301 | `https://sweet-home.co.il/en/properties-for-sale-dubai` | `https://sweethome-immobilien.de/en/properties-for-sale-dubai` | `https://sweethome-immobilien.de/en/properties-for-sale-dubai` | DYNAMIC |
| PASS | 301 | `https://sweet-home.co.il/en/properties-for-sale-cyprus` | `https://sweethome-immobilien.de/en/properties-for-sale-cyprus` | `https://sweethome-immobilien.de/en/properties-for-sale-cyprus` | DYNAMIC |
| PASS | 301 | `https://sweet-home.co.il/berlin-mieter-belegte-einstiegsstrategie` | `https://sweethome-immobilien.de/berlin-mieter-belegte-einstiegsstrategie` | `https://sweethome-immobilien.de/berlin-mieter-belegte-einstiegsstrategie` | DYNAMIC |
| PASS | 301 | `https://sweet-home.co.il/en/berlin-tenant-occupied-entry-strategy` | `https://sweethome-immobilien.de/en/berlin-tenant-occupied-entry-strategy` | `https://sweethome-immobilien.de/en/berlin-tenant-occupied-entry-strategy` | DYNAMIC |
| PASS | 301 | `https://sweet-home.co.il/properties?country=Germany&city=Berlin` | `https://sweethome-immobilien.de/properties?country=Germany&city=Berlin` | `https://sweethome-immobilien.de/properties?country=Germany&city=Berlin` | DYNAMIC |
| PASS | 301 | `https://sweet-home.co.il/blog?page=2` | `https://sweethome-immobilien.de/blog?page=2` | `https://sweethome-immobilien.de/blog?page=2` | DYNAMIC |
| PASS | 301 | `https://sweet-home.co.il/blog?page=1` | `https://sweethome-immobilien.de/blog?page=1` | `https://sweethome-immobilien.de/blog?page=1` | DYNAMIC |
| PASS | 301 | `https://sweet-home.co.il/de/about` | `https://sweethome-immobilien.de/de/about` | `https://sweethome-immobilien.de/de/about` | DYNAMIC |
| PASS | 301 | `https://sweet-home.co.il/de/en/about` | `https://sweethome-immobilien.de/de/en/about` | `https://sweethome-immobilien.de/de/en/about` | DYNAMIC |
| PASS | 301 | `https://sweet-home.co.il/es/about` | `https://sweethome-immobilien.de/es/about` | `https://sweethome-immobilien.de/es/about` | DYNAMIC |
| PASS | 301 | `https://sweet-home.co.il/lang/es` | `https://sweethome-immobilien.de/lang/es` | `https://sweethome-immobilien.de/lang/es` | DYNAMIC |
| PASS | 301 | `https://sweet-home.co.il/sitemap.xml` | `https://sweethome-immobilien.de/sitemap.xml` | `https://sweethome-immobilien.de/sitemap.xml` | DYNAMIC |
| PASS | 301 | `https://sweet-home.co.il/robots.txt` | `https://sweethome-immobilien.de/robots.txt` | `https://sweethome-immobilien.de/robots.txt` | DYNAMIC |
| PASS | 301 | `https://sweet-home.co.il/services` | `https://sweethome-immobilien.de/services` | `https://sweethome-immobilien.de/services` | DYNAMIC |
| PASS | 301 | `https://sweet-home.co.il/blog/hidden-costs-of-buying-property-in-berlin` | `https://sweethome-immobilien.de/blog/hidden-costs-of-buying-property-in-berlin` | `https://sweethome-immobilien.de/blog/hidden-costs-of-buying-property-in-berlin` | DYNAMIC |
| PASS | 301 | `https://sweet-home.co.il/de/` | `https://sweethome-immobilien.de/de/` | `https://sweethome-immobilien.de/de/` | DYNAMIC |
| PASS | 301 | `https://sweet-home.co.il/es/` | `https://sweethome-immobilien.de/es/` | `https://sweethome-immobilien.de/es/` | DYNAMIC |
| PASS | 301 | `https://sweet-home.co.il/?cachebust=1` | `https://sweethome-immobilien.de/?cachebust=1` | `https://sweethome-immobilien.de/?cachebust=1` | DYNAMIC |
| PASS | 301 | `https://sweet-home.co.il/en?cachebust=1` | `https://sweethome-immobilien.de/en?cachebust=1` | `https://sweethome-immobilien.de/en?cachebust=1` | DYNAMIC |
| PASS | 301 | `https://sweet-home.co.il/blog?cachebust=1` | `https://sweethome-immobilien.de/blog?cachebust=1` | `https://sweethome-immobilien.de/blog?cachebust=1` | DYNAMIC |
| CHAIN | 301 | `https://www.sweet-home.co.il/` | `https://sweet-home.co.il/` | `https://sweethome-immobilien.de/` | DYNAMIC |

**Counts:** PASS=32 CHAIN=1 PASS_SOFT=0 FAIL=0
