-- Add JSONB i18n columns to properties for titles and descriptions
-- Idempotent: safe to run multiple times

ALTER TABLE IF EXISTS properties
  ADD COLUMN IF NOT EXISTS title_i18n JSONB,
  ADD COLUMN IF NOT EXISTS description_i18n JSONB,
  ADD COLUMN IF NOT EXISTS highlights_i18n JSONB; -- optional if you add highlights later

-- Optional: GIN indexes for JSONB if you plan to query/filter by localized content
-- CREATE INDEX IF NOT EXISTS idx_properties_title_i18n ON properties USING GIN (title_i18n);
-- CREATE INDEX IF NOT EXISTS idx_properties_description_i18n ON properties USING GIN (description_i18n);

