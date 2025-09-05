-- Idempotent migration: add lead metadata columns for contact/owners/unknown flows
-- Safe to run multiple times

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(10),
  ADD COLUMN IF NOT EXISTS utm_source         VARCHAR(100),
  ADD COLUMN IF NOT EXISTS utm_medium         VARCHAR(100),
  ADD COLUMN IF NOT EXISTS utm_campaign       VARCHAR(150),
  ADD COLUMN IF NOT EXISTS utm_term           VARCHAR(150),
  ADD COLUMN IF NOT EXISTS utm_content        VARCHAR(150),
  ADD COLUMN IF NOT EXISTS referrer           TEXT,
  ADD COLUMN IF NOT EXISTS page_path          TEXT,
  ADD COLUMN IF NOT EXISTS ip_address         VARCHAR(64),
  ADD COLUMN IF NOT EXISTS user_agent         TEXT;

-- Helpful partial index for unknown/general leads filtering
CREATE INDEX IF NOT EXISTS idx_leads_source_created_at
  ON leads (source, created_at DESC);


