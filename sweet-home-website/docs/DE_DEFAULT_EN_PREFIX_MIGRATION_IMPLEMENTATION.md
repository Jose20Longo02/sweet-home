# DE Default URL Migration Implementation Guide

## Objective

Migrate public URL language structure from:

- EN default (no prefix), DE `/de`, ES `/es`

to:

- DE default (no prefix), EN `/en`, ES `/es`

while preserving SEO equity and avoiding redirect loops or indexing instability.

## Scope

This migration affects:

- Public routing
- Language detection and persistence
- Language switcher URL generation
- Canonical and hreflang generation
- Sitemap generation
- Redirect rules and legacy URL cleanup
- QA and post-launch monitoring

## Success Criteria

- Non-prefixed public URLs render German content.
- English public URLs resolve under `/en/...` only.
- Spanish remains under `/es/...`.
- All old EN non-prefixed URLs 301 to their `/en/...` equivalents (single-hop).
- Canonical/hreflang are consistent and language-correct.
- No increase in redirect loops, soft 404, or accidental 404s.

---

## Phase 1 - Pre-Implementation Baseline

1. Export current indexed URL sets from GSC (by language where possible).
2. Snapshot current sitemap output.
3. Record current traffic baseline (last 28 days):
   - clicks
   - impressions
   - top landing pages
4. Freeze unrelated URL changes during migration.

---

## Phase 2 - Code Changes (File-by-File)

## 2.1 `config/i18n.js`

Update language resolution policy to:

- `/es` and `/es/*` => `es`
- `/en` and `/en/*` => `en`
- all other public non-prefixed routes => `de`
- cookie fallback only for non-public/internal routes if needed

Also update `res.locals.localePrefix` behavior:

- no prefix for DE
- `/en` for EN
- `/es` for ES

## 2.2 `app.js`

### A) Locale routers

- Add `/en` locale router mount (same pattern as `/es` today).
- Keep `/es` router.
- Keep non-prefixed routes as DE rendering routes.

### B) `localeAlternatePaths` generation middleware

Refactor alternate path logic to new convention:

- `de` => non-prefixed path
- `en` => `/en` + normalized public path
- `es` => `/es` + normalized public path

For page-specific alternates (Berlin, Dubai, Cyprus, district pages), explicitly map all three locales to new targets.

### C) Legacy redirects

Create one-to-one 301 rules:

- old EN non-prefixed public URLs -> `/en/...` equivalents
- preserve query string
- avoid redirect chains

Keep DE non-prefixed canonical (do NOT redirect DE non-prefixed to `/de`).

### D) `/lang/:code` endpoint

Keep as fallback utility, but ensure language switcher uses direct URL paths for public pages.

## 2.3 `routes/localeRoutes.js`

Ensure router supports `/en/*` the same way it currently supports `/de` or `/es` equivalents.

If route-specific canonical URLs are built using `req.baseUrl`, confirm `/en` is handled correctly.

## 2.4 `views/partials/lang-switcher.ejs`

Enforce URL-based switching for public pages:

- DE -> non-prefixed equivalent
- EN -> `/en/...`
- ES -> `/es/...`

Preserve query and hash where appropriate.

Only use `/lang/:code` fallback on internal/auth/admin routes.

## 2.5 SEO head partials (`views/partials/seo/*.ejs`)

Validate/adjust page path maps that currently assume EN non-prefixed default:

- `berlin-properties-head.ejs`
- `dubai-properties-head.ejs`
- `cyprus-properties-head.ejs`
- district head partials
- villas head partials
- blog head partials (if locale path logic exists)

Ensure canonical/hreflang output uses:

- DE non-prefixed
- EN `/en/...`
- ES `/es/...`

## 2.6 `controllers/propertyController.js` and other controllers

Check URL dictionaries passed to views (e.g., `*_urls`, `*_pagePaths`, `hreflangAlternates`) and convert EN targets to `/en/...` equivalents where needed.

## 2.7 Sitemap generation (`app.js` sitemap section)

Regenerate static and dynamic URL entries so:

- DE URLs are non-prefixed
- EN URLs are prefixed `/en`
- ES URLs remain `/es`

Remove deprecated EN non-prefixed duplicates from sitemap output.

---

## Phase 3 - Redirect Mapping Rules

Define deterministic transformations:

- `/about` (old EN) -> `/en/about`
- `/services` -> `/en/services`
- `/properties-for-sale-berlin` -> `/en/properties-for-sale-berlin` (or canonical EN mapped slug if changed)
- `/properties/:slug` -> `/en/properties/:slug` (if route is public EN equivalent)
- `/blog/:slug` -> `/en/blog/:slug`

Exceptions:

- DE canonical non-prefixed URLs should not redirect to `/de`.
- Internal/admin/auth/api routes are excluded.

---

## Phase 4 - QA Checklist (Must Pass Before Release)

## 4.1 Routing / rendering

- Home page renders DE at `/`.
- EN home renders at `/en`.
- ES home renders at `/es`.
- Representative pages for property/project/blog list+detail resolve for all locales.

## 4.2 Language switcher

From each tested page:

- DE -> EN -> ES switches to correct URL and language content.
- No fallback to wrong language due to cookie.

## 4.3 Redirect integrity

- EN old non-prefixed URLs return 301 to `/en/...`.
- No redirect loops.
- No multi-hop redirect chains.

## 4.4 SEO tags

On representative pages:

- canonical matches current locale URL
- hreflang has exactly correct DE/EN/ES alternates
- `x-default` policy remains consistent (if used)

## 4.5 Crawl sanity

Run a crawl and confirm:

- 0 redirect loops
- expected 301s only
- no new 404s on key pages
- no conflicting canonicals

---

## Phase 5 - Deployment and Monitoring

1. Deploy in low-traffic window.
2. Submit updated sitemap in GSC.
3. Inspect sample URLs in GSC (DE/EN/ES).
4. Monitor daily for first 7 days:
   - coverage changes
   - redirect error reports
   - indexed pages by locale
   - clicks/impressions by locale landing pages

---

## Rollback Plan

If severe regression is detected:

1. Revert migration commit.
2. Restore previous sitemap.
3. Keep temporary redirect guards to avoid broken links.
4. Re-run QA on restored routing.

---

## Implementation Notes

- Make migration in one coherent release branch to avoid mixed URL states.
- Do not launch partial routing changes without canonical/hreflang updates.
- Keep redirect mapping explicit for high-value pages first (hubs, districts, blog, property/project detail).

---

## Progress Tracker

- [ ] Phase 1 baseline complete
- [ ] `config/i18n.js` updated
- [ ] `app.js` locale routing + alternates + redirects updated
- [ ] `routes/localeRoutes.js` EN router support verified
- [ ] `lang-switcher.ejs` updated to DE default mapping
- [ ] SEO head partials updated
- [ ] Controllers URL maps updated
- [ ] Sitemap updated
- [ ] QA checklist completed
- [ ] Deployed
- [ ] GSC validation complete

