-- Rollback: Drop analytics_events table
-- Version: 1.0.0
-- Description: Rollback script for analytics_events table
-- Module: analytics-migration

-- Drop indexes first (in case they exist)
DROP INDEX IF EXISTS idx_analytics_events_src_created;
DROP INDEX IF EXISTS idx_analytics_events_session_created;
DROP INDEX IF EXISTS idx_analytics_events_error_status;
DROP INDEX IF EXISTS idx_analytics_events_props_gin;
DROP INDEX IF EXISTS idx_analytics_events_device_id_created;
DROP INDEX IF EXISTS idx_analytics_events_scan_id_created;
DROP INDEX IF EXISTS idx_analytics_events_event_name_created;

-- Drop the analytics_events table
DROP TABLE IF EXISTS analytics_events;

-- Note: We do NOT drop the uuid-ossp extension as it may be used by other tables
-- If you want to drop it when no other tables use it, uncomment the following:
-- DROP EXTENSION IF EXISTS "uuid-ossp";
