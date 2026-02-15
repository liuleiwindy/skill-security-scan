/**
 * Analytics Track Module
 *
 * Single business entrypoint for all analytics tracking.
 *
 * Design principles:
 * - Single entrypoint: All business code must call track() only
 * - Dual-write strategy: GA4 + backend (both called)
 * - GA4 is optional: No-op if not configured
 * - Backend is mandatory: Always called
 * - Fire-and-forget: Returns void, never blocks business logic
 * - Error-tolerant: Never throws errors, fails gracefully
 *
 * Event flow:
 * 1. Business code calls track(eventName, props)
 * 2. enrichEventContext() adds device_id, session_id, ts, page context, src
 * 3. sendToGA4() sends event to GA4 (no-op if not configured)
 * 4. sendToBackendSingle() sends event to backend API
 */

import { enrichEventContext, type EnrichedEventContext } from './context';
import { sendToGA4 } from './sinks/ga4';
import { sendToBackendSingle } from './sinks/backend';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Track function signature
 *
 * @param eventName - The name of the event to track
 * @param props - Optional event properties to include
 *
 * @example
 * ```ts
 * // Track a page view
 * track('scan_page_view');
 *
 * // Track a button click with properties
 * track('scan_submit_clicked', { input_type: 'github_url' });
 *
 * // Track a result with multiple properties
 * track('scan_result', { status: 'success', duration_ms: 1500, scan_id: 'xxx' });
 * ```
 */
export type TrackFunction = (eventName: string, props?: Record<string, unknown>) => void;

// ============================================================================
// Constants
// ============================================================================

/**
 * Allowed event names whitelist
 *
 * Only events in this list can be tracked. This prevents typos and ensures
 * consistent event naming across the application.
 */
export const EVENT_WHITELIST = [
  'scan_page_view',
  'scan_submit_clicked',
  'scan_result',
  'report_page_view',
  'poster_page_view',
  'poster_save_clicked',
  'poster_download_result',
  'poster_share_result',
  'poster_qr_visit',
] as const;

/**
 * Event name type (union of all allowed events)
 */
export type EventName = (typeof EVENT_WHITELIST)[number];

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate event name against whitelist
 *
 * @param eventName - Event name to validate
 * @returns true if event name is allowed, false otherwise
 */
function isValidEventName(eventName: string): eventName is EventName {
  return EVENT_WHITELIST.includes(eventName as EventName);
}

/**
 * Log warning for invalid event name
 *
 * @param eventName - Invalid event name
 */
function warnInvalidEventName(eventName: string): void {
  if (typeof console !== 'undefined' && console.warn) {
    console.warn(
      `[Analytics] Invalid event name "${eventName}". ` +
        `Must be one of: ${EVENT_WHITELIST.join(', ')}`
    );
  }
}

/**
 * Log error from sink without throwing
 *
 * @param sinkName - Name of the sink that failed (e.g., 'GA4', 'Backend')
 * @param error - Error that occurred
 */
function logSinkError(sinkName: string, error: unknown): void {
  if (typeof console !== 'undefined' && console.error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[Analytics] ${sinkName} sink error: ${message}`);
  }
}

// ============================================================================
// Core Track Function
// ============================================================================

/**
 * Track an analytics event - single business entrypoint for all tracking
 *
 * This is the main function that business code should use for all analytics
 * tracking. It provides a unified interface that:
 *
 * - Enriches events with shared context (device_id, session_id, ts, etc.)
 * - Sends events to both GA4 and backend (dual-write)
 * - Handles errors gracefully (never throws)
 * - Doesn't block business logic (fire-and-forget)
 * - Works offline (fails silently if sinks are unavailable)
 *
 * Event flow:
 * 1. Validate event name against whitelist
 * 2. Enrich event with context (device_id, session_id, ts, page context, src)
 * 3. Send to GA4 (no-op if not configured)
 * 4. Send to backend (always called)
 * 5. Log errors if sinks fail (don't throw)
 *
 * @param eventName - The name of the event to track
 * @param props - Optional event properties to include
 * @returns void (fire-and-forget, never blocks business logic)
 *
 * @example
 * ```ts
 * import { track } from '@/lib/analytics/track'
 *
 * // Track a page view
 * track('scan_page_view');
 *
 * // Track a button click with properties
 * track('scan_submit_clicked', { input_type: 'github_url' });
 *
 * // Track a result with multiple properties
 * track('scan_result', { status: 'success', duration_ms: 1500, scan_id: 'xxx' });
 * ```
 */
export const track: TrackFunction = (eventName: string, props: Record<string, unknown> = {}): void => {
  // Step 1: Validate event name
  if (!isValidEventName(eventName)) {
    warnInvalidEventName(eventName);
    return; // Exit early for invalid event names (fail silently)
  }

  // Step 2: Enrich event with shared context
  let enrichedEvent: EnrichedEventContext;
  try {
    enrichedEvent = enrichEventContext(eventName, props);
  } catch (error) {
    // If context enrichment fails, create a minimal event with fallback values
    logSinkError('Context', error);
    enrichedEvent = {
      event_name: eventName,
      ts: Date.now(),
      device_id: 'unknown_device',
      session_id: 'unknown_session',
      page_path: '/unknown',
      page_referrer: null,
      src: null,
      ua_basic: 'unknown_ua',
      ...props,
    };
  }

  // Step 3: Send to sinks (non-blocking)
  // Use requestIdleCallback if available to avoid blocking main thread
  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(
      () => {
        // Send to GA4 (optional - no-op if not configured)
        sendToGA4(enrichedEvent.event_name, enrichedEvent).catch((error) => {
          logSinkError('GA4', error);
        });

        // Send to backend (mandatory - always called)
        sendToBackendSingle(enrichedEvent.event_name, enrichedEvent).catch((error) => {
          logSinkError('Backend', error);
        });
      },
      { timeout: 2000 } // Maximum 2 seconds wait before executing
    );
  } else {
    // Fallback: Send immediately without blocking (use setTimeout with 0)
    setTimeout(() => {
      // Send to GA4 (optional - no-op if not configured)
      sendToGA4(enrichedEvent.event_name, enrichedEvent).catch((error) => {
        logSinkError('GA4', error);
      });

      // Send to backend (mandatory - always called)
      sendToBackendSingle(enrichedEvent.event_name, enrichedEvent).catch((error) => {
        logSinkError('Backend', error);
      });
    }, 0);
  }

  // Return void immediately (fire-and-forget)
  // Never block business logic with analytics calls
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get all allowed event names
 *
 * Useful for testing, documentation, or dynamic event validation.
 *
 * @returns Array of all allowed event names
 *
 * @example
 * ```ts
 * const allowedEvents = getAllowedEvents();
 * console.log(allowedEvents); // ['scan_page_view', 'scan_submit_clicked', ...]
 * ```
 */
export function getAllowedEvents(): readonly EventName[] {
  return EVENT_WHITELIST;
}

/**
 * Check if an event name is allowed
 *
 * @param eventName - Event name to check
 * @returns true if event name is in whitelist, false otherwise
 *
 * @example
 * ```ts
 * if (isAllowedEvent('scan_page_view')) {
 *   track('scan_page_view');
 * }
 * ```
 */
export function isAllowedEvent(eventName: string): boolean {
  return isValidEventName(eventName);
}

// ============================================================================
// Re-exports
// ============================================================================

export type { EnrichedEventContext };
