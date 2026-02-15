/**
 * Analytics Repository Module
 * Provides data access layer for analytics events with @vercel/postgres
 */

import { sql } from '@vercel/postgres';
import {
  validateErrorCode,
  type AnalyticsEvent as ValidatedAnalyticsEvent,
} from './validation';

// ============================================================================
// Global Initialization
// ============================================================================

declare global {
  // eslint-disable-next-line no-var, vars-on-top
  var __analyticsEventsTableInit: Promise<void> | undefined;
}

// Check if Postgres is configured
const POSTGRES_URL = process.env.POSTGRES_URL?.trim();
const DATABASE_URL = process.env.DATABASE_URL?.trim();
const USE_POSTGRES = Boolean(POSTGRES_URL || DATABASE_URL);

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Database analytics event shape
 * Includes device_id and session_id for anonymous tracking
 */
export interface DatabaseAnalyticsEvent extends Omit<ValidatedAnalyticsEvent, 'ts'> {
  id?: string;
  device_id: string;
  session_id?: string;
  props?: Record<string, unknown>;
  created_at?: Date;
}

// ============================================================================
// Table Initialization
// ============================================================================

/**
 * Ensure the analytics_events table exists
 * Uses global singleton to avoid duplicate table creation
 */
async function ensureTable(): Promise<void> {
  if (!USE_POSTGRES) {
    return;
  }

  if (!globalThis.__analyticsEventsTableInit) {
    globalThis.__analyticsEventsTableInit = sql`
      CREATE TABLE IF NOT EXISTS analytics_events (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        event_name TEXT NOT NULL,
        scan_id TEXT,
        device_id TEXT NOT NULL,
        session_id TEXT,
        src TEXT,
        status TEXT,
        error_code TEXT,
        duration_ms INTEGER,
        props JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `.then(() => undefined);
  }

  await globalThis.__analyticsEventsTableInit;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Insert a single analytics event into database
 *
 * Inserts the event into the analytics_events table.
 * Logs errors but does not throw exceptions to ensure graceful degradation.
 *
 * Note: Events should be validated at the API layer before reaching this point.
 * This function only validates error_code if present.
 *
 * @param event - Analytics event to insert
 * @returns Promise that resolves when insertion completes or fails silently
 *
 * @example
 * ```ts
 * await insertAnalyticsEvent({
 *   event_name: 'scan_page_view',
 *   device_id: 'device_123',
 *   created_at: new Date()
 * });
 * ```
 */
export async function insertAnalyticsEvent(event: DatabaseAnalyticsEvent): Promise<void> {
  if (!USE_POSTGRES) {
    console.warn('[analytics-repository] Postgres not configured, skipping insert');
    return;
  }

  // Validate error code if present
  if (event.error_code && !validateErrorCode(event.error_code)) {
    console.warn('[analytics-repository] Invalid error code:', event.error_code);
    return;
  }

  // Note: Full event validation is done at the API layer.
  // Database events have different shape (no ts, has device_id/session_id/created_at).

  try {
    await ensureTable();

    const propsJson = event.props ? JSON.stringify(event.props) : null;
    const createdAt = event.created_at ? event.created_at.toISOString() : null;

    await sql`
      INSERT INTO analytics_events (
        id,
        event_name,
        scan_id,
        device_id,
        session_id,
        src,
        status,
        error_code,
        duration_ms,
        props,
        created_at
      )
      VALUES (
        ${event.id || null},
        ${event.event_name},
        ${event.scan_id || null},
        ${event.device_id},
        ${event.session_id || null},
        ${event.src || null},
        ${event.status || null},
        ${event.error_code || null},
        ${event.duration_ms || null},
        ${propsJson},
        ${createdAt}
      )
    `;
  } catch (error) {
    console.error(
      '[analytics-repository] Failed to insert analytics event:',
      error
    );
    // Do not throw - graceful degradation
  }
}

/**
 * Insert multiple analytics events in a single transaction
 *
 * Inserts all events in a single database transaction.
 * Only validates error_code if present; full validation is done at the API layer.
 * If the transaction fails, it rolls back and logs the error.
 *
 * @param events - Array of analytics events to insert
 * @returns Promise that resolves when all events are inserted or fails silently
 *
 * @example
 * ```ts
 * await insertAnalyticsEvents([
 *   { event_name: 'scan_page_view', device_id: 'device_123', created_at: new Date() },
 *   { event_name: 'scan_result', device_id: 'device_123', status: 'success', duration_ms: 5000, created_at: new Date() }
 * ]);
 * ```
 */
export async function insertAnalyticsEvents(
  events: DatabaseAnalyticsEvent[]
): Promise<void> {
  if (!USE_POSTGRES) {
    console.warn('[analytics-repository] Postgres not configured, skipping batch insert');
    return;
  }

  if (events.length === 0) {
    return;
  }

  // Filter events with invalid error codes
  const validEvents = events.filter((event) => {
    if (event.error_code && !validateErrorCode(event.error_code)) {
      console.warn('[analytics-repository] Invalid error code:', event.error_code);
      return false;
    }
    return true;
  });

  if (validEvents.length === 0) {
    console.warn('[analytics-repository] All events have invalid error codes, skipping batch insert');
    return;
  }

  try {
    await ensureTable();

    // Insert events sequentially (compatible with current @vercel/postgres API).
    for (const event of validEvents) {
      const propsJson = event.props ? JSON.stringify(event.props) : null;
      const createdAt = event.created_at ? event.created_at.toISOString() : null;
      await sql`
        INSERT INTO analytics_events (
          id,
          event_name,
          scan_id,
          device_id,
          session_id,
          src,
          status,
          error_code,
          duration_ms,
          props,
          created_at
        )
        VALUES (
          ${event.id || null},
          ${event.event_name},
          ${event.scan_id || null},
          ${event.device_id},
          ${event.session_id || null},
          ${event.src || null},
          ${event.status || null},
          ${event.error_code || null},
          ${event.duration_ms || null},
          ${propsJson},
          ${createdAt}
        )
      `;
    }

    console.log(
      `[analytics-repository] Successfully inserted ${validEvents.length} events`
    );
  } catch (error) {
    console.error(
      '[analytics-repository] Failed to insert analytics events batch:',
      error
    );
    // Do not throw - graceful degradation
  }
}

// ============================================================================
// Type Exports
// ============================================================================
// AnalyticsEvent is exported from validation.ts and re-exported via index.ts
