-- Add property fields to leads table for seller form submissions
-- Idempotent: safe to run multiple times

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS seller_neighborhood VARCHAR(255),
  ADD COLUMN IF NOT EXISTS seller_size NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS seller_rooms NUMERIC(4,1),
  ADD COLUMN IF NOT EXISTS seller_occupancy_status VARCHAR(20); -- 'empty' or 'tenanted'

-- Index for filtering seller leads by occupancy
CREATE INDEX IF NOT EXISTS idx_leads_seller_occupancy ON leads(seller_occupancy_status)
  WHERE seller_occupancy_status IS NOT NULL;

