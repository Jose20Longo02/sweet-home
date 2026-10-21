-- Furnished apartments, stage 1.
-- New table only. Does not alter properties, leads, or sale search.

CREATE TABLE IF NOT EXISTS furnished_rentals (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  title_i18n JSONB NOT NULL DEFAULT '{}'::jsonb,
  slug VARCHAR(255) NOT NULL UNIQUE,
  slug_i18n JSONB NOT NULL DEFAULT '{}'::jsonb,
  description TEXT NOT NULL,
  description_i18n JSONB NOT NULL DEFAULT '{}'::jsonb,
  photos TEXT[] NOT NULL DEFAULT '{}',
  city VARCHAR(100) NOT NULL DEFAULT 'Berlin',
  neighborhood VARCHAR(100),
  full_address TEXT,
  size_sqm NUMERIC(8,2),
  rooms INTEGER,
  floor INTEGER,
  monthly_rent NUMERIC(12,2) NOT NULL,
  deposit NUMERIC(12,2),
  utilities_included BOOLEAN NOT NULL DEFAULT false,
  utilities_amount NUMERIC(12,2),
  utilities_note TEXT,
  available_from DATE,
  min_stay_months INTEGER,
  max_stay_months INTEGER,
  furnished BOOLEAN NOT NULL DEFAULT true,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  agent_id INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS furnished_rentals_slug_en_unique
  ON furnished_rentals ((slug_i18n->>'en'))
  WHERE COALESCE(slug_i18n->>'en', '') <> '';

ALTER TABLE furnished_rentals
  ADD COLUMN IF NOT EXISTS content_language VARCHAR(2) NOT NULL DEFAULT 'de',
  ADD COLUMN IF NOT EXISTS utilities_note_i18n JSONB NOT NULL DEFAULT '{}'::jsonb;
