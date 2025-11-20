-- Create activity_logs table for tracking team actions
-- Tracks: property/project create, edit, delete actions with user and timestamp

CREATE TABLE IF NOT EXISTS activity_logs (
  id SERIAL PRIMARY KEY,
  action_type VARCHAR(50) NOT NULL, -- 'property_created', 'property_updated', 'property_deleted', 'project_created', 'project_updated', 'project_deleted'
  entity_type VARCHAR(20) NOT NULL, -- 'property' or 'project'
  entity_id INTEGER NOT NULL,
  entity_title VARCHAR(255), -- Store title for reference even if entity is deleted
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  user_name VARCHAR(255), -- Store user name for reference even if user is deleted
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_entity_type_id ON activity_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action_type ON activity_logs(action_type);

