# Geolocation Setup Guide

This guide explains how to set up MaxMind GeoLite2 for country tracking in analytics.

## Step 1: Create MaxMind Account

1. Go to https://www.maxmind.com/en/geolite2/signup
2. Create a free account (email verification required)
3. Log in to your account

## Step 2: Download GeoLite2 Database

1. After logging in, go to: https://www.maxmind.com/en/accounts/current/geoip/downloads
2. Download **GeoLite2-Country** (MMDB format)
3. Extract the `.mmdb` file from the downloaded archive

## Step 3: Place Database File

Place the `GeoLite2-Country.mmdb` file in one of these locations (in order of preference):

1. `data/GeoLite2-Country.mmdb` (create `data` folder if needed)
2. `GeoLite2-Country.mmdb` (project root)
3. Or set `GEOLITE2_DB_PATH` environment variable to the full path

## Step 4: Install Dependencies

```bash
npm install
```

This will install the `maxmind` package.

## Step 5: Run Database Migration

Run the SQL migration to add the country column:

```sql
-- Run this in your PostgreSQL database
ALTER TABLE analytics_events 
ADD COLUMN IF NOT EXISTS country VARCHAR(2);

CREATE INDEX IF NOT EXISTS idx_analytics_events_country ON analytics_events(country);
```

Or run the migration file:
```bash
psql -d your_database -f mitigations/add_country_to_analytics.sql
```

## Step 6: Restart Your Server

Restart your Node.js server. The geolocation database will be loaded automatically.

## Step 7: Verify It's Working

1. Visit your site from different locations (or use a VPN)
2. Check the analytics dashboard
3. You should see a "Visitors by country" section showing country breakdown

## Updating the Database

The GeoLite2 database should be updated monthly for best accuracy:

1. Download the latest version from MaxMind
2. Replace the old `.mmdb` file
3. Restart your server

## Troubleshooting

### "GeoLite2 database not found" warning

- Make sure the `.mmdb` file is in one of the expected locations
- Check file permissions (should be readable)
- Verify the file is not corrupted

### Country shows as NULL

- The IP might be a local/private IP (127.0.0.1, 192.168.x.x, etc.)
- The IP might be from a VPN/proxy that can't be geolocated
- The database might need updating

### Performance

- The database is loaded into memory on startup
- Lookups are very fast (< 1ms)
- No external API calls needed

## Privacy Note

- IP addresses are stored in the database for analytics
- Country codes (not full IPs) are displayed in the dashboard
- Consider GDPR/privacy regulations in your region
- You may want to hash or anonymize IPs if required by law
