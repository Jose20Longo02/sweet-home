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
| Dev | | Code, deploy, redirects |
| SEO consultant | | GSC, crawl, disavow, Change of Address |
| Business (Israel / Irem) | | Spanish removal, homepage positioning, go-live date |

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

- [ ] DNS access: `sweethome-immobilien.de`
- [ ] DNS access: `sweet-home.co.il` (keep active)
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
- [ ] **Remove district page over-optimised link blocks** — confirm trimming to 3–5 links is acceptable
- [ ] Rollback owner identified (who can revert deploy within 48h if needed)

**Decisions log:**

| Decision | Approved by | Date | Notes |
|----------|-------------|------|-------|
| Drop `/es` | | | |
| Go-live date | | | |
| Homepage Berlin-first | | | |

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

### Fix 10 — Doubled-brand titles (18 pages)

- [ ] Identify all 18 affected URLs (request list from SEO consultant)
- [ ] Fix title template so brand is appended only once (not `Sweet Home | Sweet Home`)
- [ ] Check SEO head partials and layout title logic
- [ ] Re-crawl / verify no duplicate brand in `<title>`

**Done when:** No title contains doubled brand name.  
**Owner:** Dev  
**Files likely involved:** `views/partials/seo/*-head.ejs`, layout files

---

### Fix 11 — Language-correct titles and H1

- [ ] German static pages show German `<title>` and H1 (e.g. `/about`, `/contact`, `/cookies`)
- [ ] Fix any English meta titles on German-default pages
- [ ] Spanish pages: N/A if dropping `/es`

**Done when:** DE pages show German title and H1.  
**Owner:** Dev  
**Files likely involved:** `routes/localeRoutes.js`, `locales/de.json`, SEO head partials

---

### Fix 12 — Missing meta descriptions

- [ ] Audit indexable pages missing `meta description`
- [ ] Add unique descriptions for: EN home, `/projects`, others flagged in crawl
- [ ] German homepage description in German

**Done when:** No indexable page missing a description.  
**Owner:** Dev + SEO (copy)

---

### Fix 13 — Homepage Organization + WebSite schema + Berlin focus

- [ ] Add `Organization` JSON-LD on homepage
- [ ] Add `WebSite` JSON-LD on homepage (with `SearchAction` if applicable)
- [ ] Validate in Google Rich Results Test
- [ ] **Business decision:** Reorder homepage to lead with Berlin content (coordinate with Israel/Irem)

**Done when:** Rich Results Test passes; Berlin content prioritized per business approval.  
**Owner:** Dev (+ business for content order)  
**Files likely involved:** `views/partials/seo/home-head.ejs`, `views/home.ejs`

---

### Fix 5 — Filter and pagination duplicates (~729 URLs)

- [ ] `?country=`, `?city=`, `?neighborhood=` filter URLs → canonical to clean landing page OR noindex
- [ ] `?page=` pagination → canonical rules (page 1 strips param; page 2+ canonical self or noindex per strategy)
- [ ] `?topic=` on blog → canonical or noindex
- [ ] Confirm only “clean” URLs are indexable in GSC after fixes

**Done when:** GSC shows only clean pages as indexable candidates.  
**Owner:** Dev  
**Files likely involved:** `propertyController.js`, `blogController.js`, Berlin/Dubai/Cyprus landing controllers

---

### Fix 6 — Broken language URLs (`/de/en`, `/es/en` — ~100 URLs)

- [ ] Stop generating `/de/en` and `/es/en` URLs in language switcher / routing
- [ ] 301 existing `/de/en/*` → correct `/en/*` or `/`
- [ ] 301 existing `/es/en/*` → correct URL
- [ ] Verify no `/de/en` or `/es/en` return HTTP 200

**Done when:** No broken language combo URLs resolve 200.  
**Owner:** Dev  
**Files likely involved:** `app.js`, i18n middleware, language switcher partials

---

### Fix 7 — Old dead URLs (~530 legacy 404 / soft-404)

- [ ] Merge consultant URL list with GSC “Not found” export
- [ ] Apply 301 for true equivalents, 410 for permanently removed content
- [ ] Avoid mass-redirecting everything to homepage (bad practice)
- [ ] Update `seo-redirect-map-2026-04-28.csv` and validate

**Done when:** Sample of legacy URLs return 410 or 301, not soft-404.  
**Owner:** Dev + SEO  
**Files likely involved:** `app.js`, `seo-redirect-map-2026-04-28.csv`, `scripts/validate-redirect-map.js`

---

### Fix 14 — Remove over-optimised link block on district pages

- [ ] Identify district pages with long `berlin-areas` internal link lists
- [ ] Remove link list + “Indexierung” style sentence
- [ ] Keep 3–5 genuinely useful internal links per page
- [ ] Re-test page quality / internal link equity

**Done when:** Block and sentence removed; 3–5 useful links remain.  
**Owner:** Dev  
**Files likely involved:** `views/properties-for-sale-berlin.ejs`, `views/properties-berlin-district-de.ejs`, district landing templates

---

### Fix 15 — Contact form tracking (`contact_form_submit`)

- [ ] Test in GA4 DebugView: submit real contact form on staging/production
- [ ] Confirm event fires **once** only on successful submission (not on page load / failed submit)
- [ ] Fix double-fire or false-positive if present
- [ ] Document event in GA4 for consultant verification

**Done when:** GA4 DebugView shows one event after a real successful submit.  
**Owner:** Dev  
**Files likely involved:** `controllers/leadController.js`, `routes/leadRoutes.js`, contact form JS on `views/home.ejs` / contact pages

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
| July 2026 | Initial playbook created from SEO consultant docs + codebase audit | |
| | | |
| | | |
