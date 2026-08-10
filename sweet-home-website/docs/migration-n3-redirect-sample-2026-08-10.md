# Phase N3 — Migration integrity re-check

**Date:** 2026-08-10  
**Method:** `GET` without following redirects; browser-like User-Agent.  
**Origin:** live `sweet-home.co.il` via Cloudflare → Render → `sweethome-immobilien.de`.

## Verdict

**PASS.** Sample URLs return **301** to `sweethome-immobilien.de` (path+query preserved). No **302** observed. No **200 old HTML** on apex `/`, `/en`, `/blog` (incl. `?cachebust=1`).

## Results (34 URLs)

| Status | Code | Old URL | Location |
|---|---|---|---|
| PASS | 301 | `https://sweet-home.co.il/` | `https://sweethome-immobilien.de/` |
| PASS | 301 | `https://sweet-home.co.il/en` | `https://sweethome-immobilien.de/en` |
| PASS | 301 | `https://sweet-home.co.il/about` | `https://sweethome-immobilien.de/about` |
| PASS | 301 | `https://sweet-home.co.il/contact` | `https://sweethome-immobilien.de/contact` |
| PASS | 301 | `https://sweet-home.co.il/properties` | `https://sweethome-immobilien.de/properties` |
| PASS | 301 | `https://sweet-home.co.il/projects` | `https://sweethome-immobilien.de/projects` |
| PASS | 301 | `https://sweet-home.co.il/blog` | `https://sweethome-immobilien.de/blog` |
| PASS | 301 | `https://sweet-home.co.il/wohnungen-berlin-kaufen` | `https://sweethome-immobilien.de/wohnungen-berlin-kaufen` |
| PASS | 301 | `https://sweet-home.co.il/wohnung-kaufen-moabit` | `https://sweethome-immobilien.de/wohnung-kaufen-moabit` |
| PASS | 301 | `https://sweet-home.co.il/immobilien-dubai-kaufen` | `https://sweethome-immobilien.de/immobilien-dubai-kaufen` |
| PASS | 301 | `https://sweet-home.co.il/immobilien-zypern-kaufen` | `https://sweethome-immobilien.de/immobilien-zypern-kaufen` |
| PASS | 301 | `https://sweet-home.co.il/en/properties-for-sale-berlin` | `https://sweethome-immobilien.de/en/properties-for-sale-berlin` |
| PASS | 301 | `https://sweet-home.co.il/en/properties-for-sale-dubai` | `https://sweethome-immobilien.de/en/properties-for-sale-dubai` |
| PASS | 301 | `https://sweet-home.co.il/en/properties-for-sale-cyprus` | `https://sweethome-immobilien.de/en/properties-for-sale-cyprus` |
| PASS | 301 | `https://sweet-home.co.il/berlin-mieter-belegte-einstiegsstrategie` | matching `.de` |
| PASS | 301 | `https://sweet-home.co.il/en/berlin-tenant-occupied-entry-strategy` | matching `.de` |
| PASS | 301 | `https://sweet-home.co.il/properties?country=Germany&city=Berlin` | matching `.de` + query |
| PASS | 301 | `https://sweet-home.co.il/blog?page=2` | matching `.de` + query |
| PASS | 301 | `https://sweet-home.co.il/blog?page=1` | matching `.de` + query |
| PASS | 301 | `https://sweet-home.co.il/de/about` | matching `.de` |
| PASS | 301 | `https://sweet-home.co.il/de/en/about` | matching `.de` |
| PASS | 301 | `https://sweet-home.co.il/es/about` | matching `.de` |
| PASS | 301 | `https://sweet-home.co.il/lang/es` | matching `.de` |
| PASS | 301 | `https://sweet-home.co.il/sitemap.xml` | matching `.de` |
| PASS | 301 | `https://sweet-home.co.il/robots.txt` | matching `.de` |
| PASS | 301 | `https://sweet-home.co.il/services` | matching `.de` |
| PASS | 301 | `https://sweet-home.co.il/blog/kaufnebenkosten-berlin` | matching `.de` |
| PASS | 301 | `https://sweet-home.co.il/blog/hidden-costs-of-buying-property-in-berlin` | matching `.de` (then on `.de` → German slug) |
| PASS | 301 | `https://sweet-home.co.il/de/` | matching `.de` |
| PASS | 301 | `https://sweet-home.co.il/es/` | matching `.de` |
| PASS | 301 | `https://sweet-home.co.il/?cachebust=1` | matching `.de` + query |
| PASS | 301 | `https://sweet-home.co.il/en?cachebust=1` | matching `.de` + query |
| PASS | 301 | `https://sweet-home.co.il/blog?cachebust=1` | matching `.de` + query |
| CHAIN | 301 | `https://www.sweet-home.co.il/` | `https://sweet-home.co.il/` (then apex → `.de`) |

**Counts:** PASS=33 CHAIN=1 FAIL=0 · **No 302** · CF-Cache-Status: DYNAMIC on sample.

## Confirmations (Adi asked)

1. **Breadcrumb schema (money page):** OK — `BreadcrumbList` in HTML on `/wohnungen-berlin-kaufen` (Startseite → Wohnungen in Berlin kaufen).
2. **Console housekeeping:** Done earlier (Phase D) — debug `console.log` / forced debug styles / Leaflet source-map warning removed from property pages.

## TTFB (2026-08-10, from this client)

Target: under **800ms** on money + district pages.

| Path | Cold-ish (cachebust) | Warm |
|------|---------------------:|-----:|
| `/wohnungen-berlin-kaufen` | 800ms | 246ms |
| `/wohnung-kaufen-charlottenburg` | 1429ms* | 207ms |
| `/wohnung-kaufen-moabit` | 232ms | 219ms |
| `/wohnung-kaufen-kreuzberg` | 221ms | 225ms |
| `/wohnung-kaufen-neukoelln` | 218ms | 230ms |
| `/wohnung-kaufen-schoeneberg` | 264ms | 227ms |
| `/wohnung-kaufen-prenzlauer-berg` | 251ms | 225ms |
| `/wohnung-kaufen-berlin-mitte` | 214ms | 284ms |
| `/wohnung-kaufen-pankow` | 358ms | 281ms |

\*Charlottenburg cold outlier; warm under 800ms. Money page cold at the 800ms line; warm ~250ms. `Cache-Control: s-maxage=60` present.

## 404 traffic (analytics, last 30 days)

Top broken paths were **missing prefixes** (old share/CMS URLs), e.g.:

| Path pattern | Example hits | Fix |
|---|---:|---|
| `/for-sale/...` | 1340+ | 301 → `/properties/for-sale/...` |
| Bare project slug | ~1200 | 301 → `/projects/{slug}` |
| Bare property slug | 200–300 each | 301 → `/properties/{slug}` |
| Bare blog slug | 150–180 | 301 → `/blog/{german-or-slug}` |
| `/regions` | 234 | 301 → `/` |

Shipped in `middleware/legacyBareSlugRedirect.js` (deploy with this cycle).

## Related prior report

Previous sample (2026-08-04): [`migration-p1-redirect-sample-2026-08-04.md`](./migration-p1-redirect-sample-2026-08-04.md)
