-- Update bathrooms column to support decimal values
-- This allows for half bathrooms (e.g., 1.5, 2.5, etc.)

-- Change bathrooms column from INTEGER to NUMERIC(3,1)
-- NUMERIC(3,1) allows up to 3 digits total with 1 decimal place (e.g., 99.9)
ALTER TABLE properties 
ALTER COLUMN bathrooms TYPE NUMERIC(3,1);

-- Update projects table bathrooms columns as well for consistency
ALTER TABLE projects 
ALTER COLUMN min_bathrooms TYPE NUMERIC(3,1);

ALTER TABLE projects 
ALTER COLUMN max_bathrooms TYPE NUMERIC(3,1);

-- Add comment to document the change
COMMENT ON COLUMN properties.bathrooms IS 'Number of bathrooms (supports decimals for half baths, e.g., 1.5, 2.5)';
COMMENT ON COLUMN projects.min_bathrooms IS 'Minimum number of bathrooms (supports decimals for half baths)';
COMMENT ON COLUMN projects.max_bathrooms IS 'Maximum number of bathrooms (supports decimals for half baths)';
