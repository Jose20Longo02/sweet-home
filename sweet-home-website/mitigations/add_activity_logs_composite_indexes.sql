-- Add composite indexes for optimized filtering on activity_logs table
-- These indexes improve query performance when multiple filters are applied

-- Index for common filter combination: action_type + entity_type
CREATE INDEX IF NOT EXISTS idx_activity_logs_action_entity 
ON activity_logs(action_type, entity_type);

-- Index for date range queries with user filtering
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_user 
ON activity_logs(created_at DESC, user_id);

-- Index for full-text search on entity_title (for LIKE queries)
-- Note: Full-text search with leading % won't use this efficiently, but it helps with exact matches
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity_title 
ON activity_logs(entity_title) 
WHERE entity_title IS NOT NULL;

-- Composite index for common filter: entity_type + created_at (for entity type with date sorting)
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity_created 
ON activity_logs(entity_type, created_at DESC);

