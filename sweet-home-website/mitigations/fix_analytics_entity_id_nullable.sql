-- Fix analytics_events table to allow NULL entity_id
-- This is needed because page_view events don't have an entity_id
-- Run this in your PostgreSQL database (pgAdmin, psql, etc.)

ALTER TABLE analytics_events ALTER COLUMN entity_id DROP NOT NULL;
