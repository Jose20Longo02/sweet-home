-- Add JSONB i18n columns to projects for hybrid translation storage
-- Idempotent: safe to run multiple times

ALTER TABLE IF EXISTS projects
  ADD COLUMN IF NOT EXISTS title_i18n JSONB,
  ADD COLUMN IF NOT EXISTS description_i18n JSONB,
  ADD COLUMN IF NOT EXISTS amenities_i18n JSONB; -- optional: translated amenity labels

-- Optional: GIN indexes for JSONB search/use
-- CREATE INDEX IF NOT EXISTS idx_projects_title_i18n ON projects USING GIN (title_i18n);
-- CREATE INDEX IF NOT EXISTS idx_projects_description_i18n ON projects USING GIN (description_i18n);

