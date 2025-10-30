-- Migration: Change bedrooms INTEGER to rooms NUMERIC(4,1)
-- This allows decimal values like 2.5, 3.5 for German properties
-- Existing integer values will be preserved (e.g., 2 becomes 2.0)

-- Step 1: Rename the column from bedrooms to rooms and change type
ALTER TABLE properties 
  RENAME COLUMN bedrooms TO rooms;

-- Step 2: Change the data type from INTEGER to NUMERIC(4,1) to support decimals
ALTER TABLE properties 
  ALTER COLUMN rooms TYPE NUMERIC(4,1) USING rooms::NUMERIC(4,1);

-- Step 3: Add comment to document the change
COMMENT ON COLUMN properties.rooms IS 'Number of rooms (supports decimal values like 2.5 for half-rooms below 9 sqm in Germany). Previously called bedrooms.';

