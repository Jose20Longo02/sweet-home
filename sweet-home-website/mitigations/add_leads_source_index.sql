-- Idempotent index to speed filtering by lead source (buyer/seller/unknown)
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);


