-- GA4 acquisition enrichment fields (looked up via Data API using ga_client_id)
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS ga_session_source VARCHAR(150),
  ADD COLUMN IF NOT EXISTS ga_session_medium VARCHAR(150),
  ADD COLUMN IF NOT EXISTS ga_channel_group VARCHAR(150),
  ADD COLUMN IF NOT EXISTS ga_enriched_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_leads_ga_enrich_pending
  ON leads (created_at DESC)
  WHERE ga_client_id IS NOT NULL
    AND (ga_session_source IS NULL OR ga_session_source = '');
