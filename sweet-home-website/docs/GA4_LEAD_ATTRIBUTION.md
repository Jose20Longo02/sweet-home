# GA4 ↔ CRM lead attribution (Phase 2)

Goal: when a lead shows as **Direct** in the CRM because the browser stripped the Google referrer, look up the visitor’s **first-user acquisition** in GA4 using the stored `ga_client_id`.

## What the code already does

1. Saves `ga_client_id` on every lead (from the `_ga` cookie).
2. Sets GA4 user property `sh_ga_cid` on page load (`public/js/analytics.js`).
3. After a new lead, schedules a GA4 lookup (~15 minutes later).
4. Super Admin → Leads → **Enrich from GA4** (batch), or `POST /api/leads/:id/enrich-ga4`.
5. Traffic source falls back to GA4 fields when CRM UTMs/referrer are empty (`via GA4` label).

## One-time setup (required)

### 1) Create a user-scoped custom dimension in GA4

1. Open [Google Analytics](https://analytics.google.com) → Sweet Home property.
2. **Admin** → **Data display** → **Custom definitions** → **Create custom dimension**.
3. Set:
   - **Dimension name:** `SH GA Client ID` (any label)
   - **Scope:** **User**
   - **User property:** `sh_ga_cid` (must match exactly)
4. Save. Data starts collecting after deploy of `analytics.js` (can take 24–48h before reports fill).

### 2) Create a Google Cloud service account

1. In [Google Cloud Console](https://console.cloud.google.com), create/select a project.
2. Enable **Google Analytics Data API**.
3. Create a **Service account** → download JSON key.
4. In GA4: **Admin** → **Property access management** → add the service account email as **Viewer**.

### 3) Env vars (Render + local `.env`)

```bash
GA4_PROPERTY_ID=123456789
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}
```

- `GA4_PROPERTY_ID` is the **numeric** property ID (Admin → Property settings), not `G-XXXX`.
- Alternatively set `GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json` instead of the JSON env var.

### 4) Deploy + migrate

```bash
# Already applied on prod DB when you run this locally with DATABASE_URL:
# mitigations/add_ga_acquisition_columns.sql
```

Redeploy the app so the new code and `analytics.js` ship.

## Manual / cron enrich

```bash
LIMIT=50 node scripts/enrich-leads-ga4.js
```

Or click **Enrich from GA4** on Super Admin leads.

## Expectations

- Not 100%: ad blockers / denied consent → no `client_id` / no GA hit.
- New custom dimension needs traffic **after** it was created; old historical hits without `sh_ga_cid` won’t match.
- GA4 reporting can lag (minutes to a day). Delayed enrich + batch button cover that.
- Ads/email still primarily use UTMs / click IDs; this is for **organic vs Direct**.
