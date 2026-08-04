# Sweet Home — Post-Migration Work Guide (Adi pack)

**Domain:** `sweethome-immobilien.de`  
**Focus:** Berlin / German SEO + content  
**Created:** August 2026  
**Status cadence:** Weekly email update to Adi  

### Source documents (Adi, Aug 2026)

| File | What it covers |
|------|----------------|
| `Sweet_Home_Dev_Tasks_post-migration.docx` | First-stretch developer + content tasks |
| `Sweet_Home_Blog_Best_Practices.docx` | Checklist for improving / writing Berlin posts |
| `Sweet_Home_Internal_Link_Map.xlsx` | Exact in-content links to add |
| `Sweet_Home_Pages_and_Keywords_Berlin.xlsx` | Page/keyword map (exists vs create) |
| `Sweet_Home_Migration_Fixes_Now.docx` | **HIGH PRIORITY** post-migration integrity fixes (P1–P3) — received 2026-08-04 |

Related internal doc: [`DOMAIN_MIGRATION_PLAYBOOK.md`](./DOMAIN_MIGRATION_PLAYBOOK.md) (go-live / redirects / GSC).

---

## How to use this document

- **Current priority:** Phase C **done in code** (deploy needed for H1 + money district link updates). Next: Phase M P2/P3 or Phase B #4+.
- Check boxes as you go: `- [ ]` → `- [x]`.
- Blog drafts #1–3 were reviewed by Adi (2026-08-04) — **publish her edited versions to live**.
- For **next** blog posts, apply Adi’s feedback pattern (see Phase B notes below) before sending for review.
- Cyprus / Dubai content is **off-focus** — deprioritize; no internal-link work there.

### Key contacts

| Role | Name | Notes |
|------|------|-------|
| Dev / delivery | Luis / José / Medialy | Code, drafts, QA, weekly status |
| SEO consultant | Adi | Reviews DE drafts; GSC monitoring; migration QA |
| Business | Israel / team | Approvals as needed |

### Standing rules from Adi

1. Weekly status by email is enough (she is in Asia for ~1 month).
2. Use AI to help with content — but quality must read as natural German, not machine-translated.
3. Goal for blog work: be the **best answer for the keyword**, not just “exist.”
4. **Blog tone / craft (apply to all next posts — Adi 2026-08-04):**
   - Friendlier, less technical — written for a real buyer, not like a tax form
   - Title + excerpt: keep keyword, more inviting; put **one number in the excerpt** for CTR
   - Internal links: woven into running text (not a list block); anchor = target page’s keyword
   - Sources: link a credible source for figures; wording accuracy (e.g. “gesetzliche Maklerkostenteilung (Dezember 2020)” not “Bestellerprinzip”)
   - Capitalize German nouns; clear CTA
   - **GEO / AI:** mention brand **“Sweet Home Berlin”** a few more times in the text

---

## Priority order (updated 2026-08-04)

1. ~~Phase M P1 (301 + cache + sample)~~ ✅ 2026-08-04  
2. ~~Publish Adi-approved blog drafts #1–3 to live~~ ✅ 2026-08-05  
3. ~~Phase C headings + money page~~ ✅ code 2026-08-05 (deploy)  
4. Continue Phase B remaining posts (with Adi’s craft rules)  
5. Phase M P2 (TTFB) + P3 (on-page)  
6. Phase G page creates / keyword map  

---

# Phase M — Migration Fixes Now (HIGH PRIORITY)

**Source:** `Sweet_Home_Migration_Fixes_Now.docx` (Adi, 2026-08-04)  
**Rule:** Prioritise **P1** before other SEO/content work.

## P1 — Migration integrity (today)

- [x] **Change all redirects from 302 → 301.** App middleware already uses `res.redirect(301, …)` (`middleware/domainRedirect.js`). Live re-check **2026-08-04:** Adi’s sample URLs (and full phase4-sample) return **301** to matching `.de` URLs — **no 302** observed.  
  **Done when:** sample old URLs return **301** (not 302) to the matching `.de` URL. ✅

- [x] **Purge CDN / edge cache on `sweet-home.co.il`.** Live re-check **2026-08-04:** `/`, `/en`, `/blog` (and `?cachebust=1` variants) all return **301 to `.de`** — no **200 old HTML**. Stale edge cache Adi saw earlier is **not reproducible** from this check (`CF-Cache-Status: DYNAMIC`). If Adi’s region still sees 200s, Ronli should still **purge Cloudflare** for `sweet-home.co.il` as belt-and-suspenders.  
  **Done when:** all three return a **301 to `.de` with no query string**, from a cold client. ✅ (from our probe)

- [x] **Re-run the 30-URL sample check** — report: [`docs/migration-p1-redirect-sample-2026-08-04.md`](./migration-p1-redirect-sample-2026-08-04.md) (**33 URLs**, 32 exact PASS + 1 www→apex CHAIN). **Send that file / summary to Adi.**  
  **Done when:** sample output shared and every URL is a clean **1:1 301**. ✅ (www is two-hop 301: Cloudflare www→apex, then apex→`.de`)

| Item | Owner | Date | Notes |
|------|-------|------|-------|
| 302 → 301 | Dev | 2026-08-04 | Live = 301; no code change needed |
| CDN purge `.co.il` | Dev verified; Ronli if Adi still sees stale | 2026-08-04 | Apex `/` `/en` `/blog` already 301 |
| 30-URL re-check + send Adi | Dev | 2026-08-04 | See `migration-p1-redirect-sample-2026-08-04.md` |

## P2 — Server speed

- [ ] **TTFB 1.5–2.0s** on `/wohnungen-berlin-kaufen` and `/wohnung-kaufen-*` district pages. Blog posts ~0.45s; old domain ~0.21s in July crawl → listing query likely **uncached** on new domain.  
  **Done when:** TTFB **under 800ms** on money page and district pages.

| Item | Owner | Date | Notes |
|------|-------|------|-------|
| Listing/district page TTFB | | | Cache query, optimize SQL, or edge cache HTML |

## P3 — On-page

- [ ] **Homepage:** 13 of 29 images have no `alt` — add descriptive **German** alt text  
- [ ] **Homepage:** 3 empty `<h2>` tags — remove or fill  
- [ ] **Footer on German pages** mixes languages (`Regions`, `Log in`, `Register`, `Forgot password?`, `Support`, `Funktionen`) — localize to German  
- [ ] **`/es/*` redirects to homepage** instead of 1:1 — map to closest DE/EN or return **410** (low priority; Spanish dropped)  

**Done when:** homepage images have alt text, empty H2s gone, German footer reads in German. (`/es/*` fixed or noted.)

| Item | Owner | Date | Notes |
|------|-------|------|-------|
| Homepage alts + empty H2s | | | |
| DE footer i18n | | | Partial work already in Phase D — finish full DE labels |
| `/es/*` 1:1 or 410 | | | Low priority |

---

# Phase A — Bug: German related-posts titles

**Done when:** On a German blog post, suggested/related posts show **German titles** (not English), and links still go to the German posts.

- [x] Related/suggested posts box on DE blog pages shows the German title of each post
- [x] Prefer on-focus Berlin posts; avoid suggesting off-focus posts (e.g. Paphos / Cyprus) on Berlin pages when possible

**Notes / owner / date:**

| Item | Owner | Date | Notes |
|------|-------|------|-------|
| Related titles fix | Luis | 2026-08-03 | Fixed in `blogController.showPublic`: localize via `title_i18n[lang]`; same-geo filter for recommendations |

---

# Phase B — Improve top Berlin blog posts (drafts)

Use **Phase E checklist** + **Phase F internal link map**. Start with these 6, then the rest.

**Done when:** First 6 are improved as drafts (content + structure + FAQ where fit + in-content internal links) and shared with Adi; remaining posts follow after.

### First 6 (priority)

| # | URL slug | Target keyword / role | Status |
|---|----------|----------------------|--------|
| 1 | `/blog/hidden-costs-of-buying-property-in-berlin` | Kaufnebenkosten Berlin | [x] **Published live** DE (`*_i18n.de`) 2026-08-05 |
| 2 | `/blog/berlin-real-estate-investment-guide-2026` | Investor pillar | [x] **Published live** DE 2026-08-05 |
| 3 | `/blog/how-foreigners-can-buy-property-in-berlin` | Foreign buyers (strengthen EN too) | [x] **Published live** DE 2026-08-05 (EN strengthen later) |
| 4 | `/blog/best-berlin-districts-for-property-investment` | Districts for investment | [ ] Draft ready |
| 5 | `/blog/what-to-check-before-buying-an-apartment-in-berlin` | Pre-purchase checks | [ ] Draft ready |
| 6 | `/blog/berlin-rental-laws-explained-for-property-buyers` | Rental laws / investors | [ ] Draft ready |

### Next wave (after first 6)

| # | URL slug | Notes | Status |
|---|----------|-------|--------|
| 7 | `/blog/new-build-vs-altbau-in-berlin-which-is-better` | + district / money links | [ ] |
| 8 | `/blog/best-berlin-districts-for-families` | + district / money links | [ ] |
| 9 | `/blog/how-smart-investors-buy-berlin-at-a-40-discount` | Reframe “40% discount” angle | [ ] |

**Hand-off:** Drafts #1–3 **published to live** DE via `*_i18n.de` (2026-08-05). For posts #4+, apply her craft rules, keep as draft until review.

**Publish checklist (drafts → live):**
- [x] Sync Adi’s edited CMS draft content into live posts’ `*_i18n.de` (Kaufnebenkosten first — most edits)
- [x] Spot-check live DE URLs + internal links (titles live; Kaufnebenkosten has Sweet Home Berlin + Maklerkostenteilung, no Bestellerprinzip)
- [x] Archive draft-review posts (renamed `zz-archived-*-draft-review-*`; status stays `draft`)

---

# Phase C — Headings + money page

### C1. Unique H1s on main Berlin pages

Crawl note: no missing H1 / no double H1 — but several listing / category / project pages share a generic H1 (e.g. “Immobilien zum Verkauf in Berlin, Deutschland”).

**Done when:** Main Berlin pages each have a unique, descriptive H1.

- [x] Audit main Berlin listing / hub / money pages for generic shared H1  
  - Money DE `Wohnungen in Berlin kaufen` + district landings already unique  
  - Shared generic H1 was on **property list** (city filter, incl. `?neighborhood=`) and **project list** (raw `Germany` in DE H1)
- [x] Give each main Berlin page a unique H1 (code 2026-08-05; **needs deploy**)  
  - Listing city: `Alle Immobilien in {city}` (≠ money H1)  
  - Listing neighborhood: `Immobilien in {neighborhood}, {city}`  
  - Projects: localized country/city; city H1 `Entwicklungsprojekte in {city}`; neighborhood variant when filtered

### C2. Money page: `/wohnungen-berlin-kaufen`

Content already in place.

**Done when:** Breadcrumb schema valid + district links live.

- [x] Confirm breadcrumb schema is valid — live check 2026-08-05: `BreadcrumbList` Startseite → Wohnungen in Berlin kaufen (required fields present)
- [x] Confirm in-content / structural links to district pages are live — neighborhood grid CTAs already map DE districts; curated “Beliebte Berliner Stadtteile” + best-areas bullets now include/link **Moabit, Mitte, Pankow** (+ Charlottenburg/Neukölln in best-areas). **Needs deploy** for curated/best-areas link updates.
---

# Phase D — Housekeeping + QA cleanup

### D1. Property page housekeeping

**Done when:** Browser console is clean on a property page.

- [x] Remove leftover debug code (`console.log`, etc.)
- [x] Remove forced debug inline styles (e.g. `z-index: 99999` on similar-property links)
- [x] Fix Leaflet source-map warning (don’t load `.js.map` in production, or allow it in CSP)

### D2. QA cleanup (go-live check leftovers)

**Done when:** Fixed, or noted back to Adi with a reason.

- [x] Footer “Regions”: de-emphasize Cyprus / Dubai (Berlin focus)
- [x] Property cards: localize `beds` / `bath` on German pages
- [x] Mitte and Pankow: link to their own pages, not filter URLs
- [x] Footer year: update from 2025 → current year
- [x] FAQ answers on blog + money pages: visible text (not hidden)

**Notes (2026-08-03):**
- Leaflet now served from `/js/libs/leaflet.js` (no sourceMappingURL)
- New pages: `/wohnung-kaufen-berlin-mitte`, `/wohnung-kaufen-pankow`
- Money-page + district FAQs render answers visible by default
- Blog FAQ content lives in CMS HTML (not accordion-hidden); no change needed unless a specific post hides answers

---

# Phase E — Blog best-practices checklist

Use this for every Berlin post improvement or new post. Write in the **page’s own language** (German for German posts).

### 1. Keyword placement
- [ ] One main keyword (from keyword set)
- [ ] Keyword clearly in URL slug, meta title, and H1 (wording can vary slightly)

Example: keyword `Kaufnebenkosten Berlin` → slug `.../kaufnebenkosten-berlin`, title/H1 similar.

### 2. Length and depth
- [ ] Real sentences/paragraphs (not only bullets)
- [ ] Aim ~1,000–1,800 words for buying/investment guides (match topic)
- [ ] Calibrate vs Google top 5 for the keyword (length + topics covered); write better, do not copy

### 3. Headings
- [ ] One H1 (post title)
- [ ] H2 for main sections; H3 only under H2 when needed
- [ ] No skipped heading levels

### 4. German quality
- [ ] German nouns capitalized correctly (Grunderwerbsteuer, Notargebühren, …)
- [ ] Natural German — read aloud; not machine-translated feel

### 5. Internal links (inside the text)
- [ ] 2–4 contextual links in the article body
- [ ] At least one to the relevant money page
- [ ] Plus 1–2 related posts
- [ ] Meaningful anchors including the target page keyword (not “hier klicken”)

### 6. FAQ (optional)
- [ ] Short FAQ with real related questions where it fits
- [ ] FAQ schema optional — don’t over-invest (rich results rare now)

### 7. Trust and sources
- [ ] Cite credible sources for data (with links)
- [ ] Where helpful: quote a real person (Sweet Home expert / client / external)

### 8. Author, freshness, image, meta
- [ ] Real author + role shown
- [ ] Date and figures updated
- [ ] One relevant image with alt text
- [ ] Unique meta title + meta description including the keyword

### 9. CTA
- [ ] Clear next step at the end (consultation and/or Berlin properties), linked

**Quick test:** Is this the best, most useful answer for the keyword vs what currently ranks? If yes → ready for Adi’s review.

---

# Phase F — Internal link map (in-content)

Add links **inside the page body** (not only menu/footer). New domain: `sweethome-immobilien.de`.

**Rule:** Every blog post = **2–4** contextual body links. At least one money page + related posts. Descriptive German anchors; vary them (avoid exact-match spam).

### Berlin blog posts

| # | From page | Link to | Suggested anchors | Notes | Done |
|---|-----------|---------|-------------------|-------|------|
| 1 | `/blog/hidden-costs-of-buying-property-in-berlin` | Money page; Grunderwerbsteuer post; Ablauf post | Wohnung kaufen in Berlin; Grunderwerbsteuer Berlin; Ablauf Immobilienkauf | Kaufnebenkosten post — draft links money + interim related posts; swap when dedicated posts exist | [x] draft |
| 2 | `/blog/berlin-real-estate-investment-guide-2026` | Money; Kapitalanlage; Mietrendite; Immobilienpreise | Wohnung kaufen Berlin; Immobilie als Kapitalanlage; Mietrendite berechnen | Investor pillar — draft has money + cluster links; add immobilienpreise post when live | [x] draft |
| 3 | `/blog/how-foreigners-can-buy-property-in-berlin` | EN money `/en/properties-for-sale-berlin`; Ablauf; Kaufnebenkosten | buy an apartment in Berlin; the buying process; cost of buying | DE draft done; EN strengthen after Adi OK | [x] draft |
| 4 | `/blog/best-berlin-districts-for-property-investment` | District pages with inventory; money | Wohnung kaufen Kreuzberg; Wohnung kaufen Berlin | Only districts with stock | [ ] |
| 5 | `/blog/what-to-check-before-buying-an-apartment-in-berlin` | Money; Kaufnebenkosten; Ablauf | Wohnung kaufen Berlin; Kaufnebenkosten Berlin | | [ ] |
| 6 | `/blog/berlin-rental-laws-explained-for-property-buyers` | Kapitalanlage; Mietrendite; money | Immobilie als Kapitalanlage; Mietrendite berechnen | Investor-relevant | [ ] |
| 7 | `/blog/new-build-vs-altbau-in-berlin-which-is-better` | Money; districts | Wohnung kaufen Berlin; Altbauwohnung Berlin | | [ ] |
| 8 | `/blog/best-berlin-districts-for-families` | Districts; money | Wohnung kaufen in [Bezirk]; Wohnung kaufen Berlin | | [ ] |
| 9 | `/blog/how-smart-investors-buy-berlin-at-a-40-discount` | Investor pillar; money; Kapitalanlage | Immobilie als Kapitalanlage Berlin; Wohnung kaufen Berlin | Reframe 40% angle | [ ] |

### Money pages and structure (hub & spoke)

| # | From page | Link to | Suggested anchors | Notes | Done |
|---|-----------|---------|-------------------|-------|------|
| 10 | Homepage `/` | Berlin hub; money; investor pillar | Immobilien in Berlin kaufen; Wohnung kaufen Berlin | Lead with Berlin | [ ] |
| 11 | Berlin hub `/immobilien-berlin-kaufen` *(create)* | Money; districts; investor pillar | Wohnung kaufen Berlin; Wohnung kaufen [Bezirk] | Central spoke | [ ] |
| 12 | `/wohnungen-berlin-kaufen` (money) | Districts; hub (up); Kaufnebenkosten; Ablauf | Wohnung kaufen [Bezirk]; Kaufnebenkosten Berlin | | [ ] |
| 13 | District pages (e..g. `/wohnung-kaufen-kreuzberg`) | Money (up); hub (up); 1–2 neighbour districts | Wohnung kaufen Berlin; Wohnung kaufen [Nachbarbezirk] | Remove spammy full-list block; keep a few | [ ] |
| 14 | `/en/properties-for-sale-berlin` (EN money) | EN blog (foreigners, how-to-buy) | how to buy an apartment in Berlin; buying as a foreigner | | [ ] |
| 15 | Individual property listing | Its district (up); money (up); 2 similar listings | Wohnung kaufen [Bezirk]; Wohnung kaufen Berlin | Breadcrumb up | [ ] |

### Off-focus (skip)

| # | Pages | Action |
|---|-------|--------|
| 16 | 5 Cyprus posts + Dubai pages | No internal-link work; deprioritize |

**Key URLs (money / hub)**

| Role | URL |
|------|-----|
| DE money | `/wohnungen-berlin-kaufen` |
| DE hub (create) | `/immobilien-berlin-kaufen` |
| EN money | `/en/properties-for-sale-berlin` |

---

# Phase G — Pages & keywords map (beyond first stretch)

From `Sweet_Home_Pages_and_Keywords_Berlin.xlsx`. Do **after** Phases A–D and the first 6 blog drafts unless Adi says otherwise.

### German pages

| Purpose | URL | Status | Primary keyword | Vol/mo | Action | Done |
|---------|-----|--------|-----------------|--------|--------|------|
| Money | `/wohnungen-berlin-kaufen` | Exists | wohnung kaufen berlin | 8,900 | Optimize: fix double-brand title; expand; link districts | [ ] |
| Money | `/haus-kaufen-berlin` | **Missing** | haus kaufen berlin | 8,100 | **CREATE** — biggest gap | [ ] |
| Hub | `/immobilien-berlin-kaufen` | **Missing** | immobilien berlin kaufen | 1,300 | **CREATE** — links wohnung/haus/districts | [ ] |
| District | `/wohnung-kaufen-prenzlauer-berg` | Exists | wohnung kaufen prenzlauer berg | 350 | Optimize | [ ] |
| District | `/wohnung-kaufen-charlottenburg` | Exists | wohnung kaufen charlottenburg | 300 | Optimize | [ ] |
| District | `/wohnung-kaufen-kreuzberg` | Exists | wohnung kaufen kreuzberg | 150 | Optimize | [ ] |
| District | `/wohnung-kaufen-friedrichshain-kreuzberg` | Exists | wohnung kaufen friedrichshain | 150 | Optimize | [ ] |
| District | `/wohnung-kaufen-neukoelln` | Exists | wohnung kaufen neukölln | TBC | Optimize | [ ] |
| District | `/wohnung-kaufen-moabit` | Exists | wohnung kaufen moabit | TBC | Optimize | [ ] |
| District | `/wohnung-kaufen-wedding` | Exists | wohnung kaufen wedding | TBC | Optimize | [ ] |
| District | `/wohnung-kaufen-schoeneberg` | Exists | wohnung kaufen schöneberg | TBC | Optimize | [ ] |
| District | `/wohnung-kaufen-tempelhof` | Exists | wohnung kaufen tempelhof | TBC | Optimize | [ ] |
| District | `/wohnung-kaufen-spandau` | Exists | wohnung kaufen spandau | TBC | Optimize (low priority) | [ ] |
| District | `/wohnung-kaufen-reinickendorf` | Exists | wohnung kaufen reinickendorf | TBC | Optimize (low priority) | [ ] |
| District | `/wohnung-kaufen-berlin-mitte` | Exists (created Phase D) | wohnung kaufen berlin mitte | 400 | Optimize further as needed | [x] created |
| District | `/wohnung-kaufen-pankow` | Exists (created Phase D) | wohnung kaufen pankow | TBC | Optimize further as needed | [x] created |
| Blog refresh | `/blog/hidden-costs-of-buying-property-in-berlin` | Exists | kaufnebenkosten berlin | 200 | Refresh + German QA | [ ] |
| Blog refresh | `/blog/berlin-real-estate-investment-guide-2026` | Exists | immobilie als kapitalanlage | 600 | Refresh into investor pillar | [ ] |
| Blog create | `/blog/immobilienpreise-berlin` | **Missing** | immobilienpreise berlin | 2,400 | **CREATE** | [ ] |
| Blog create | `/blog/grunderwerbsteuer-berlin` | **Missing** | grunderwerbsteuer berlin | 1,500 | **CREATE** | [ ] |
| Blog create | `/blog/grundbuch-eintragung-kosten` | **Missing** | grundbuch eintragung kosten | 700 | **CREATE** | [ ] |
| Blog create | `/blog/ablauf-immobilienkauf` | **Missing** | ablauf immobilienkauf | 250 | **CREATE** | [ ] |

### English pages

| Purpose | URL | Status | Primary keyword | Action | Done |
|---------|-----|--------|-----------------|--------|------|
| Money | `/en/properties-for-sale-berlin` | Exists | buy apartment in berlin germany | Optimize: fix double-brand title; strengthen | [ ] |
| Districts EN | `/en/wohnung-kaufen-[district]` | Missing | buy apartment in [district] berlin | CREATE mirrors of DE districts | [ ] |
| Blog refresh | `/en/blog/how-foreigners-can-buy-property-in-berlin` | Exists | can foreigners buy property in berlin | Refresh; strengthen | [ ] |
| Blog create | `/en/blog/how-to-buy-an-apartment-in-berlin` | Missing | how to buy an apartment in berlin | CREATE | [ ] |
| Blog refresh | `/en/blog/berlin-real-estate-investment-guide-2026` | Exists | berlin real estate investment | Refresh into EN investor pillar | [ ] |

### Crawl corrections (from Adi)

- **11 Berlin district pages already exist** — they need **optimizing**, not creating (Prenzlauer Berg, Charlottenburg, Kreuzberg, Friedrichshain-Kreuzberg, Neukölln, Moabit, Wedding, Schöneberg, Tempelhof, Spandau, Reinickendorf).
- Still missing to **create:** `/haus-kaufen-berlin`, hub `/immobilien-berlin-kaufen`, Mitte page, EN district pages.
- **Optimize means:** fix double-brand title; unique content (not city-swapped template); hreflang; internal links up to money + hub; target the district keyword.
- **Watch-out:** District pages look template-generated (duplicate-title groups) — need genuinely unique local content or they compete with each other.

---

# Suggested weekly workflow

| Day | Focus |
|-----|--------|
| Mon–Tue | Phase A bug + Phase D housekeeping/QA |
| Wed–Fri | Phase B blog drafts (1–2 posts/week with checklist + links) |
| Friday | Email Adi: done / drafts for review / blockers / next week |

### Weekly status email template

```
Subject: Sweet Home SEO — weekly status (YYYY-MM-DD)

Done this week:
- …

Drafts for your review (not published):
- …

In progress / next week:
- …

Blockers / questions:
- …
```

---

# Progress log

| Date | What shipped / drafted | Shared with Adi? | Notes |
|------|------------------------|------------------|-------|
| 2026-08-03 | Phase A: DE related-post titles + same-geo filter | Validated by Luis | `blogController.showPublic` |
| 2026-08-03 | Phase B #1 draft: Kaufnebenkosten Berlin | Sent / Adi edited | CMS draft → **publish her version to live** |
| 2026-08-03 | Phase B #2 draft: investment guide 2026 | Sent / Adi OK | **Publish to live** |
| 2026-08-03 | Phase B #3 draft: foreigners buy Berlin | Sent / Adi OK | **Publish to live** (EN later) |
| 2026-08-03 | Phase D housekeeping + QA | Pending deploy | Console clean, footer Berlin-first, beds/bath DE, Mitte/Pankow pages, FAQ visible |
| 2026-08-04 | Adi: blogs approved + Migration Fixes Now | Received | **Phase M** added as HIGH PRIORITY (P1 today) |
| 2026-08-04 | Phase M P1 verified live | **Send sample report to Adi** | 33 URLs all 301; report `migration-p1-redirect-sample-2026-08-04.md` |
| 2026-08-05 | Blog drafts #1–3 → live `*_i18n.de` | Notify Adi | Live slugs unchanged; draft posts renamed `zz-archived-*` |
| 2026-08-05 | Phase C: unique list/project H1s + money district links | After deploy | Listing/neighborhood H1s; projects localized; curated+best-areas district links |

---

*End of guide. Update checkboxes and the progress log as work proceeds.*
