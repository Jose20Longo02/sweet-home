# Domain migration — 1:1 redirect map (Migration Checklist #2)

**Status:** Confirmed for SEO review (2026-07-23)  
**Rule:** Every `sweet-home.co.il` URL → **301** → the **same path + query** on `sweethome-immobilien.de`  
**Artifact:** [`domain-migration-1to1-redirect-map-2026-07-23.csv`](./domain-migration-1to1-redirect-map-2026-07-23.csv) (331 rows: live sitemap + Phase 4 samples + host variants)

---

## Confirmed rule

```
https://sweet-home.co.il{path}?{query}
  → 301 →
https://sweethome-immobilien.de{path}?{query}
```

Also covered by the same rule:

| From | To |
|------|-----|
| `http://sweet-home.co.il/...` | `https://sweethome-immobilien.de/...` |
| `https://www.sweet-home.co.il/...` | `https://sweethome-immobilien.de/...` |
| `http://www.sweet-home.co.il/...` | `https://sweethome-immobilien.de/...` |

- **Path changed?** No — for the domain hop itself (`path_changed=no` on every map row).
- **Query string?** Preserved exactly.
- **`.co.il` stays live** forever as a redirecting hostname (go-live checklist #15).

---

## What this map is / is not

| Included | Not this map |
|----------|----------------|
| Live indexable paths from `/sitemap.xml` (320 URLs) | Path-changing SEO rules (#5–#7, Spanish `/es` strip, `/de` collapse) — those stay as **path** redirects |
| Phase 4 sample URLs (home, landings, filters, pagination, legacy prefixes) | Enabling the redirect in production (go-live checklist #10) |
| www / http host variants | Changing canonical/`APP_URL` to `.de` (go-live #6) |

**Single-hop note (for go-live):** Prefer applying path-level rules **before** or **combined with** the domain hop so a legacy URL like `/es/about` becomes one 301 to `https://sweethome-immobilien.de/about`, not `.co.il/es/about` → `.de/es/about` → `.de/about`. Middleware order on go-live should keep path cleanup first, then domain redirect for remaining `.co.il` hits (or emit the final `.de` URL directly).

---

## Sample confirmations (path identical)

| Old (`.co.il`) | New (`.de`) |
|----------------|-------------|
| `https://sweet-home.co.il/` | `https://sweethome-immobilien.de/` |
| `https://sweet-home.co.il/en` | `https://sweethome-immobilien.de/en` |
| `https://sweet-home.co.il/wohnungen-berlin-kaufen` | `https://sweethome-immobilien.de/wohnungen-berlin-kaufen` |
| `https://sweet-home.co.il/properties?country=Germany&city=Berlin` | `https://sweethome-immobilien.de/properties?country=Germany&city=Berlin` |
| `https://sweet-home.co.il/blog?page=2` | `https://sweethome-immobilien.de/blog?page=2` |

Full list: CSV above (0 path mismatches in generated rows).

---

## Implementation readiness (not enabled yet)

Code: `middleware/domainRedirect.js` (wired in `app.js`).

```bash
# OFF (default) — current production
# DOMAIN_REDIRECT_ENABLED unset or false

# ON — go-live only
DOMAIN_REDIRECT_ENABLED=true
PRIMARY_ORIGIN=https://sweethome-immobilien.de
LEGACY_HOSTS=sweet-home.co.il,www.sweet-home.co.il
```

Do **not** turn this on until `.de` serves the app and go-live #6–9 are ready.

---

## SEO sign-off

| Role | Action | Status |
|------|--------|--------|
| Dev | Generated 1:1 map from live sitemap + samples; middleware ready behind flag | ✅ 2026-07-23 |
| SEO (Adi) | Review CSV / this rule; confirm no exceptions needed | [ ] Pending |

**Regenerate map from live sitemap:**

```bash
node scripts/generate-domain-1to1-map.js
```
