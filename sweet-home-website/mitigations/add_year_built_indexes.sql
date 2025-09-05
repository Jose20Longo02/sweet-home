-- Idempotent migration to ensure year_built column exists and is indexed

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS year_built INTEGER;

CREATE INDEX IF NOT EXISTS idx_properties_year_built
  ON properties (year_built);


