# Sweet Home Domain Migration Playbook

**Migration:** `sweet-home.co.il` → `sweethome-immobilien.de`  
**Focus:** Berlin property, German + English (Spanish removal per SEO plan)  
**Timeline:** Weeks 1–2 technical (migration first), then content roadmap Months 1–3  
**Created:** July 2026  
**Sources:** SEO consultant docs (`Sweet_Home_Technical_2Weeks`, `Sweet_Home_3-months-Roadmap`, `Sweet_Home_Technical_Fixes.xlsx`) + codebase audit

---

## How to use this document

- Check boxes as tasks are completed: `- [ ]` → `- [x]`
- Fill in **Owner**, **Target date**, and **Notes** as you go
- Do **not** skip Phase 0 decisions — many items are irreversible or business-critical
- **Rule:** 301 each old URL to its exact new match; keep redirects live long-term

### Key contacts / owners

| Role | Name | Notes |
|------|------|-------|
| Dev | Luis / Medialy | Code, deploy, redirects |
| SEO consultant | | GSC, crawl, disavow, Change of Address |
| Business (Israel / Irem) | | Spanish removal, homepage positioning, go-live date |
| DNS / Cloudflare | Ronli | Confirmed he will flip `.de` DNS on go-live ("I can do it") |

### Key dates

| Milestone | Target date | Actual date |
|-----------|-------------|-------------|
| Decisions locked | | |
| Pre-migration fixes complete | | |
| Staging `.de` tested | | |
| **Go-live** | | |
| GSC Change of Address submitted | | |
| Week 4 post-launch review | | |
| Month 3 success review | | |

---

## Core principle

This is a **domain switch, not a rebuild**:

- Same Node/Express app, same page paths, same database
- Only the primary domain changes
- Every `sweet-home.co.il` URL → **301** → same path on `sweethome-immobilien.de`
- `sweet-home.co.il` stays live **forever** (redirecting only)

**Example:**
```
https://sweet-home.co.il/properties/foo?country=Germany
  → 301 →
https://sweethome-immobilien.de/properties/foo?country=Germany
```

---

# PHASE 0 — Decisions & preparation

*Complete before any code or DNS changes.*

## 0.1 Access & ownership checklist

- [x] DNS access: `sweethome-immobilien.de` — Ronli will handle (confirmed 2026-07-15)
- [x] DNS access: `sweet-home.co.il` (keep active) — Ronli will handle
- [ ] Hosting/server access (Render or current provider)
- [ ] SSL can be issued for `.de` domain
- [ ] Google Search Console — `sweet-home.co.il` property
- [ ] Google Search Console — ability to add `sweethome-immobilien.de`
- [ ] Google Analytics 4 admin access
- [ ] Google Business Profile admin access
- [ ] Meta Ads Manager (landing page URLs)
- [ ] Email / SMTP (`Site@sweet-home.co.il` — decide if email domain changes)
- [ ] Zapier / webhooks / CRM integrations
- [ ] DigitalOcean Spaces / CDN (if asset URLs are absolute)

**Notes:**

---

## 0.2 Business decisions (must be locked before migration)

- [ ] **Confirm go-live date** (avoid peak Meta campaign weeks; expect 2–8 week ranking fluctuation)
- [ ] **Drop Spanish (`/es`)?** — SEO plan says yes; confirm no Spanish ad spend / leads dependency
- [ ] **Retire `/de` URL prefix?** — German at root `/`, English at `/en` only (aligns with existing `DE_DEFAULT_EN_PREFIX` migration — see `docs/DE_DEFAULT_EN_PREFIX_MIGRATION_IMPLEMENTATION.md`)
- [ ] **Homepage “lead with Berlin”** — confirm with business (affects Cyprus/Dubai positioning)
- [x] **Remove district page over-optimised link blocks** — trimmed to 3–5 useful links (#14 DONE 2026-07-17)
- [ ] Rollback owner identified (who can revert deploy within 48h if needed)

**Decisions log:**

| Decision | Approved by | Date | Notes |
|----------|-------------|------|-------|
| Drop `/es` | | | |
| Go-live date | | | |
| Homepage Berlin-first | Business | 2026-07-17 | Approved and shipped on homepage (#13) |
| Trim district over-optimised links | Dev / SEO | 2026-07-17 | 3–5 useful links; Indexierung copy removed (#14) |

---

## 0.3 July baseline snapshot (before any changes)

Record these **before** migration work begins (SEO consultant requirement).

### Google Search Console (`sweet-home.co.il`)

- [ ] Export Performance report (clicks, impressions, CTR, position) — last 3 months
- [ ] Export Coverage / Pages report (indexed, 404, redirects, duplicates)
- [ ] Screenshot or export top 50 landing pages by clicks
- [ ] Note current indexed page count
- [ ] Save drill-down exports for: Not found, 5xx, Redirect errors, Duplicate canonical issues

**Files saved to:**

### Google Analytics 4

- [ ] Record sessions, users, conversions (last 3 months)
- [ ] Record `contact_form_submit` event count (baseline for tracking fix)
- [ ] Note primary traffic channels (organic, paid, direct)
- [ ] Document GA4 property ID and data stream URL

**Baseline numbers:**

| Metric | Value | Date captured |
|--------|-------|---------------|
| Organic sessions (monthly avg) | | |
| Leads / form submissions (monthly avg) | | |
| Indexed pages (GSC) | | |

### Full site crawl

- [ ] Run full crawl (Screaming Frog, Sitebulb, or consultant export)
- [ ] Obtain consultant **“URLs to Fix”** file (referenced in her doc but not yet shared)
- [ ] Build master URL map spreadsheet (see template below)

**Crawl file location:**

---

## 0.4 Master URL map template

Create spreadsheet: `domain-migration-url-map.xlsx` (or extend `seo-redirect-map-2026-04-28.csv`)

| # | Old URL (.co.il) | New URL (.de) | HTTP status | Path changed? | Notes |
|---|------------------|---------------|-------------|---------------|-------|
| 1 | `https://sweet-home.co.il/` | `https://sweethome-immobilien.de/` | 301 | No | Homepage DE |
| 2 | `https://sweet-home.co.il/en` | `https://sweethome-immobilien.de/en` | 301 | No | Homepage EN |
| 3 | `https://sweet-home.co.il/about` | `https://sweethome-immobilien.de/about` | 301 | No | |
| … | | | | | |

**Special cases to include:**

| Pattern | Action |
|---------|--------|
| `/es/*` | 301 to DE equivalent OR 410 (if dropping Spanish) |
| `/de/*` legacy prefix | 301 to non-prefixed path (already partially in `app.js`) |
| `/de/en/*`, `/es/en/*` | 301 to correct language URL; stop generating |
| `?page=1` | 301 to URL without `page` param |
| Filter URLs `?country=&city=&neighborhood=` | Canonical to clean landing page OR noindex |
| ~530 legacy 404 / soft-404 URLs | 410 or 301 to closest live page |
| Spam paths (`/content-hub/`, `/item/*.html`) | 410 (already in redirect map) |

- [ ] URL map complete and reviewed by SEO consultant
- [ ] Minimum 30 sample URLs selected for pre/post testing (see Phase 4)

---

# PHASE 1 — Pre-migration technical fixes (on `.co.il` first)

*Fix these **before** switching primary domain so `.de` launches clean.*  
*Several items overlap with work already done — mark accordingly.*

## 1.1 Already partially done (verify & close out)

| Item | Status in codebase | Verify |
|------|-------------------|--------|
| Legacy `/de/*` top-level redirects | `app.js` | [ ] Re-test sample URLs |
| Legacy `/de/blog|properties|projects/:slug` redirects | `app.js` | [ ] Re-test |
| High-value slug 301 map | `seo-redirect-map-2026-04-28.csv` + `app.js` | [ ] Run `npm run seo:validate-redirects` |
| `?page=1` → canonical (blog, projects) | `blogController.js`, `projectController.js` | [ ] Re-test |
| 410 for removed endpoints | `leadRoutes.js`, redirect map | [ ] Re-test |
| `robots.txt` disallow admin/api | `app.js` | [ ] Re-test |
| hreflang homepage fix | `app.js` (partial) | [ ] Still uses `en-us` in places — fix in 1.3 |
| Property filter canonical/noindex | `propertyController.js` | [ ] Audit `?country=` URLs in GSC |

---

## 1.2 SEO consultant “Other technical fixes” (16-item checklist)

### Fix 10 — Doubled-brand titles (18 pages) ✅ DONE (2026-07-15)

- [x] Identify all 18 affected URLs (found via codebase + live curl)
- [x] Fix title template so brand is appended only once (not `Sweet Home | Sweet Home`)
- [x] Check SEO head partials and layout title logic
- [x] Re-crawl / verify no duplicate brand in `<title>` — **21/21 PASS live**

**Done when:** No title contains doubled brand name.  
**Owner:** Dev  
**Files changed:** `views/layouts/main.ejs`, `controllers/propertyController.js`, investment strategy SEO heads  
**Notes:** Root cause was layout always appending `| Sweet Home` while landing pages already included the brand in `title`.

---

### Fix 11 — Language-correct titles and H1 ✅ DONE (2026-07-15)

- [x] German static pages show German `<title>` and H1 (e.g. `/about`, `/contact`, `/cookies`)
- [x] Fix any English meta titles on German-default pages (routes now use `t()`)
- [x] Spanish pages also localized (`/es/about`, `/es/contact` verified)
- [x] Services H1 + projects list title/H1 localized
- [x] Live validation PASS (DE/EN/ES)

**Done when:** DE pages show German title and H1.  
**Owner:** Dev  
**Files changed:** `app.js`, `routes/localeRoutes.js`, `locales/{en,de,es}.json`, `controllers/projectController.js`, terms/privacy SEO heads, `views/owners.ejs`, `views/projects/project-list.ejs`  
**Notes:** Layout renders `<title>` before the page body, so titles must be set in route handlers via `t()`, not only inside EJS.

---

### Fix 12 — Missing meta descriptions ✅ DONE (2026-07-15)

- [x] Audit indexable pages missing `meta description`
- [x] Add unique descriptions for: EN home, `/projects`, others flagged in crawl
- [x] German homepage description in German

**Root cause:** SEO head partials crashed silently (TDZ from redeclaring `pageMetaDescription` / `currentPage`), so `/en`, `/es`, and `/projects` never emitted descriptions. DE home only worked via a layout special-case that always used English copy.

**Fix:**
- Repaired `home-head.ejs` and `project-list-head.ejs` (no variable shadowing)
- Localized home / projects / about / contact / cookies meta via `t()` + locale keys
- Layout fallback description only when no `headPartial` (e.g. cookies)

**Done when:** No indexable page missing a description.  
**Owner:** Dev + SEO (copy)  
**Status:** ✅ DONE — live validated 2026-07-15 (12/12 core URLs PASS)

---

### Fix 13 — Homepage Organization + WebSite schema + Berlin focus

**Status:** ✅ DONE — schema live validated 2026-07-16; Berlin-first homepage completed 2026-07-17

- [x] Add `Organization` JSON-LD on homepage
- [x] Add `WebSite` JSON-LD with a working property `SearchAction`
- [x] Validate with Schema.org Validator — 0 errors, 0 warnings (2026-07-16)
- [x] Reorder homepage content sections to lead with Berlin properties, districts, and projects
- [x] Add clean internal links from the DE homepage to the Berlin hub and 11 district landing pages
- [x] Keep homepage district and project sections Berlin-only; retain Dubai/Cyprus only in the secondary international-markets carousel
- [x] Replace the multi-market hero with a full-width Berlin image, localized H1, and short introduction
- [x] Add compact interactive Berlin market map as visual feedback under the search bar (defaults to Germany → Berlin)
- [x] Point international-market carousel CTAs to Dubai/Cyprus landing pages (not filtered search results)

**Done when:** Rich Results Test passes; Berlin content prioritized per business approval.  
**Owner:** Dev (+ business for content order)  
**Files likely involved:** `views/partials/seo/home-head.ejs`, `views/home.ejs`, `public/css/home.css`, `public/js/home.js`

**Technical schema status:** ✅ DONE and live validated 2026-07-16. DE/EN/ES homepages expose the linked `Organization` + `WebSite` graph; live Schema.org validation returned 0 errors and 0 warnings. Google does not currently provide a dedicated rich-result enhancement for these entity types, so Schema.org Validator is the applicable syntax/semantic check.

**Berlin content status:** ✅ DONE 2026-07-17. The hero and primary content sections lead with Berlin; district and development-project sections are Berlin-only; Dubai and Cyprus remain only in the secondary international-markets carousel with links to their localized landing pages. Search defaults to Berlin and stays synchronized with a compact live map preview. Interactive cards/carousels and responsive behavior were retained.

---

### Fix 5 — Filter and pagination duplicates (~729 URLs) ✅ DONE (2026-07-20)

- [x] `?country=`, `?city=`, `?neighborhood=` filter URLs → canonical to clean landing page OR noindex
  - Properties: already redirected country/city query → clean `/properties/for-sale/...` paths; non-clean filters (neighborhood, search, etc.) → `noindex,follow`
  - Projects: filtered/search URLs now `noindex,follow` with canonical pointing at clean locale `/projects` (or `/en/projects`, `/es/projects`)
- [x] `?page=` pagination → page=1 strips param (301) on properties, projects, and blog; page≥2 self-canonical only when the list is otherwise indexable
- [x] `?topic=` on blog → `noindex,follow` + canonical to clean `/blog` (locale-aware); hreflang also points at clean list
- [x] Local verification PASS (2026-07-20): filtered projects/blog noindex; clean lists indexable; property page=1 301; neighborhood filters noindex

**Done when:** Filter/topic URLs are noindex or canonicalize to clean pages; page=1 never indexable as a duplicate.  
**Owner:** Dev  
**Status:** ✅ DONE — code verified locally 2026-07-20 (re-check in GSC after deploy/recrawl)  
**Files changed:** `controllers/propertyController.js`, `controllers/projectController.js`, `views/partials/seo/project-list-head.ejs`, `views/partials/seo/blog-list-head.ejs`

---

### Fix 6 — Broken language URLs (`/de/en`, `/es/en` — ~100 URLs) ✅ DONE (2026-07-20)

- [x] Stop generating `/de/en` and `/es/en` URLs in hreflang (property list was emitting `/de` + `/en/...`)
- [x] 301 existing `/de/en/*` → `/en/*` (and `/de/en` → `/en`)
- [x] 301 existing `/es/en/*` → `/en/*`
- [x] Verify no `/de/en` or `/es/en` return HTTP 200 — local checks return 301; EN property hreflang now uses unprefixed DE + `/en` + `/es` (0 broken combos)

**Done when:** No broken language combo URLs resolve 200.  
**Owner:** Dev  
**Status:** ✅ DONE — local verified 2026-07-20  
**Files changed:** `controllers/propertyController.js` (hreflang builder), `app.js` (catch-all 301s)

---

### Fix 7 — Old dead URLs (~530 legacy 404 / soft-404) ✅ DONE for non-Spanish batch (2026-07-21)

- [x] Merge consultant URL list with GSC “Not found” export — Adi sent `Sweet_Home_404_Classification.xlsx` (469 rows)
- [x] Apply 301 for true equivalents, 410 for permanently removed content (non-Spanish rows)
  - **261** exact-path **301**s: removed blog posts → `/blog`; sold/legacy listings → `/properties/for-sale/germany/berlin`
  - **71** exact-path **410**s: Hebrew/legacy junk, dead CMS paths
  - **112** Spanish `/es` rows **deferred** to Spanish-removal / go-live (per Adi)
- [x] Avoid mass-redirecting everything to homepage
- [x] Runtime rules in `config/seo-404-gsc-2026-07-21.json` + `middleware/seo404Classification.js` (wired in `app.js` before generic `/de/*` collapses)
- [x] Review overrides: did **not** 410 `/en`, `/de/properties`, `/de/projects`, `/en/staff` (would break live pages / already have better 301s)
- [x] Local sample validation PASS (301/410/controls)
- [ ] Re-verify a sample on production after deploy
- [ ] Spanish `/es` 404 rows when Spanish is removed

**Artifacts:** `docs/seo-404-classification-2026-07-21.csv`, `seo-redirect-map-2026-07-21-gsc404.csv`, `config/seo-404-gsc-2026-07-21.json`  
**Done when:** Sample of legacy URLs return 410 or 301, not soft-404.  
**Owner:** Dev + SEO  
**Status:** ✅ Non-Spanish batch DONE (code) 2026-07-21 — Spanish rows + live spot-check remaining

---

### Fix 14 — Remove over-optimised link block on district pages

**Status:** ✅ DONE (2026-07-17)

- [x] Identify district pages with long `berlin-areas` internal link lists
- [x] Remove link list + “Indexierung” style sentence
- [x] Keep 3–5 genuinely useful internal links per page
- [x] Re-test page quality / internal link equity

**Done when:** Block and sentence removed; 3–5 useful links remain.  
**Owner:** Dev  
**Files likely involved:** `views/properties-for-sale-berlin.ejs`, `views/properties-berlin-district-de.ejs`, district landing templates, `views/partials/berlin-district-related-links.ejs`

**Implementation notes:** Replaced the full cross-district dump + SEO/Indexierung outros with a shared partial of 5 useful links (Berlin hub + district search + 3 nearby districts). Berlin hub now shows 5 curated district landings only. Verified on Charlottenburg, Moabit, Neukölln, Spandau, and the DE Berlin hub.

---

### Fix 15 — Contact form tracking (`contact_form_submit`) ✅ DONE (2026-07-20)

- [x] Confirm event fires **once** only on successful submission (not on page load / failed submit) — automated check `scripts/ga4-contact-event-check.js` (mocks the lead endpoint, counts real `dataLayer` pushes): 0 events on load, 1 event per success, 0 on server error, double-click while in flight sends only 1 POST/event
- [x] Fix double-fire or false-positive if present — **found & fixed a page_view double-fire**: `public/js/analytics.js` auto-sent a second `gtag('config', …, { page_path })` on load on top of the config in the layout head, double-counting every page view in GA4. Auto page-view removed; `analytics.min.js` regenerated
- [x] Document event in GA4 for consultant verification (see below)
- [x] Live production confirmation (2026-07-20) on `/contact`: page load → `contact_form_submit` count **0**, `gtag config` count **1**; after one successful submit → exactly **1** `contact_form_submit` with `{ form_type: 'contact_form', property_id: null, project_id: null }` (DevTools `dataLayer` + `ANALYTICS_DEBUG`)

**Event documentation for the consultant:**

- **Event name:** `contact_form_submit` (GA4 property `G-6PL29347V3`, sent via gtag)
- **Params:** `form_type` (`contact_form`, `seller_form`, `property_contact`, `project_contact`, `berlin_investor_strategy_form`), `property_id`, `project_id`, plus seller fields (`neighborhood`, `size`, `rooms`) on the seller form
- **Fires from:** success handlers only, in `public/js/contact.js` (contact page + home), `owners.js`, `property-detail.js`, `project-detail.js`, `berlin-investment-strategy-{de,en}.js` — all gated on the server responding `success: true`; all forms disable the submit button while the request is in flight
- **Recommended:** mark `contact_form_submit` as a key event (conversion) in GA4 Admin → Events; optional spot-check in GA4 Realtime/DebugView
- Note: the server also logs a `contact_form_submit` row to the internal `analytics_events` table (admin dashboard); that is separate from GA4 and unchanged. After this fix, reported page views may drop vs pre-fix baselines — that is the double-count removal, not lost traffic.

**Done when:** One `contact_form_submit` after a real successful submit on production; zero on page load.  
**Owner:** Dev  
**Status:** ✅ DONE — live validated 2026-07-20  
**Files changed:** `public/js/analytics.js`, `public/js/analytics.min.js`, new `scripts/ga4-contact-event-check.js`

---

### Fix 16 — Disavow toxic backlinks

- [ ] SEO consultant prepares disavow file listing spam domains
- [ ] Upload to Search Console on **new** `.de` property (post-migration)
- [ ] Confirm file accepted in GSC

**Done when:** Disavow file accepted.  
**Owner:** SEO (not Dev)

---

## 1.3 hreflang structure (prepare before migration)

Target structure per SEO plan:

| Language | URL pattern | hreflang value |
|----------|-------------|----------------|
| German (default) | `/` and unprefixed paths | `de` |
| English | `/en/...` | `en` (change from current `en-us`) |
| Spanish | **removed** | — |
| Old `/de/...` | **retired** (301 to root paths) | — |

- [ ] Change all `en-us` hreflang tags → `en`
- [ ] Ensure hreflang is reciprocal (each page lists all alternates)
- [ ] German homepage `hreflang` points to `.de/` not `.co.il/`
- [ ] Remove Spanish hreflang entries if dropping `/es`

**Files to update:**
- `app.js` (`hreflangAlternates`, middleware)
- `controllers/propertyController.js`
- `views/partials/seo/*-head.ejs`
- See also: `docs/DE_DEFAULT_EN_PREFIX_MIGRATION_IMPLEMENTATION.md`

---

# PHASE 2 — Infrastructure setup (`.de` domain)

## 2.1 DNS & hosting

- [ ] Add `sweethome-immobilien.de` as custom domain on hosting (Render/etc.)
- [ ] Add `www.sweethome-immobilien.de` if needed (decide: www vs non-www canonical)
- [ ] SSL certificate issued and valid for `.de`
- [ ] Both domains resolve to the **same** Node application
- [ ] `TRUST_PROXY=true` if behind reverse proxy (already in `app.js`)

**Notes:**

---

## 2.2 Environment variables

Update on server (`.env` / Render dashboard):

```env
APP_URL=https://sweethome-immobilien.de
# Consider making CANONICAL_DOMAIN env-driven instead of hardcoded
```

- [ ] `APP_URL` set to `https://sweethome-immobilien.de`
- [ ] Verify no stale `APP_URL` pointing to `.co.il` or `onrender.com`
- [ ] Document all env vars that reference domain (see Phase 3 codebase list)

**Notes:**

---

## 2.3 Search Console & Analytics prep

- [ ] Add `sweethome-immobilien.de` property in Google Search Console
- [ ] Verify domain (DNS TXT or HTML file)
- [ ] Confirm GA4 can track `.de` (same property with cross-domain, or note cutover date)
- [ ] Do **not** submit Change of Address until go-live (Phase 5)

---

# PHASE 3 — Code changes (development)

## 3.1 Canonical domain switch

**Current hardcoded value:** `app.js` line ~231:
```javascript
const CANONICAL_DOMAIN = 'https://sweet-home.co.il';
```

- [ ] Change to `https://sweethome-immobilien.de` (or read from `process.env.CANONICAL_DOMAIN`)
- [ ] Verify `getCanonicalBaseUrl()` returns `.de` for all public pages
- [ ] Audit every `canonicalUrl`, `og:url`, JSON-LD `@id` uses `res.locals.baseUrl`

---

## 3.2 Hardcoded `.co.il` references to update

| File | What to change |
|------|----------------|
| `app.js` | `CANONICAL_DOMAIN` |
| `controllers/leadController.js` | `DEFAULT_SITE_ORIGIN` |
| `controllers/pdfController.js` | `baseUrl` (2 occurrences) |
| `email-templates/berlin-strategy-email-de.html` | Links in email body |
| `email-templates/berlin-strategy-email-en.html` | Links in email body |
| `email-templates/website-announcement.html` | Links |
| `email-templates/website-announcement-de.html` | Links |
| `public/llms.txt` | Site URL if listed |
| `.env` | `SMTP_FROM` — decide if email stays `@sweet-home.co.il` or moves |

- [ ] All files above audited and updated (or documented as intentionally unchanged)
- [ ] Grep repo for `sweet-home.co.il` — zero unintended remaining references

```bash
# Run before go-live:
rg "sweet-home\.co\.il" --glob "!seo-redirect-map*" --glob "!docs/*" --glob "!SEO reports/*"
```

---

## 3.3 Internal links

- [ ] Menu / header links use relative paths or `.de` (not absolute `.co.il`)
- [ ] Footer links updated
- [ ] Blog post content: audit for hardcoded `.co.il` in HTML (DB content may need SQL find/replace)
- [ ] Property/project descriptions in DB: check for absolute `.co.il` URLs
- [ ] CTA buttons on landing pages (Berlin strategy, district pages, etc.)
- [ ] `localePath()` helper produces correct paths (no domain hardcoding)

---

## 3.4 `.co.il` → `.de` redirect middleware

Add at top of request pipeline (or configure at Render/nginx level):

```
IF request.host == 'sweet-home.co.il' OR 'www.sweet-home.co.il':
  301 → https://sweethome-immobilien.de{req.path}{req.query}
```

- [ ] Redirect middleware implemented
- [ ] Preserves path exactly
- [ ] Preserves query string exactly
- [ ] Single hop (no chains)
- [ ] `.co.il` admin/API routes still work OR redirect appropriately (decide: redirect admin too?)
- [ ] Test with `curl -I` for 10 URLs

**Implementation notes:**

---

## 3.5 Sitemap

- [ ] `/sitemap.xml` generates only `sweethome-immobilien.de` URLs
- [ ] Remove references to old broken sitemaps (`content-hub`, `berlin.` sitemaps per SEO plan)
- [ ] `robots.txt` points to `.de` sitemap:
  ```
  Sitemap: https://sweethome-immobilien.de/sitemap.xml
  ```
- [ ] No Spanish URLs in sitemap if dropping `/es`
- [ ] No `/de/` prefixed URLs in sitemap (retired prefix)

**File:** `app.js` (`/sitemap.xml` route, `/robots.txt` route)

---

## 3.6 Spanish removal (if approved in Phase 0)

- [ ] `/es/*` routes return 301 to German equivalent OR 410
- [ ] Remove `/es` from language switcher UI
- [ ] Remove `es-es` from hreflang
- [ ] Remove Spanish URLs from sitemap
- [ ] Keep `locales/es.json` in repo if needed for legacy content references
- [ ] Update any Spanish Meta ad landing pages before go-live

---

## 3.7 Staging deployment & self-test

- [ ] Deploy to staging with `.de` as canonical (redirects **disabled** initially)
- [ ] Browse 20 key pages on staging `.de` — check canonical, hreflang, titles, schema
- [ ] Enable redirects on staging; test 30 sample URLs (Phase 4)
- [ ] Fix any issues before production go-live

---

# PHASE 4 — Pre-launch testing (30 URL sample)

*SEO consultant requirement: test ~30 URLs before AND after go-live.*

## 4.1 Sample URL checklist

For **each** URL below, verify columns A–F.

| # | URL type | Example path | `.co.il` → 301? | `.de` returns 200? | Canonical = `.de` self? | hreflang OK? | No `.co.il` internal links? |
|---|----------|--------------|-------------------|---------------------|-------------------------|--------------|----------------------------|
| 1 | Homepage DE | `/` | [ ] | [ ] | [ ] | [ ] | [ ] |
| 2 | Homepage EN | `/en` | [ ] | [ ] | [ ] | [ ] | [ ] |
| 3 | About | `/about` | [ ] | [ ] | [ ] | [ ] | [ ] |
| 4 | Contact | `/contact` | [ ] | [ ] | [ ] | [ ] | [ ] |
| 5 | Properties list | `/properties` | [ ] | [ ] | [ ] | [ ] | [ ] |
| 6 | Property detail | `/properties/{slug}` | [ ] | [ ] | [ ] | [ ] | [ ] |
| 7 | Projects list | `/projects` | [ ] | [ ] | [ ] | [ ] | [ ] |
| 8 | Project detail | `/projects/{slug}` | [ ] | [ ] | [ ] | [ ] | [ ] |
| 9 | Blog list | `/blog` | [ ] | [ ] | [ ] | [ ] | [ ] |
| 10 | Blog post | `/blog/{slug}` | [ ] | [ ] | [ ] | [ ] | [ ] |
| 11 | Berlin main landing | `/wohnungen-berlin-kaufen` | [ ] | [ ] | [ ] | [ ] | [ ] |
| 12 | District landing | `/wohnung-kaufen-moabit` | [ ] | [ ] | [ ] | [ ] | [ ] |
| 13 | Berlin strategy DE | `/berlin-mieterstrategie` (or current slug) | [ ] | [ ] | [ ] | [ ] | [ ] |
| 14 | Berlin strategy EN | `/en/berlin-tenant-occupied-entry-strategy` | [ ] | [ ] | [ ] | [ ] | [ ] |
| 15 | Dubai landing | `/properties-for-sale-dubai` | [ ] | [ ] | [ ] | [ ] | [ ] |
| 16 | Cyprus landing | `/properties-for-sale-cyprus` | [ ] | [ ] | [ ] | [ ] | [ ] |
| 17 | Filter URL | `/properties?country=Germany&city=Berlin` | [ ] | [ ] | [ ] | [ ] | [ ] |
| 18 | Pagination | `/blog?page=2` | [ ] | [ ] | [ ] | [ ] | [ ] |
| 19 | Legacy `/de/` URL | `/de/about` | [ ] | [ ] | [ ] | [ ] | [ ] |
| 20 | Legacy `/de/en` URL | `/de/en/...` | [ ] | [ ] | [ ] | [ ] | [ ] |
| 21 | Legacy `/es/` URL | `/es/...` | [ ] | [ ] | [ ] | [ ] | [ ] |
| 22 | Old typo slug | (from redirect map) | [ ] | [ ] | [ ] | [ ] | [ ] |
| 23 | GSC 404 URL | (from consultant list) | [ ] | [ ] | [ ] | [ ] | [ ] |
| 24 | `?page=1` URL | `/blog?page=1` | [ ] | [ ] | [ ] | [ ] | [ ] |
| 25 | Sitemap | `/sitemap.xml` | [ ] | [ ] | [ ] | N/A | N/A |
| 26 | robots.txt | `/robots.txt` | [ ] | [ ] | [ ] | N/A | N/A |
| 27–30 | *(add from URL map)* | | [ ] | [ ] | [ ] | [ ] | [ ] |

## 4.2 Automated checks

- [ ] Run `npm run seo:validate-redirects` against updated redirect map (`.de` targets)
- [ ] Screaming Frog crawl on `.de` — no redirect chains > 1 hop
- [ ] Screaming Frog crawl — no internal links to `.co.il`
- [ ] Google Rich Results Test on homepage
- [ ] Mobile-friendly test on key landing pages

---

# PHASE 5 — Go-live (execute in this order)

| Step | Action | Owner | Done | Date |
|------|--------|-------|------|------|
| 1 | Final backup / DB snapshot | Dev | [ ] | |
| 2 | Deploy production code (`.de` canonical) | Dev | [ ] | |
| 3 | Enable `.co.il` → `.de` 301 redirects | Dev | [ ] | |
| 4 | Re-run 30 URL test on **production** | Dev + SEO | [ ] | |
| 5 | Publish `/sitemap.xml` on `.de` | Dev | [ ] | |
| 6 | Submit sitemap in GSC (`.de` property) | SEO | [ ] | |
| 7 | **Google Search Console → Change of Address** (`.co.il` → `.de`) | SEO | [ ] | |
| 8 | Update GA4 (note cutover date in reports) | SEO | [ ] | |
| 9 | Update Google Business Profile website URL | Business | [ ] | |
| 10 | Update Meta Ads landing page URLs | Business | [ ] | |
| 11 | Update email signatures / templates | Business | [ ] | |
| 12 | Update Zapier / webhook URLs if any | Dev | [ ] | |
| 13 | Notify team: migration is live | All | [ ] | |
| 14 | Upload disavow file on `.de` GSC property | SEO | [ ] | |

**Go-live actual date:** _______________

---

# PHASE 6 — Post-launch monitoring

## Week 1 (daily checks)

- [ ] GSC `.de` property: Coverage errors, new 404s, redirect errors
- [ ] GSC `.co.il` property: impressions declining (expected)
- [ ] Re-crawl site — any internal links still pointing to `.co.il`?
- [ ] GA4: traffic arriving on `.de` hostname
- [ ] Lead forms submit successfully (contact, property, seller, Berlin strategy)
- [ ] Email notifications still deliver
- [ ] Fix any redirect mistakes immediately

**Week 1 notes:**

---

## Weeks 2–4 (weekly checks)

- [ ] `.de` indexed page count growing in GSC
- [ ] No increase in soft-404 or redirect loop errors
- [ ] Rankings: expect temporary dip — track recovery
- [ ] `contact_form_submit` events counting correctly in GA4
- [ ] Address any new 404s from consultant crawl

---

## Weeks 4–8 (bi-weekly checks)

- [ ] Rankings stabilizing / recovering toward pre-migration levels
- [ ] Non-branded impressions trend (SEO consultant Month 3 KPI)
- [ ] Confirm `.co.il` redirects still live (do not remove)

---

## Ongoing (permanent)

- [ ] Keep `sweet-home.co.il` → `sweethome-immobilien.de` 301 redirects **live indefinitely**
- [ ] Never remove redirects even after rankings fully recover
- [ ] Add new redirect rules to `seo-redirect-map-*.csv` as needed

---

# ROLLBACK PLAN

*Use only if critical failure within first 48 hours of go-live.*

| Step | Action |
|------|--------|
| 1 | Disable `.co.il` → `.de` redirect middleware (or remove Render redirect rule) |
| 2 | Revert `CANONICAL_DOMAIN` / `APP_URL` to `sweet-home.co.il` |
| 3 | Redeploy previous known-good release |
| 4 | Verify `.co.il` serves site as primary again |
| 5 | Document what failed; fix on staging before retry |

- [ ] Rollback procedure documented and tested on staging
- [ ] Rollback contact: _______________

---

# 3-MONTH CONTENT ROADMAP (after technical foundation)

*From SEO consultant roadmap — begins after migration stabilizes.*

## Weeks 3–4 — Priority content

- [ ] Optimise main Berlin buy page (`/wohnungen-berlin-kaufen`); build Berlin hub
- [ ] Optimise district pages with real inventory (unique local content, not templated)
- [ ] German language QA on key pages (noun capitalization, machine-translation fixes)
- [ ] In-content internal links from blog posts to money pages (internal link map)
- [ ] First tool: Mietrendite or Kaufnebenkosten calculator

## Weeks 5–6 — Elevated content

- [ ] Investor guides: Kapitalanlage, Grunderwerbsteuer, Grundbuch, Ablauf Immobilienkauf, Immobilienpreise Berlin
- [ ] Refresh top posts (hidden costs → Kaufnebenkosten; investment guide)
- [ ] Valuation tool (seller leads)
- [ ] English pages and guides for international buyers

## Weeks 7–12 — Ongoing (Months 2–3)

- [ ] More guides and tools
- [ ] New-listing email alerts
- [ ] Earn quality links from Berlin and expat sites
- [ ] Monitor migration recovery
- [ ] SEO consultant: tasks every two weeks + quarterly report

## Month 3 success criteria

- [ ] Technical errors fixed and verified
- [ ] Site moved to `.de` cleanly; rankings recovered (no net losses)
- [ ] Lead tracking fixed; leads measured accurately
- [ ] Berlin pages and first tools live and indexed
- [ ] Early signal: non-branded impressions rising; Berlin keywords entering top 20
- [ ] *(Not expected yet: big traffic/lead jump — that is post-foundation growth phase)*

---

# EXTERNAL SYSTEMS TO UPDATE AT GO-LIVE

| System | Current URL / setting | New value | Updated? |
|--------|----------------------|-----------|----------|
| Google Search Console | `sweet-home.co.il` | Add `.de` + Change of Address | [ ] |
| Google Analytics 4 | | Note cutover date | [ ] |
| Google Business Profile | Website field | `sweethome-immobilien.de` | [ ] |
| Meta Ads — all campaigns | Landing URLs | `.de` equivalents | [ ] |
| Meta Pixel / CAPI | Domain verification? | Verify on `.de` | [ ] |
| Zapier webhooks | | Audit | [ ] |
| Email SMTP / FROM | `Site@sweet-home.co.il` | Decide if unchanged | [ ] |
| Lead notification emails | `utils/leadNotificationSettings.js` | Audit links in templates | [ ] |
| PDF exports | `pdfController.js` | Update `baseUrl` | [ ] |
| `public/llms.txt` | | Update site URL | [ ] |
| Social media bios / link-in-bio | | `.de` | [ ] |
| Any printed materials / QR codes | | `.de` | [ ] |

---

# RISKS & MITIGATIONS

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Temporary ranking dip (2–8 weeks) | High | Medium | Expected; don’t migrate during peak campaigns |
| Broken redirects / wrong targets | Medium | High | 30-URL test pre/post; redirect map; `seo:validate-redirects` |
| Duplicate indexing during transition | Medium | Medium | Canonical on `.de` + 301 from `.co.il` |
| Analytics discontinuity | Medium | Medium | Note cutover date; cross-domain tracking if needed |
| Lead form / email breakage | Low | High | Test all forms day 1 post-launch |
| Spanish lead loss (if dropping `/es`) | Medium | Business | Confirm decision in Phase 0 |
| Email domain confusion (`.co.il` email on `.de` site) | Low | Low | Document decision; email domain can stay separate |

---

# RELATED INTERNAL DOCUMENTS

| Document | Purpose |
|----------|---------|
| `docs/DE_DEFAULT_EN_PREFIX_MIGRATION_IMPLEMENTATION.md` | DE-default URL structure (`/` = DE, `/en` = EN) |
| `seo-redirect-map-2026-04-28.csv` | High-value 301/410 redirect rules |
| `scripts/validate-redirect-map.js` | Validate redirect map (`npm run seo:validate-redirects`) |
| `DEVELOPER_ROLE_SWITCHING.md` | Dev account role switching (unrelated but in repo) |
| SEO consultant: `Sweet_Home_Technical_2Weeks.docx` | Source technical plan |
| SEO consultant: `Sweet_Home_3-months-Roadmap.docx` | Source content roadmap |
| SEO consultant: `Sweet_Home_Technical_Fixes.xlsx` | 16-item task tracker |

---

# CHANGE LOG

| Date | Change | By |
|------|--------|-----|
| July 2026 | Initial playbook created from SEO consultant docs + codebase audit | Dev |
| 2026-07-15 | Ronli confirmed he will flip `.de` DNS on go-live (do not ask him until go-live) | Dev |
| 2026-07-15 | **Fix #10 DONE** — doubled-brand titles fixed + live validated (21/21 PASS) | Dev |
| 2026-07-15 | **Fix #11 DONE** — language-correct titles/H1 on DE/EN/ES static pages + projects/services | Dev |
| 2026-07-15 | **Fix #12 DONE** — meta descriptions restored + localized; live validated (home/projects/about/contact/cookies DE/EN/ES) | Dev |
| 2026-07-16 | **Fix #13 schema DONE** — Organization + WebSite graph live validated on DE/EN/ES with 0 errors/warnings | Dev |
| 2026-07-17 | **Fix #13 Berlin focus DONE (code)** — Full-width localized Berlin hero plus Berlin-first properties, districts, projects, and clean internal links; international markets moved below | Dev |
| 2026-07-17 | **Fix #13 CLOSED** — Interactive Berlin map under search, Dubai/Cyprus landing-page CTAs, and final hero polish approved; Berlin-first homepage decision logged | Dev |
| 2026-07-17 | **Fix #14 DONE** — Over-optimised district/hub link dumps trimmed to 3–5 useful links; Indexierung copy removed | Dev |
| 2026-07-18 | **Fix #15 code DONE** — GA4 page_view double-fire fixed in `analytics.js`; `contact_form_submit` verified via `scripts/ga4-contact-event-check.js` | Dev |
| 2026-07-20 | **Fix #15 CLOSED** — Live production validated on `/contact`: 0 events on load, 1 config (no double page_view), 1 `contact_form_submit` after successful submit | Dev |
| 2026-07-20 | **Fix #6 DONE** — Stopped `/de/en` & `/es/en` hreflang generation; catch-all 301s to `/en/*` | Dev |
| 2026-07-20 | **Fix #5 DONE** — Projects/blog filter+topic noindex with clean canonicals; properties `page=1` 301; local verification PASS | Dev |
| 2026-07-21 | **Fix #7 non-Spanish DONE** — Loaded Adi’s GSC 404 classification: 261×301 + 71×410 via `seo404Classification` middleware; 112 `/es` rows deferred to Spanish removal | Dev |
| | **Next:** Deploy + live spot-check #7; then Spanish removal (+ deferred `/es` 404s); then go-live checklist with SEO | |
