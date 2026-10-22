-- Energy certificate (Energieausweis) fields on sale listings.
-- Safe to run more than once.

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS energy_certificate_type VARCHAR(20),
  ADD COLUMN IF NOT EXISTS energy_value NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS energy_efficiency_class VARCHAR(3),
  ADD COLUMN IF NOT EXISTS energy_sources TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS energy_certificate_year INTEGER,
  ADD COLUMN IF NOT EXISTS heating_type VARCHAR(40);
