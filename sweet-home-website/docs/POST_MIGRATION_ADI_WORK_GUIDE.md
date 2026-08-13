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
| `Sweet_Home_Dev_Tasks_Next_2_Weeks.docx` | **ACTIVE** next-two-weeks tasks (N1–N11) — received 2026-08-10 |

Related internal doc: [`DOMAIN_MIGRATION_PLAYBOOK.md`](./DOMAIN_MIGRATION_PLAYBOOK.md) (go-live / redirects / GSC).

---

## How to use this document

- **Current priority (2026-08-10):** **Phase N** — Adi’s next-two-weeks pack. **Urgent first:** N2 duplicate blog URLs → then N1 publish six drafts on German keyword slugs → rest of N3–N11.
- Check boxes as you go: `- [ ]` → `- [x]`.
- Cyprus / Dubai content is **off-focus** — reduce crawl weight (see N5); no internal-link work there.

### Adi reply 2026-08-10 (email summary)

- Six drafts **approved for publishing**, with condition: live at **German keyword slugs**; clean up **zz-archived** duplicate URLs first (N2) — GSC shows clean Berlin posts stuck “discovered, not indexed” because of duplicates.
- **New policy:** do **not** wait for Adi review on blog posts. Follow the checklist and **publish directly**; she reviews live posts weekly. **Only homepage and money page copy** still comes to her first.
- Attached tasks = next two weeks (closed items listed + carried-over + six new posts in N9). She still needs: **30-URL redirect sample output**, plus one-line confirmations for **breadcrumb schema** and **console housekeeping**.
- **GSC data point (first 11 days on new domain):** 909 impressions; ~⅔ non-branded Berlin searches; district pages already appearing (Schöneberg first). Foundation works — these tasks push page 3 → page 1.
- Weekly status by email remains fine.

### Key contacts

| Role | Name | Notes |
|------|------|-------|
| Dev / delivery | Luis / José / Medialy | Code, drafts, QA, weekly status |
| SEO consultant | Adi | Weekly live blog review; GSC; homepage/money copy review |
| Business | Israel / team | Approvals as needed |

### Standing rules from Adi

1. Weekly status by email is enough.
2. Use AI to help with content — but quality must read as natural German, not machine-translated.
3. Goal for blog work: be the **best answer for the keyword**, not just “exist.”
4. **Blog publish policy (updated 2026-08-10):** Follow Phase E checklist → publish on **German keyword slug** directly. No draft-and-wait. Adi reviews live weekly. Homepage + money page copy still need her OK first.
5. **Blog tone / craft (apply to all posts — Adi 2026-08-04):**
   - Friendlier, less technical — written for a real buyer, not like a tax form
   - Title + excerpt: keep keyword, more inviting; put **one number in the excerpt** for CTR
   - Internal links: woven into running text (not a list block); anchor = target page’s keyword
   - **At least four** in-text links to other posts with keyword anchors + money/district where it fits (N9)
   - When a new post goes live, add **one reciprocal link** from the most related existing post
   - Sources: link a credible source for figures; wording accuracy (e.g. “gesetzliche Maklerkostenteilung (Dezember 2020)” not “Bestellerprinzip”)
   - Capitalize German nouns; clear CTA
   - **GEO / AI:** mention brand **“Sweet Home Berlin”** a few more times in the text

---

## Priority order (updated 2026-08-10)

1. ~~Phase M P1 (301 + cache + sample)~~ ✅ 2026-08-04 (Adi still wants sample output re-sent — see N3)  
2. ~~Publish Adi-approved blog drafts #1–3 to live~~ ✅ 2026-08-05  
3. ~~Phase C headings + money page~~ ✅  
4. ~~Phase M P2 (TTFB) + P3 (on-page)~~ ✅ code 2026-08-05  
5. **N2 — Fix duplicate blog URLs (URGENT)** ← do first  
6. **N1 — Publish six drafts on German keyword slugs** (+ 301 old 40% URL)  
7. N3 migration integrity (re-send sample; 404s; TTFB)  
8. N4 homepage Berlin-first  
9. N5 Cyprus/Dubai crawl weight  
10. N6 district FAQ SSR  
11. N7 wrong Bezirk on listings + duplicate Moabit + Bäder typo  
12. N8 social profiles → `.de`  
13. N9 six new posts (3/week), publish directly  
14. N10 EN versions of Berlin posts (after N2)  
15. N11 Ratgeber blocks on district pages  

---

# Phase N — Next two weeks (Adi 2026-08-10) — ACTIVE

**Source:** `Sweet_Home_Dev_Tasks_Next_2_Weeks.docx` + Adi email 2026-08-10  
**Cadence:** Short weekly status email to Adi (as before).

### Status from last cycle (Adi’s closed list)

**Done and verified (per Adi):** related-posts titles; improved posts + six new drafts; unique H1s; district links on money page; Zimmer/Bad labels; footer year; Mitte/Pankow district links; German footer.

**Still open / carried over (Adi asks):** items marked below; also **send 30-URL redirect sample output**; one-line confirmation each for **breadcrumb schema** and **console housekeeping**.

---

### N1 — Publish the six drafts on clean German slugs

Approved for publishing. **Condition:** each post goes live at its **German keyword slug**. No draft / archive / English names in the slug.

| # | Target live slug (example) | Notes |
|---|----------------------------|-------|
| 4 | `/blog/beste-bezirke-immobilien-berlin` | From draft id 148 / live was English slug |
| 5 | `/blog/wohnungskauf-berlin-checkliste` | |
| 6 | `/blog/mietrecht-berlin-kaeufer` | |
| 7 | `/blog/neubau-oder-altbau-berlin` | |
| 8 | `/blog/berlin-stadtteile-familien` | |
| 9 | `/blog/vermietete-wohnung-kaufen-berlin` | Replaces old 40%-discount post |

- [x] Publish all six at `/blog/[german-keyword]` with approved DE content (done with N2 script 2026-08-10)
- [x] **301** old URL `how-smart-investors-buy-berlin-at-a-40-discount` → new vermietete-wohnung post (in redirect map — **needs deploy**)
- [x] No draft/archive/English names left as the canonical slug

**Done when:** all six live at German keyword slugs; old discount post 301s to replacement.

---

### N2 — Fix duplicate blog URLs (**URGENT**, carried over) — do before / with N1

GSC: clean Berlin posts stuck in **“discovered, not indexed”** because each improved post has a twin `zz-archived-draft-review` URL that **canonicalises to itself**.

- [x] Keep **one URL per post** (German keyword slug); **301** each `zz-archived` URL to the clean URL; only the canonical URL indexable — DB: unpublished twins 145–147; redirects in `config/blog-slug-redirects-2026-08-10.json` (**needs deploy**)
- [x] Rename remaining **English slugs on German posts** to German keywords + **301** (script `scripts/n2-blog-slug-cleanup.js`, 2026-08-10)
- [x] Same cleanup for **`/en/`** versions: zz-archived twins unpublished; EN currently shares German slug (bilingual slugs = N10 follow-up)
- [x] Fix blog **title template**: removed `clampForSeo` ellipsis on post/list titles (`blogController.js`) — **needs deploy**
- [x] Confirm **sitemap** lists only clean URLs — excludes `zz-archived*` / `*-draft-review*` even if mis-published
- [x] **Request indexing** in Search Console for each cleaned post URL (**manual — José/Luis**) — done 2026-08-10

**German live slugs (2026-08-10):**
`kaufnebenkosten-berlin`, `immobilie-als-kapitalanlage-berlin`, `auslaender-immobilien-kaufen-berlin`, `beste-bezirke-immobilien-berlin`, `wohnungskauf-berlin-checkliste`, `mietrecht-berlin-kaeufer`, `neubau-oder-altbau-berlin`, `berlin-stadtteile-familien`, `vermietete-wohnung-kaufen-berlin`

**Done when:** exactly one indexable URL per language per post; old URLs 301; full titles; clean URLs submitted for indexing. ✅ (indexing requested 2026-08-10; Google may take days to reflect)

---

### N3 — Migration integrity (carried over)

- [x] Confirm old-domain redirects return **301** (not 302); CDN cache purged (root, `/en`, `/blog` were serving old cached pages) — re-check **2026-08-10** PASS
- [x] **Re-run 30-URL sample and send output to Adi** — report: [`docs/migration-n3-redirect-sample-2026-08-10.md`](./migration-n3-redirect-sample-2026-08-10.md); email draft: [`docs/drafts/blog/EMAIL-TO-ADI-N3-2026-08-10.md`](./drafts/blog/EMAIL-TO-ADI-N3-2026-08-10.md)
- [x] One-line confirm **breadcrumb schema** OK — money page `BreadcrumbList` present 2026-08-10
- [x] One-line confirm **console housekeeping** done — Phase D (include in status email)
- [x] Analytics 404s: top bare `/for-sale/*`, property/project/blog slugs, `/regions` → **301** via `middleware/legacyBareSlugRedirect.js` (**needs deploy**)
- [x] TTFB on `/wohnungen-berlin-kaufen` + district pages: warm **under 800ms**; cold Charlottenburg outlier noted in report

**Done when:** sample shared; all 301s; cache clean; 404 views drop; TTFB under 800ms. ✅ (send email to Adi; 404 middleware deploy)

---

### N4 — Homepage: make it Berlin-first

- [ ] **Title:** change from `Internationales Immobilien Investment Unternehmen | Sweet Home` to brand+Berlin aligned with H1, e.g. `Sweet Home Berlin | Immobilien und Neubauprojekte in Berlin`  
  **Do not** use `Wohnung kaufen Berlin` in homepage title (belongs to money page — no competition)
- [ ] **Meta description:** rewrite around Berlin only
- [ ] **og:image:** replace Dubai photo with a Berlin image
- [ ] Leave H1 as-is (already right)
- [ ] Homepage: missing image alts + empty H2s if not already done (alts/footer shipped earlier — re-verify live)

**Done when:** title, description, share image lead with Berlin; no empty H2s / missing alts.  
**Note:** Homepage copy still needs Adi OK before publish (policy exception).

---

### N5 — Reduce Cyprus and Dubai crawl weight

GSC ~120 Cyprus/Dubai pages discovered but not indexed — wasting crawl budget.

- [x] Remove Cyprus/Dubai from **main nav**; keep **one link each in footer** — headers updated; footer points to hubs
- [x] Remove their listings from **sitemap**; **noindex** bulk individual listing pages — exclude `Cyprus`/`UAE` from sitemap; detail `noindex,follow`
- [x] Keep **one Cyprus hub** + **one Dubai hub** live and reachable — hubs remain in sitemap + footer
- [x] Blog index meta description: still English + mentions Cyprus/Dubai → rewrite **German, Berlin-focused** — `blog.list.metaDescription`

**Done when:** nav + sitemap Berlin-only; one hub each for CY/DXB; blog index description DE + Berlin. ✅ (deploy)

---

### N6 — District FAQ answers in HTML (carried over)

Charlottenburg FAQ answers only via JS (empty for crawlers); Pankow SSR is correct.

- [ ] Server-render FAQ answers on **every** district page (like Pankow)
- [ ] Verify: answer text appears in **View Source**

**Done when:** FAQ answers in View Source on every district page.

---

### N7 — Fix wrong districts on listings

- [ ] Correct wrong Bezirk tags (e.g. Moabit flats tagged Charlottenburg-Wilmersdorf; Mitte flat tagged Friedrichshain-Kreuzberg)
- [ ] Duplicate Moabit listings at Erasmusstrasse (same flat, two URLs): merge or remove one
- [ ] Card typo: `Bader` → `Bäder`

**Done when:** correct Bezirk; duplicate resolved; typo fixed.

---

### N8 — Update domain on social profiles

- [ ] Instagram, Facebook, LinkedIn, directories/listings: website → `sweethome-immobilien.de`
- [ ] No profile still links to `sweet-home.co.il`

**Done when:** all accessible profiles point to `.de`.

---

### N9 — New posts, three per week, publish directly

**Policy:** no draft-and-wait. Phase E checklist; German keyword in slug, title, H1; ≥4 in-text keyword-anchor links to other posts + money/district where fit; reciprocal link from most related existing post. Adi reviews live weekly.

#### Week 1
- [ ] `/blog/immobilienpreise-berlin` — price overview by district (citable table/chart)
- [ ] `/blog/grunderwerbsteuer-berlin`
- [ ] `/blog/mietrendite-berechnen` — formula + worked examples

#### Week 2
- [ ] `/blog/…` — Wie viel Eigenkapital braucht man beim Wohnungskauf (German keyword slug)
- [ ] `/blog/…` — Mietpreise Berlin nach Bezirk (citable rent table)
- [ ] `/blog/…` — Wo in Berlin eine Wohnung kaufen? Bezirke im Vergleich (link every district page with keyword anchor)

**Done when:** six posts live by end of two weeks, each on keyword slug.

---

### N10 — English versions of the Berlin posts

**After N2 is done.**

- [ ] EN versions of improved Berlin posts (auto-translate OK as base; ~10 min human read before live)
- [ ] English keyword slug under `/en/blog/` (e.g. `cost-of-buying-property-berlin`); hreflang pair; self-canonical per language
- [ ] Exception: **How foreigners can buy property in Berlin** — proper English edit, not machine output

**Done when:** each Berlin post has live EN at English keyword slug, correctly paired.

---

### N11 — Guide links on district pages

- [ ] On each district page, low on page: small **Ratgeber** block with **2–4** relevant blog posts (fit the district — not the same three everywhere)
- [ ] Descriptive keyword anchors (not “mehr lesen”)

**Done when:** every district page links 2–4 fitting guides with keyword anchors.

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

- [x] **TTFB improvements for money/district pages** (code 2026-08-05; **needs deploy**)  
  Baseline from this session: money ~0.4–1.2s, most districts ~0.3s, Charlottenburg outlier ~5s cold.  
  Shipped: 90s in-memory landing query cache, parallelize neighborhood counts + listings, tighten Berlin `WHERE` (city + not sold), `Cache-Control: s-maxage=60` on public landings.  
  **Done when:** TTFB **under 800ms** on money page and district pages — **re-measure after deploy** (warm origin + CDN).

| Item | Owner | Date | Notes |
|------|-------|------|-------|
| Listing/district page TTFB | Dev | 2026-08-05 | `utils/landingPageCache.js` + berlin/district handlers |

## P3 — On-page

- [x] **Homepage:** empty `alt` on Dubai/Cyprus/about images → descriptive DE/EN alts (code; needs deploy). Live audit: only those 3 content images (+ FB pixel) lacked alts; Adi’s “13 of 29” likely included older crawl / dynamic cards that already use `property.title`.
- [x] **Homepage:** empty `<h2>` — **none found** on live homepage 2026-08-05 (verified).
- [x] **Footer on German pages** — added missing DE keys (`regions`, staff login/register/forgot, Berlin links, etc.); `features` → “Angebote” (needs deploy).
- [x] **`/es/*`** — noted low priority; Spanish already redirected/removed in app (`/lang/es` → `/`, Fix #7 maps). No further change this pass.

**Done when:** homepage images have alt text, empty H2s gone, German footer reads in German. (`/es/*` fixed or noted.) ✅ (pending deploy for alts/footer)

| Item | Owner | Date | Notes |
|------|-------|------|-------|
| Homepage alts + empty H2s | Dev | 2026-08-05 | Alts fixed; empty H2 none live |
| DE footer i18n | Dev | 2026-08-05 | `locales/de.json` footer keys |
| `/es/*` 1:1 or 410 | Dev | 2026-08-05 | Noted; existing redirects cover drop of ES |

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
| 4 | `/blog/best-berlin-districts-for-property-investment` | Districts for investment | [x] **Approved** — publish as `/blog/beste-bezirke-immobilien-berlin` (N1; after N2) |
| 5 | `/blog/what-to-check-before-buying-an-apartment-in-berlin` | Pre-purchase checks | [x] **Approved** — publish as `/blog/wohnungskauf-berlin-checkliste` (N1) |
| 6 | `/blog/berlin-rental-laws-explained-for-property-buyers` | Rental laws / investors | [x] **Approved** — publish as `/blog/mietrecht-berlin-kaeufer` (N1) |

### Next wave (after first 6)

| # | URL slug | Notes | Status |
|---|----------|-------|--------|
| 7 | `/blog/new-build-vs-altbau-in-berlin-which-is-better` | + district / money links | [x] **Approved** → `/blog/neubau-oder-altbau-berlin` (N1) |
| 8 | `/blog/best-berlin-districts-for-families` | + district / money links | [x] **Approved** → `/blog/berlin-stadtteile-familien` (N1) |
| 9 | `/blog/how-smart-investors-buy-berlin-at-a-40-discount` | Reframe “40% discount” angle | [x] **Approved** → `/blog/vermietete-wohnung-kaufen-berlin` + **301** old URL (N1) |

**Hand-off (updated 2026-08-10):** Drafts #4–#9 **approved by Adi**. Publish on **German keyword slugs** after/with **N2 duplicate URL cleanup**. Do not leave content on English or zz-archived slugs as canonical.

**Publish checklist (drafts → live):**
- [x] Sync Adi’s edited CMS draft content into live posts’ `*_i18n.de` (Kaufnebenkosten first — most edits) — #1–3
- [x] Spot-check live DE URLs + internal links (#1–3)
- [x] Archive draft-review posts for #1–3 (`zz-archived-*`) — **N2: these twins must 301 to clean URLs and stop self-canonicalizing**
- [ ] **N1+N2:** Publish #4–#9 on German keyword slugs; 301 English + zz-archived URLs; fix title ellipsis; sitemap + GSC indexing

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

**Quick test:** Is this the best, most useful answer for the keyword vs what currently ranks? If yes → **publish** (Adi reviews live weekly). Homepage/money copy still needs her OK first.

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
| 4 | `/blog/best-berlin-districts-for-property-investment` | District pages with inventory; money | Wohnung kaufen Kreuzberg; Wohnung kaufen Berlin | Only districts with stock | [x] draft |
| 5 | `/blog/what-to-check-before-buying-an-apartment-in-berlin` | Money; Kaufnebenkosten; Ablauf | Wohnung kaufen Berlin; Kaufnebenkosten Berlin | | [x] draft |
| 6 | `/blog/berlin-rental-laws-explained-for-property-buyers` | Kapitalanlage; Mietrendite; money | Immobilie als Kapitalanlage; Mietrendite berechnen | Investor-relevant | [x] draft |
| 7 | `/blog/new-build-vs-altbau-in-berlin-which-is-better` | Money; districts | Wohnung kaufen Berlin; Altbauwohnung Berlin | | [x] draft |
| 8 | `/blog/best-berlin-districts-for-families` | Districts; money | Wohnung kaufen in [Bezirk]; Wohnung kaufen Berlin | | [x] draft |
| 9 | `/blog/how-smart-investors-buy-berlin-at-a-40-discount` | Investor pillar; money; Kapitalanlage | Immobilie als Kapitalanlage Berlin; Wohnung kaufen Berlin | Reframed tenanted/vacant gap | [x] draft |

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
| Blog create | `/blog/immobilienpreise-berlin` | **Missing** | immobilienpreise berlin | 2,400 | **CREATE** — Phase **N9 week 1** | [ ] |
| Blog create | `/blog/grunderwerbsteuer-berlin` | **Missing** | grunderwerbsteuer berlin | 1,500 | **CREATE** — Phase **N9 week 1** | [ ] |
| Blog create | `/blog/mietrendite-berechnen` | **Missing** | mietrendite berechnen | TBC | **CREATE** — Phase **N9 week 1** | [ ] |
| Blog create | `/blog/eigenkapital-wohnungskauf` *(slug TBC)* | **Missing** | eigenkapital wohnungskauf | TBC | **CREATE** — Phase **N9 week 2** | [ ] |
| Blog create | `/blog/mietpreise-berlin-bezirk` *(slug TBC)* | **Missing** | mietpreise berlin | TBC | **CREATE** — Phase **N9 week 2** | [ ] |
| Blog create | `/blog/wo-in-berlin-wohnung-kaufen` *(slug TBC)* | **Missing** | wo in berlin wohnung kaufen | TBC | **CREATE** — Phase **N9 week 2**; link all districts | [ ] |
| Blog create | `/blog/grundbuch-eintragung-kosten` | **Missing** | grundbuch eintragung kosten | 700 | **CREATE** (later) | [ ] |
| Blog create | `/blog/ablauf-immobilienkauf` | **Missing** | ablauf immobilienkauf | 250 | **CREATE** (later) | [ ] |

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
| Now / Mon | **N2** duplicate blog URLs + title template + sitemap (urgent) |
| Same cycle | **N1** publish six drafts on German keyword slugs + 301s |
| Ongoing | N3 sample re-send + 404s + TTFB; N4–N8 tech/SEO tasks |
| Wed–Fri | **N9** new posts (3/week) — publish directly on keyword slugs |
| After N2 | N10 EN versions; N11 district Ratgeber blocks |
| Friday | Email Adi: done / live posts shipped / blockers / next week |

### Weekly status email template

```
Subject: Sweet Home SEO — weekly status (YYYY-MM-DD)

Done this week:
- …

Published live (for your weekly review):
- …

In progress / next week:
- …

Blockers / questions:
- …

Confirmations you asked for:
- Redirect sample: …
- Breadcrumb schema: …
- Console housekeeping: …
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
| 2026-08-05 | Phase M P2/P3 | After deploy | Landing query cache + Cache-Control; homepage alts; DE footer i18n |
| 2026-08-09 | Phase B #4 draft: best Berlin districts for investment | Send to Adi | CMS draft id 148; live post 136 unchanged |
| 2026-08-09 | Phase B #5 draft: what to check before buying in Berlin | Send to Adi | CMS draft id 149; live post 138 unchanged |
| 2026-08-09 | Phase B #6 draft: Berlin rental laws for buyers | Send to Adi | CMS draft id 150; live post 140 unchanged |
| 2026-08-09 | Phase B #7–#9 drafts + full pack #4–#9 | **Send email to Adi** | Draft ids 151–153; email in `docs/drafts/blog/EMAIL-TO-ADI-DRAFTS-2026-08-09.md` |
| 2026-08-10 | Adi: six drafts approved + Next 2 Weeks pack | Received | **Phase N** added; N2 duplicates URGENT before N1 German-slug publish; blog policy = publish direct; homepage/money still need Adi; GSC 909 impressions / 11 days |
| 2026-08-10 | **N2+N1:** German keyword slugs + unpublish zz twins + draft DE live + title/sitemap/redirects | Deploy redirects | Script `n2-blog-slug-cleanup.js`; map `blog-slug-redirects-2026-08-10.json`; **GSC indexing still manual** |
| 2026-08-10 | **N3:** redirect sample re-run + TTFB + breadcrumb confirm + bare-slug 404 301s | **Sent to Adi** (email + PDF) | Report `migration-n3-redirect-sample-2026-08-10.md`; PDF `Sweet-Home-Migration-N3-Redirect-Sample-2026-08-10.pdf` |
| 2026-08-13 | **N5:** reduce Cyprus/Dubai crawl weight | Deploy | Nav Berlin-only; footer hubs; sitemap exclude CY/UAE listings; noindex CY/UAE details; blog meta DE Berlin |
| 2026-08-13 | **N6:** district FAQ answers in HTML (Pankow pattern) | Deploy | Removed `hidden` on FAQ answers across district templates |

---

*End of guide. Update checkboxes and the progress log as work proceeds.*
