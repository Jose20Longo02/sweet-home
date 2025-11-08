-- Make agent_id nullable to allow unassigned properties
ALTER TABLE properties ALTER COLUMN agent_id DROP NOT NULL;
-- Align DB schema with application expectations (idempotent)
-- Run this in pgAdmin 4. Safe to re-run.

-- =============================
-- Users
-- =============================
-- 1) Normalize roles: change legacy 'Agent' to 'Admin'
UPDATE users SET role = 'Admin' WHERE role = 'Agent';

-- 2) Add missing profile/metadata columns
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS area VARCHAR(100),
  ADD COLUMN IF NOT EXISTS position VARCHAR(100),
  ADD COLUMN IF NOT EXISTS bmby_username VARCHAR(150),
  ADD COLUMN IF NOT EXISTS reset_token_hash TEXT,
  ADD COLUMN IF NOT EXISTS reset_token_expires_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS reset_requested_at TIMESTAMP;

-- 3) Ensure role constraint allows only Admin/SuperAdmin
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'chk_users_role_allowed'
       AND conrelid = 'users'::regclass
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT chk_users_role_allowed
      CHECK (role IN ('Admin','SuperAdmin'));
  END IF;
END$$;

-- =============================
-- Leads
-- =============================
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS project_id INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'leads_project_id_fkey'
       AND conrelid = 'leads'::regclass
  ) THEN
    ALTER TABLE leads
      ADD CONSTRAINT leads_project_id_fkey
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_leads_project_id ON leads(project_id);

-- =============================
-- Projects
-- =============================
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS agent_id INTEGER,
  ADD COLUMN IF NOT EXISTS slug VARCHAR(255),
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS unit_types TEXT[],
  ADD COLUMN IF NOT EXISTS features JSONB,
  ADD COLUMN IF NOT EXISTS specifications JSONB,
  ADD COLUMN IF NOT EXISTS location_details TEXT,
  ADD COLUMN IF NOT EXISTS total_units INTEGER,
  ADD COLUMN IF NOT EXISTS completion_date DATE,
  ADD COLUMN IF NOT EXISTS price_range TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'projects_agent_id_fkey'
       AND conrelid = 'projects'::regclass
  ) THEN
    ALTER TABLE projects
      ADD CONSTRAINT projects_agent_id_fkey
      FOREIGN KEY (agent_id) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END$$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_slug_unique ON projects(slug);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

-- =============================
-- Properties
-- =============================
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS created_by INTEGER,
  ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS inquiry_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS year_built INTEGER,
  ADD COLUMN IF NOT EXISTS map_link TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'properties_created_by_fkey'
       AND conrelid = 'properties'::regclass
  ) THEN
    ALTER TABLE properties
      ADD CONSTRAINT properties_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_properties_location ON properties(country, city);
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_featured ON properties(featured);

-- Ensure slug is unique via index if a constraint is not present
CREATE UNIQUE INDEX IF NOT EXISTS idx_properties_slug_unique ON properties(slug);


