-- Idempotent: store GA4 client_id on leads for acquisition lookup later
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS ga_client_id VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_leads_ga_client_id
  ON leads (ga_client_id)
  WHERE ga_client_id IS NOT NULL;
