-- Add country column to analytics_events table for geolocation tracking
-- This allows tracking which countries visitors are from

ALTER TABLE analytics_events 
ADD COLUMN IF NOT EXISTS country VARCHAR(2);

-- Create index for country lookups
CREATE INDEX IF NOT EXISTS idx_analytics_events_country ON analytics_events(country);

-- Add comment
COMMENT ON COLUMN analytics_events.country IS 'ISO 3166-1 alpha-2 country code (e.g., US, GB, CY) from IP geolocation';
