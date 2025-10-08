-- Add occupancy/rental/housegeld fields to properties
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS occupancy_type VARCHAR(30),
  ADD COLUMN IF NOT EXISTS rental_status VARCHAR(24), -- not_rented | not_rented_potential | rented
  ADD COLUMN IF NOT EXISTS rental_income NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS housegeld NUMERIC(12,2);

-- Optional checks (commented to avoid migration failures if data pre-exists)
-- ALTER TABLE properties
--   ADD CONSTRAINT properties_occupancy_type_chk CHECK (occupancy_type IN ('Empty','Short-Term Rented','Suitable for Self Use','Long-Term Rented')),
--   ADD CONSTRAINT properties_rental_status_chk CHECK (rental_status IN ('not_rented','not_rented_potential','rented'));


