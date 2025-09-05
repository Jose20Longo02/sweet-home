-- Idempotent migration: add sold flag and sold_at timestamp to properties
-- Run this manually in pgAdmin 4, safe to run multiple times

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS sold BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sold_at TIMESTAMPTZ NULL;

-- Helpful indexes for recent sold queries
CREATE INDEX IF NOT EXISTS idx_properties_sold ON properties (sold);
CREATE INDEX IF NOT EXISTS idx_properties_sold_at ON properties (sold_at DESC);


