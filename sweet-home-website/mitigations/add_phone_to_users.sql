-- Add phone number field to users table (idempotent)
-- You can run this multiple times safely
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'phone'
  ) THEN
    ALTER TABLE users ADD COLUMN phone VARCHAR(50);
    COMMENT ON COLUMN users.phone IS 'User phone number for contact purposes';
  END IF;
END $$;
