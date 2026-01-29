# Google Analytics Fix Checklist – Why GA Shows 0 and How to Fix It

## What’s going on

- **Your own analytics**: hundreds of visits (e.g. 739 total, 629 unique today).
- **Google Analytics**: 0 active users, 0 events, 0 real-time users.

So GA is either **not loaded at all** or **not sending data**. In this app, GA is only loaded when `GA_MEASUREMENT_ID` is set. If it’s missing in production, GA never runs → 0 data.

---

## Step 1: Check if GA is loaded on the live site

1. Open your **live** site (e.g. `https://sweet-home.co.il`) in a **private/incognito** window.
2. Right‑click → **View Page Source** (or Ctrl+U / Cmd+U).
3. Search for:
   - **“Google Analytics NOT loaded”** or **“GA: NOT SET”**  
     → GA is **not** loaded. Go to Step 2.
   - **“googletagmanager.com/gtag/js”** and **“GA: Measurement ID is set”**  
     → GA **is** loaded. If you still see 0 in GA, go to Step 3.

---

## Step 2: Set GA_MEASUREMENT_ID in production (Render)

GA will stay at 0 until the app has a valid Measurement ID in the environment where it runs.

### On Render

1. **Dashboard** → your **Web Service** (sweet-home-website).
2. **Environment** (left sidebar).
3. **Environment Variables**.
4. Add or edit:
   - **Key:** `GA_MEASUREMENT_ID`
   - **Value:** your GA4 Measurement ID (see Step 2b).

5. **Save Changes** and **redeploy** the service (Render usually redeploys when you save env vars).

### Getting a valid GA4 Measurement ID

You need a **GA4** property (Measurement ID format **G-XXXXXXXXXX**).  
**Not** Universal Analytics (UA-…).

**Option A – Use an existing GA4 property**

1. [Google Analytics](https://analytics.google.com/) → **Admin** (gear).
2. In **Property** column: select your website property.
3. **Property settings** → **Data streams** → click your **Web** stream.
4. Copy **Measurement ID** (e.g. `G-ABC123XY`).
5. Use that as `GA_MEASUREMENT_ID` on Render (Step 2a).

**Option B – Create a new GA4 property (recommended if current one has no data)**

1. [Google Analytics](https://analytics.google.com/) → **Admin**.
2. **Create property**:
   - Property name: e.g. `Sweet Home Production`.
   - Time zone and currency as needed → **Next** → **Create**.
3. **Set up a data stream** → **Web**:
   - URL: `https://sweet-home.co.il` (or your live domain).
   - Stream name: e.g. `Sweet Home Website`.
   - **Create stream**.
4. Copy the **Measurement ID** (e.g. `G-XXXXXXXXXX`).
5. Set **exactly** that value as `GA_MEASUREMENT_ID` on Render (Step 2a).

After redeploy, repeat Step 1: View Source and confirm you see **“GA: Measurement ID is set”** and the gtag script.

---

## Step 3: If GA is loaded but still 0 data

- **Wait 24–48 hours** – GA reporting can lag; Realtime is faster (minutes).
- **Realtime check:**
  - GA4 → **Reports** → **Realtime**.
  - Open the site in another tab and click around. You should see at least 1 user in Realtime.
- **Ad blockers / privacy** – Test in incognito with extensions disabled; GA is blocked by many ad blockers.
- **Correct property** – In GA, make sure you’re in the **same property** whose Measurement ID is in `GA_MEASUREMENT_ID`.

---

## Step 4: Optional – Consent (only if you use a banner)

- Default in the app: `GA_CONSENT_DEFAULT` is **granted** (so GA runs without a banner).
- If you set `GA_CONSENT_DEFAULT=denied` for a consent banner, you **must** call `gtag('consent', 'update', { analytics_storage: 'granted' })` when the user accepts; otherwise GA may not send data.

---

## Quick reference

| Check | What to do |
|-------|------------|
| View Source shows “GA: NOT SET” | Set `GA_MEASUREMENT_ID` on Render and redeploy. |
| Need a new GA4 ID | Create GA4 property → Web stream → copy Measurement ID (G-…) → set on Render. |
| GA loaded but 0 in reports | Confirm correct property, try Realtime, test without ad blockers. |
| Admin/superadmin pages | GA is intentionally **not** loaded on `/admin` and `/superadmin`; that’s normal. |

---

## Summary

1. **Confirm on live site:** View Source → no “GA: NOT SET”.
2. **Set `GA_MEASUREMENT_ID`** in Render to a **GA4** Measurement ID (**G-XXXXXXXXXX**).
3. **Redeploy** after changing env vars.
4. **Recheck** View Source and GA4 Realtime.

After this, GA should start receiving data and the huge gap between your internal analytics and GA should close (aside from normal differences: bots, ad blockers, and JS-off users).
