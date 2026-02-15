/**
 * GA4 (Google Analytics 4) Sink Module
 * Feature-gated analytics sink for sending events to GA4
 *
 * This module provides a no-op when GA4 is not configured,
 * ensuring the app functions normally without GA4.
 */

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * GA4 event name mapping
 * Maps internal event names to GA4 event names
 */
export type GA4EventName = string;

/**
 * GA4 event parameters
 * Can include standard GA4 parameters and custom parameters
 */
export type GA4EventParams = Record<string, unknown>;

// ============================================================================
// Constants
// ============================================================================

/**
 * Internal event name to GA4 event name mapping
 *
 * GA4 has recommended event names, but custom events are also supported.
 * We use custom event names to maintain consistency with our internal naming.
 */
const EVENT_NAME_MAPPING: Record<string, GA4EventName> = {
  scan_page_view: 'scan_page_view',
  scan_submit_clicked: 'scan_submit_clicked',
  scan_result: 'scan_result',
  report_page_view: 'report_page_view',
  poster_page_view: 'poster_page_view',
  poster_save_clicked: 'poster_save_clicked',
  poster_download_result: 'poster_download_result',
  poster_share_result: 'poster_share_result',
  poster_qr_visit: 'poster_qr_visit',
};

/**
 * GA4 script source URL
 */
const GA4_SCRIPT_SRC = 'https://www.googletagmanager.com/gtag/js';

/**
 * GA4 script loading timeout in milliseconds
 */
const GA4_SCRIPT_TIMEOUT = 5000;

// ============================================================================
// State Management
// ============================================================================

/**
 * GA4 initialization state
 */
type GA4State = 'uninitialized' | 'loading' | 'initialized' | 'error';

let ga4State: GA4State = 'uninitialized';
let ga4InitializationPromise: Promise<void> | null = null;

/**
 * Get GA4 Measurement ID from environment variable
 * Returns undefined if not configured
 */
function getMeasurementId(): string | undefined {
  // Access the environment variable
  // In Next.js, this will be replaced at build time
  const measurementId = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID;

  if (!measurementId || measurementId.trim() === '') {
    return undefined;
  }

  return measurementId;
}

// ============================================================================
// gtag.js Integration
// ============================================================================

/**
 * Load gtag.js script dynamically
 * Only called when GA4 is configured
 */
function loadGtagScript(): Promise<void> {
  if (ga4State === 'initialized') {
    return Promise.resolve();
  }

  if (ga4State === 'loading' && ga4InitializationPromise) {
    return ga4InitializationPromise;
  }

  ga4State = 'loading';

  const promise = new Promise<void>((resolve, reject) => {
    // Create script element
    const script = document.createElement('script');
    script.async = true;
    script.src = `${GA4_SCRIPT_SRC}?id=${getMeasurementId()}`;

    // Set timeout
    const timeout = setTimeout(() => {
      script.remove();
      ga4State = 'error';
      reject(new Error('GA4 script loading timeout'));
    }, GA4_SCRIPT_TIMEOUT);

    // Handle load event
    script.onload = () => {
      clearTimeout(timeout);
      ga4State = 'initialized';
      resolve();
    };

    // Handle error event
    script.onerror = () => {
      clearTimeout(timeout);
      script.remove();
      ga4State = 'error';
      reject(new Error('GA4 script loading failed'));
    };

    // Append script to document head
    document.head.appendChild(script);
  });

  ga4InitializationPromise = promise;
  return promise;
}

/**
 * Initialize gtag data layer
 * Only called when GA4 is configured
 */
function initializeGtag(): void {
  if (typeof window === 'undefined') {
    return;
  }

  // Create data layer if it doesn't exist
  if (!Array.isArray(window.dataLayer)) {
    window.dataLayer = [];
  }

  // Initialize gtag configuration
  const measurementId = getMeasurementId();
  if (!measurementId) {
    return;
  }

  // Configure gtag
  window.dataLayer.push(['js', new Date()]);
  window.dataLayer.push(['config', measurementId]);
}

/**
 * Send event using gtag
 * Only called when GA4 is configured and initialized
 */
function sendGtagEvent(eventName: string, params: GA4EventParams): void {
  if (typeof window === 'undefined' || !Array.isArray(window.dataLayer)) {
    return;
  }

  try {
    window.dataLayer.push(['event', eventName, params]);
  } catch (error) {
    // Log error but don't throw
    console.error('[GA4] Failed to send event:', error);
  }
}

// ============================================================================
// Event Mapping
// ============================================================================

/**
 * Map internal event name to GA4 event name
 *
 * @param internalEventName - Internal event name
 * @returns GA4 event name (custom event name)
 */
function mapEventName(internalEventName: string): GA4EventName {
  return EVENT_NAME_MAPPING[internalEventName] || internalEventName;
}

/**
 * Prepare event parameters for GA4
 *
 * Converts internal event parameters to GA4-compatible format.
 * Filters out undefined values and ensures proper types.
 *
 * @param params - Internal event parameters
 * @returns GA4 event parameters
 */
function prepareEventParams(params: GA4EventParams): GA4EventParams {
  const ga4Params: GA4EventParams = {};

  for (const [key, value] of Object.entries(params)) {
    // Skip undefined values
    if (value === undefined) {
      continue;
    }

    // Convert numbers to GA4-compatible format
    if (typeof value === 'number') {
      ga4Params[key] = value;
    }
    // Convert booleans to GA4-compatible format
    else if (typeof value === 'boolean') {
      ga4Params[key] = value ? 'true' : 'false';
    }
    // Convert objects to JSON strings
    else if (typeof value === 'object' && value !== null) {
      ga4Params[key] = JSON.stringify(value);
    }
    // Keep strings and other primitives as-is
    else {
      ga4Params[key] = value;
    }
  }

  return ga4Params;
}

// ============================================================================
// Main Export Function
// ============================================================================

/**
 * Send event to GA4 with no-op when not configured
 *
 * This is the main entry point for sending analytics events to GA4.
 * It is feature-gated by the NEXT_PUBLIC_GA4_MEASUREMENT_ID environment variable.
 *
 * When GA4 is not configured:
 * - Returns immediately without doing anything
 * - Does not throw any errors
 * - Does not block application execution
 *
 * When GA4 is configured:
 * - Initializes gtag.js if not already loaded
 * - Maps internal event names to GA4 event names
 * - Sends the event to GA4 asynchronously
 * - Handles errors gracefully without throwing
 *
 * @param eventName - Internal event name (e.g., 'scan_page_view')
 * @param props - Event properties to send to GA4
 * @returns Promise that resolves when event is sent (or no-op)
 *
 * @example
 * ```ts
 * // No-op when GA4 is not configured
 * await sendToGA4('scan_page_view', { ts: Date.now() });
 *
 * // Sends event when GA4 is configured
 * await sendToGA4('scan_submit_clicked', {
 *   input_type: 'url',
 *   ts: Date.now()
 * });
 * ```
 */
export async function sendToGA4(
  eventName: string,
  props: Record<string, unknown>
): Promise<void> {
  // Feature gate: Check if GA4 is configured
  const measurementId = getMeasurementId();
  if (!measurementId) {
    // GA4 is not configured, return no-op
    return;
  }

  // Ensure we're in browser environment
  if (typeof window === 'undefined') {
    // Running in server environment, no-op
    return;
  }

  try {
    // Initialize gtag if not already done
    if (ga4State === 'uninitialized') {
      initializeGtag();
    }

    // Load gtag script (only loads once)
    await loadGtagScript();

    // Map event name
    const ga4EventName = mapEventName(eventName);

    // Prepare event parameters
    const ga4Params = prepareEventParams(props);

    // Send event
    sendGtagEvent(ga4EventName, ga4Params);
  } catch (error) {
    // Log error but don't throw - never block app functionality
    console.error('[GA4] Failed to send event:', error);
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if GA4 is configured
 *
 * @returns true if NEXT_PUBLIC_GA4_MEASUREMENT_ID is set and non-empty
 */
export function isGA4Configured(): boolean {
  return getMeasurementId() !== undefined;
}

/**
 * Check if GA4 is initialized
 *
 * @returns true if gtag.js has been loaded successfully
 */
export function isGA4Initialized(): boolean {
  return ga4State === 'initialized';
}

/**
 * Get current GA4 state (for debugging/testing)
 *
 * @returns Current GA4 initialization state
 */
export function getGA4State(): GA4State {
  return ga4State;
}

// ============================================================================
// Global Type Declarations
// ============================================================================

/**
 * Extend Window interface to include gtag data layer
 */
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (command: string, targetId: string, config?: Record<string, unknown>) => void;
  }
}
