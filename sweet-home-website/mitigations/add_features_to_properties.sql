-- Idempotent migration: add features JSONB to properties and supporting indexes
-- Run in pgAdmin 4 manually

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '[]'::jsonb;

-- Backfill NULLs to empty array
UPDATE properties
   SET features = '[]'::jsonb
 WHERE features IS NULL;

-- Useful indexes for filtering
CREATE INDEX IF NOT EXISTS idx_properties_features_gin
  ON properties USING gin (features jsonb_path_ops);

-- Ensure GIN index on status_tags (TEXT[]) for overlap queries
CREATE INDEX IF NOT EXISTS idx_properties_status_tags_gin
  ON properties USING gin (status_tags);


