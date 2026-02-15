/**
 * Analytics Context Module
 *
 * Enriches event payloads with shared context for analytics tracking.
 * This module provides automatic enrichment of events with:
 * - Timestamp (ts)
 * - Device identifier (device_id)
 * - Session identifier (session_id)
 * - Page context (path, referrer)
 * - Traffic source attribution (src)
 * - User agent info (ua_basic)
 *
 * Performance optimizations:
 * - Caches device_id and session_id after first retrieval
 * - Minimizes DOM reads by caching page context
 * - Avoids repeated localStorage/sessionStorage access
 *
 * Error handling:
 * - Never throws errors from context enrichment
 * - Provides sensible fallbacks when data is unavailable
 * - Gracefully degrades when browser APIs are inaccessible
 */

import { getDeviceId } from './device-id';
import { getSessionId } from './session-id';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Page context information
 */
export interface PageContext {
  /** Current page path (e.g., "/dashboard/analytics") */
  page_path: string;
  /** HTTP referrer if available */
  page_referrer: string | null;
}

/**
 * Enriched event context with all tracking fields
 */
export interface EnrichedEventContext {
  /** Event name */
  event_name: string;
  /** Event timestamp in milliseconds */
  ts: number;
  /** Anonymous device identifier */
  device_id: string;
  /** Anonymous session identifier */
  session_id: string;
  /** Current page path */
  page_path: string;
  /** HTTP referrer */
  page_referrer: string | null;
  /** Traffic source attribution from URL parameter */
  src: string | null;
  /** Basic user agent info (truncated if needed) */
  ua_basic: string;
  /** Custom event properties */
  [key: string]: unknown;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Maximum user agent length to avoid oversized payloads
 */
const MAX_USER_AGENT_LENGTH = 200;

/**
 * Fallback values for when data is unavailable
 */
const FALLBACK_VALUES = {
  device_id: 'unknown_device',
  session_id: 'unknown_session',
  page_path: '/unknown',
  page_referrer: null,
  ua_basic: 'unknown_ua',
} as const;

// ============================================================================
// Internal Caching
// ============================================================================

/**
 * Cached values to avoid repeated DOM reads and storage access
 */
const cache = {
  /** Cached device ID */
  deviceId: null as string | null,
  /** Cached session ID */
  sessionId: null as string | null,
  /** Cached page context */
  pageContext: null as PageContext | null,
  /** Cached traffic source */
  src: null as string | null,
  /** Cache timestamp to invalidate stale data */
  timestamp: 0,
};

/**
 * Cache TTL in milliseconds (5 minutes)
 */
const CACHE_TTL = 5 * 60 * 1000;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if cache is still valid
 */
function isCacheValid(): boolean {
  return Date.now() - cache.timestamp < CACHE_TTL;
}

/**
 * Get user agent string with length truncation
 */
function getUserAgent(): string {
  try {
    if (typeof navigator === 'undefined' || !navigator.userAgent) {
      return FALLBACK_VALUES.ua_basic;
    }

    const ua = navigator.userAgent;
    return ua.length > MAX_USER_AGENT_LENGTH
      ? ua.substring(0, MAX_USER_AGENT_LENGTH)
      : ua;
  } catch {
    return FALLBACK_VALUES.ua_basic;
  }
}

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Get current page context (path, referrer, etc.)
 *
 * Returns page information for event enrichment.
 * Uses caching to minimize DOM reads.
 *
 * @returns PageContext object with page_path and page_referrer
 *
 * @example
 * ```ts
 * const pageContext = getCurrentPageContext();
 * console.log(pageContext.page_path); // "/dashboard/analytics"
 * console.log(pageContext.page_referrer); // "https://example.com/landing"
 * ```
 */
export function getCurrentPageContext(): PageContext {
  // Return cached value if valid
  if (cache.pageContext && isCacheValid()) {
    return cache.pageContext;
  }

  try {
    let pagePath: string = FALLBACK_VALUES.page_path;
    let pageReferrer: string | null = FALLBACK_VALUES.page_referrer;

    // Get page path from window.location
    if (typeof window !== 'undefined' && window.location) {
      pagePath = window.location.pathname || FALLBACK_VALUES.page_path;
    }

    // Get referrer from document
    if (typeof document !== 'undefined') {
      pageReferrer = document.referrer || null;
    }

    const pageContext: PageContext = {
      page_path: pagePath,
      page_referrer: pageReferrer,
    };

    // Update cache
    cache.pageContext = pageContext;
    cache.timestamp = Date.now();

    return pageContext;
  } catch {
    // Return fallback values if anything fails
    const fallback: PageContext = {
      page_path: FALLBACK_VALUES.page_path,
      page_referrer: FALLBACK_VALUES.page_referrer,
    };
    return fallback;
  }
}

/**
 * Get traffic source attribution from URL parameters
 *
 * Extracts the 'src' parameter from the current URL query string.
 * Uses caching to avoid repeated URL parsing.
 *
 * @returns Traffic source string or null if not present
 *
 * @example
 * ```ts
 * // URL: https://example.com?src=poster_qr&utm_medium=social
 * const src = getSourceAttribution();
 * console.log(src); // "poster_qr"
 *
 * // URL: https://example.com (no src parameter)
 * const src2 = getSourceAttribution();
 * console.log(src2); // null
 * ```
 */
export function getSourceAttribution(): string | null {
  // Return cached value if valid
  if (cache.src !== null && isCacheValid()) {
    return cache.src;
  }

  try {
    if (typeof window === 'undefined' || !window.location) {
      cache.src = null;
      return null;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const src = urlParams.get('src');

    // Update cache
    cache.src = src;
    cache.timestamp = Date.now();

    return src;
  } catch {
    cache.src = null;
    return null;
  }
}

/**
 * Enrich event payload with shared context
 *
 * This is the main entry point for event enrichment. It automatically adds
 * all required context fields (ts, device_id, session_id, page_path, page_referrer,
 * src, ua_basic) to the event payload.
 *
 * Business code should call this function for all events instead of manually
 * adding context fields. This ensures consistent enrichment across the application.
 *
 * @param eventName - The name of the event being tracked
 * @param props - Custom event properties to enrich with context
 * @returns EnrichedEventContext with all tracking fields
 *
 * @example
 * ```ts
 * // Track a button click event
 * const enrichedEvent = enrichEventContext('button_click', {
 *   button_id: 'submit',
 *   button_text: 'Submit',
 * });
 *
 * // Result includes:
 * // - event_name: "button_click"
 * // - ts: current timestamp
 * // - device_id: cached device ID
 * // - session_id: cached session ID
 * // - page_path: current page path
 * // - page_referrer: referrer if available
 * // - src: traffic source from URL
 * // - ua_basic: truncated user agent
 * // - button_id: "submit" (custom prop)
 * // - button_text: "Submit" (custom prop)
 * ```
 */
export function enrichEventContext(
  eventName: string,
  props: Record<string, unknown> = {}
): EnrichedEventContext {
  // Get device ID (cached after first retrieval)
  let deviceId: string;
  try {
    if (cache.deviceId) {
      deviceId = cache.deviceId;
    } else {
      deviceId = getDeviceId();
      cache.deviceId = deviceId;
    }
  } catch {
    deviceId = FALLBACK_VALUES.device_id;
  }

  // Get session ID (cached after first retrieval)
  let sessionId: string;
  try {
    if (cache.sessionId) {
      sessionId = cache.sessionId;
    } else {
      sessionId = getSessionId();
      cache.sessionId = sessionId;
    }
  } catch {
    sessionId = FALLBACK_VALUES.session_id;
  }

  // Get page context (uses internal caching)
  const pageContext = getCurrentPageContext();

  // Get traffic source (uses internal caching)
  const src = getSourceAttribution();

  // Get user agent
  const ua = getUserAgent();

  // Build enriched event context
  const enrichedContext: EnrichedEventContext = {
    event_name: eventName,
    ts: Date.now(),
    device_id: deviceId,
    session_id: sessionId,
    page_path: pageContext.page_path,
    page_referrer: pageContext.page_referrer,
    src: src,
    ua_basic: ua,
    ...props,
  };

  return enrichedContext;
}

/**
 * Clear cached values
 *
 * This function resets all cached values. It's primarily useful for testing
 * or when you need to force refresh of cached data.
 *
 * After clearing, the next call to enrichEventContext() will retrieve fresh data.
 *
 * @example
 * ```ts
 * // Clear all caches
 * clearContextCache();
 *
 * // Next enrichEventContext call will fetch fresh data
 * const event = enrichEventContext('test_event', {});
 * ```
 */
export function clearContextCache(): void {
  cache.deviceId = null;
  cache.sessionId = null;
  cache.pageContext = null;
  cache.src = null;
  cache.timestamp = 0;
}

/**
 * Get current cache state (for testing/debugging)
 *
 * @internal
 */
export function _getContextCache() {
  return {
    deviceId: cache.deviceId,
    sessionId: cache.sessionId,
    pageContext: cache.pageContext,
    src: cache.src,
    timestamp: cache.timestamp,
    isValid: isCacheValid(),
  };
}
