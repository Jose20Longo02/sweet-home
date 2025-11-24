-- Create analytics_events table for detailed event tracking
-- Tracks individual events (views, clicks, form submissions) with timestamps
-- This enables time-based analytics and detailed reporting

CREATE TABLE IF NOT EXISTS analytics_events (
  id SERIAL PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL, -- 'property_view', 'project_view', 'email_click', 'phone_click', 'whatsapp_click', 'form_submit'
  entity_type VARCHAR(20) NOT NULL, -- 'property' or 'project'
  entity_id INTEGER NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL, -- Optional: track if user is logged in
  session_id VARCHAR(255), -- Track user sessions
  ip_address VARCHAR(45), -- IPv4 or IPv6
  user_agent TEXT,
  referrer TEXT,
  country VARCHAR(100),
  city VARCHAR(100),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for optimized queries
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_entity ON analytics_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session ON analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_location ON analytics_events(country, city);

-- Composite index for common queries (entity + date)
CREATE INDEX IF NOT EXISTS idx_analytics_events_entity_date ON analytics_events(entity_type, entity_id, created_at DESC);

