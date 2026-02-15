-- Migration: Create analytics_events table
-- Version: 1.0.0
-- Description: Core analytics events table for storing all tracking events
-- Module: analytics-migration

-- Enable uuid-ossp extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create analytics_events table
CREATE TABLE IF NOT EXISTS analytics_events (
  -- Unique event identifier
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Event name (e.g., scan_page_view, poster_save_clicked)
  event_name TEXT NOT NULL,

  -- Associated scan request ID
  scan_id TEXT,

  -- Anonymous device identifier
  device_id TEXT NOT NULL,

  -- Anonymous session identifier (tab-scoped)
  session_id TEXT,

  -- Traffic source attribution (e.g., poster_qr)
  src TEXT,

  -- Event status (e.g., success, error)
  status TEXT,

  -- Error code following {domain}_{type} format
  error_code TEXT,

  -- Duration in milliseconds for performance tracking
  duration_ms INTEGER,

  -- Flexible JSON payload for additional event properties
  props JSONB,

  -- Event timestamp with timezone
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add table and column comments
COMMENT ON TABLE analytics_events IS 'Core analytics events table for storing all tracking events';
COMMENT ON COLUMN analytics_events.id IS 'Unique event identifier';
COMMENT ON COLUMN analytics_events.event_name IS 'Event name (e.g., scan_page_view, poster_save_clicked)';
COMMENT ON COLUMN analytics_events.scan_id IS 'Associated scan request ID';
COMMENT ON COLUMN analytics_events.device_id IS 'Anonymous device identifier';
COMMENT ON COLUMN analytics_events.session_id IS 'Anonymous session identifier (tab-scoped)';
COMMENT ON COLUMN analytics_events.src IS 'Traffic source attribution (e.g., poster_qr)';
COMMENT ON COLUMN analytics_events.status IS 'Event status (e.g., success, error)';
COMMENT ON COLUMN analytics_events.error_code IS 'Error code following {domain}_{type} format';
COMMENT ON COLUMN analytics_events.duration_ms IS 'Duration in milliseconds for performance tracking';
COMMENT ON COLUMN analytics_events.props IS 'Flexible JSON payload for additional event properties';
COMMENT ON COLUMN analytics_events.created_at IS 'Event timestamp with timezone';

-- Create indexes for query optimization

-- Index for querying funnel events by time range
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_name_created
  ON analytics_events (event_name, created_at DESC);

-- Index for querying all events for a specific scan
CREATE INDEX IF NOT EXISTS idx_analytics_events_scan_id_created
  ON analytics_events (scan_id, created_at DESC)
  WHERE scan_id IS NOT NULL;

-- Index for device-level analytics and UV/PV dedupe
CREATE INDEX IF NOT EXISTS idx_analytics_events_device_id_created
  ON analytics_events (device_id, created_at DESC);

-- Optional: GIN index for JSONB queries on props field
-- This enables efficient querying of event properties
CREATE INDEX IF NOT EXISTS idx_analytics_events_props_gin
  ON analytics_events USING GIN (props);

-- Optional: Partial index for events with status = 'error'
-- Useful for monitoring and error tracking
CREATE INDEX IF NOT EXISTS idx_analytics_events_error_status
  ON analytics_events (status, created_at DESC)
  WHERE status = 'error';

-- Optional: Index for session-based analytics
CREATE INDEX IF NOT EXISTS idx_analytics_events_session_created
  ON analytics_events (session_id, created_at DESC)
  WHERE session_id IS NOT NULL;

-- Optional: Index for source attribution queries
CREATE INDEX IF NOT EXISTS idx_analytics_events_src_created
  ON analytics_events (src, created_at DESC)
  WHERE src IS NOT NULL;
