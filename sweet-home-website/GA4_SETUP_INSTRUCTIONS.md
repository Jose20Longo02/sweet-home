# How to Create a New GA4 Property and Connect It to This Website

Follow these steps to create a Google Analytics 4 (GA4) property and connect it to your Sweet Home website.

---

## Part 1: Create a GA4 Property in Google Analytics

### Step 1: Open Google Analytics

1. Go to **[analytics.google.com](https://analytics.google.com)**.
2. Sign in with the Google account you want to use for analytics.

### Step 2: Create a new property

1. Click the **gear icon (Admin)** at the bottom left.
2. In the **Account** column, select your account (or create one).
3. In the **Property** column, click **"+ Create property"**.
4. **Property name:** e.g. `Sweet Home Website` or `Sweet Home Production`.
5. **Reporting time zone:** Choose your time zone (e.g. Israel, or your main market).
6. **Currency:** e.g. EUR (or your primary currency).
7. Click **Next**.
8. **Industry category:** e.g. Real Estate.
9. **Business size:** Choose the option that fits (e.g. Small).
10. Click **Next**.
11. **Business objectives:** Select what applies (e.g. Get baseline reports, Measure advertising ROI).
12. Click **Create**.
13. Accept the **Terms of Service** if prompted.

---

## Part 2: Create a Web Data Stream

After the property is created, you’ll be asked to set up a data stream.

1. **Platform:** Select **Web**.
2. **Website URL:** Enter your live site URL, e.g.  
   `https://sweet-home.co.il`  
   (use your real domain; no trailing slash).
3. **Stream name:** e.g. `Sweet Home Website` or `Production`.
4. Leave **Enhanced measurement** turned **On** (page views, scrolls, outbound clicks, etc.).
5. Click **Create stream**.

### Get your Measurement ID

1. On the stream details page you’ll see **Measurement ID** at the top right.
2. It looks like: **`G-XXXXXXXXXX`** (e.g. `G-ABC12XYZ0`).
3. **Copy this value** — you’ll use it in Part 3.

---

## Part 3: Connect the Website to GA4

Your site uses the **Measurement ID** via the environment variable **`GA_MEASUREMENT_ID`**. Set it everywhere the app runs.

### A. Production (Render)

1. Go to **[dashboard.render.com](https://dashboard.render.com)**.
2. Open your **Web Service** for this project (e.g. sweet-home-website).
3. In the left sidebar, click **Environment**.
4. Under **Environment Variables**, click **Add Environment Variable** (or edit if it already exists).
5. **Key:** `GA_MEASUREMENT_ID`  
   **Value:** paste your Measurement ID (e.g. `G-ABC12XYZ0`).
6. Click **Save Changes**.
7. Render will redeploy the service. Wait for the deploy to finish.

### B. Local development (.env)

1. In your project root, open the **`.env`** file (create it from `.env.example` if needed).
2. Add or update:
   ```bash
   GA_MEASUREMENT_ID=G-XXXXXXXXXX
   ```
   Replace `G-XXXXXXXXXX` with your real Measurement ID.
3. Save the file. Restart the app if it’s already running.

---

## Part 4: Verify It’s Working

### 1. Check that GA is loaded on the live site

1. Open your **live** site in a **private/incognito** window (e.g. `https://sweet-home.co.il`).
2. Right‑click the page → **View Page Source** (or press Ctrl+U / Cmd+U).
3. In the source, search for:
   - **`googletagmanager.com/gtag/js?id=G-`** — the GA script should be there.
   - **`GA: Measurement ID is set`** — confirms the app sees the ID.

If you see **`GA: NOT SET`** instead, the env var is not set correctly in that environment (e.g. Render). Double‑check the variable name and redeploy.

### 2. Check Realtime in GA4

1. In [analytics.google.com](https://analytics.google.com), open your **new GA4 property**.
2. In the left menu: **Reports** → **Realtime**.
3. In another tab, open your live site and click around (home, a property, etc.).
4. Within 1–2 minutes you should see **at least 1 user** and some events in Realtime.

If Realtime stays at 0 after 5 minutes:

- Confirm **the same** Measurement ID is in Render and in the script (View Source).
- Try without ad blockers or privacy extensions.
- Make sure you’re looking at the correct GA4 property (the one you just created).

### 3. Optional: DebugView (for developers)

1. In Chrome, install the extension **Google Analytics Debugger** (or use [Tag Assistant](https://tagassistant.google.com/)).
2. Enable the debugger and reload your site.
3. In GA4: **Admin** → **DebugView** (under your Web stream).
4. You should see events in real time while the debugger is on.

---

## Summary Checklist

- [ ] GA4 property created (Admin → Create property).
- [ ] Web data stream created with your live website URL.
- [ ] Measurement ID (G-XXXXXXXXXX) copied.
- [ ] `GA_MEASUREMENT_ID` set on **Render** (Environment) and app redeployed.
- [ ] `GA_MEASUREMENT_ID` set in local **`.env`** for development.
- [ ] View Source on live site shows GA script and “Measurement ID is set”.
- [ ] GA4 **Realtime** report shows at least 1 user when you browse the site.

---

## Notes

- **Admin/superadmin pages:** GA is intentionally **not** loaded on `/admin` and `/superadmin`; that’s normal.
- **Consent:** The app defaults to `GA_CONSENT_DEFAULT=granted`. If you add a cookie banner later, set `GA_CONSENT_DEFAULT=denied` and update consent when the user accepts.
- **Data delay:** Realtime is fast; standard reports can take 24–48 hours to populate.

If you follow these steps, your new GA4 property is created and correctly connected to this website.
