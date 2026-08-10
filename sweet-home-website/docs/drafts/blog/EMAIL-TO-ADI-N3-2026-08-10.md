# Email to Adi — N3 migration integrity + N2 blog URLs

**Subject:** Sweet Home — redirect sample + N2/N3 status (2026-08-10)

---

Hi Adi,

Quick status on the items you flagged.

### Confirmations you asked for
- **Breadcrumb schema:** OK on `/wohnungen-berlin-kaufen` (BreadcrumbList in HTML).
- **Console housekeeping:** Done (property-page debug noise / Leaflet map warning cleaned earlier).

### Redirect sample (re-run today)
Full table: `docs/migration-n3-redirect-sample-2026-08-10.md`

**Verdict:** PASS — 33/34 URLs clean **301** `.co.il` → `.de` (path+query preserved). No **302**. No stale **200** HTML on `/`, `/en`, `/blog`. www is still a two-hop 301 (www→apex→`.de`).

### Blog duplicates (your urgent task)
Done live:
- One German keyword URL per Berlin post
- `zz-archived` twins unpublished (draft only)
- Old English / archive URLs **301** to clean slugs
- Full `<title>` (no ellipsis)
- Sitemap clean; GSC indexing requested for the 9 URLs

### TTFB
Warm money + district pages are under **800ms** (~200–280ms). Cold Charlottenburg can spike; warm is fine. Landing cache (`s-maxage=60`) is live.

### 404 views
Analytics showed heavy hits on bare legacy paths (`/for-sale/...`, bare property/project/blog slugs). We added 301s to the canonical `/properties|projects|blog/...` URLs — deploying with this update.

Next up: homepage Berlin-first title/meta/og:image (draft for your OK), then Cyprus/Dubai crawl-weight reduction.

Best,
Luis / José / Medialy
