-- Create project_stats table for tracking project analytics
-- Similar to property_stats but for projects

CREATE TABLE IF NOT EXISTS project_stats (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  views INTEGER DEFAULT 0,
  email_clicks INTEGER DEFAULT 0,
  whatsapp_clicks INTEGER DEFAULT 0,
  phone_clicks INTEGER DEFAULT 0,
  last_updated TIMESTAMP DEFAULT NOW(),
  UNIQUE(project_id)
);

CREATE INDEX IF NOT EXISTS idx_project_stats_project_id ON project_stats(project_id);
CREATE INDEX IF NOT EXISTS idx_project_stats_views ON project_stats(views DESC);
CREATE INDEX IF NOT EXISTS idx_project_stats_last_updated ON project_stats(last_updated DESC);

