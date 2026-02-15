/**
 * Analytics Sink - Backend
 * Sends analytics events to backend /api/analytics endpoint
 */

import type { AnalyticsEvent } from '../validation';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Analytics event payload sent to backend
 */
interface AnalyticsEventPayload {
  event_name: string;
  ts: number;
  [key: string]: unknown;
}

interface TrackingIdentity {
  deviceId: string;
  sessionId: string | null;
}

/**
 * Backend API response
 */
interface BackendResponse {
  accepted: number;
  rejected: number;
}

/**
 * Batching buffer state
 */
interface BatchBuffer {
  events: AnalyticsEvent[];
  flushTimer: ReturnType<typeof setTimeout> | null;
  isFlushing: boolean;
}

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  ENDPOINT: '/api/analytics',
  METHOD: 'POST' as const,
  CONTENT_TYPE: 'application/json',
  TIMEOUT: 5000, // ms
  MAX_BATCH_SIZE: 50,
  FLUSH_INTERVAL: 5000, // ms
  MAX_RETRIES: 3,
  BACKOFF_FACTOR: 2,
  INITIAL_DELAY: 1000, // ms
  MAX_DELAY: 10000, // ms
} as const;

// ============================================================================
// State Management
// ============================================================================

/**
 * Batching buffer state
 */
const batchBuffer: BatchBuffer = {
  events: [],
  flushTimer: null,
  isFlushing: false,
};

/**
 * Track if page is unloading
 */
let isPageUnloading = false;

// ============================================================================
// Retry Logic
// ============================================================================

/**
 * Calculate delay with exponential backoff
 *
 * @param attempt - Current attempt number (0-based)
 * @returns Delay in milliseconds
 */
function calculateBackoffDelay(attempt: number): number {
  const delay = CONFIG.INITIAL_DELAY * Math.pow(CONFIG.BACKOFF_FACTOR, attempt);
  return Math.min(delay, CONFIG.MAX_DELAY);
}

/**
 * Sleep utility for retry delays
 *
 * @param ms - Milliseconds to sleep
 * @returns Promise that resolves after delay
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute fetch with retry logic
 *
 * @param url - Request URL
 * @param options - Fetch options
 * @param attempt - Current attempt number
 * @returns Promise resolving to Response
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  attempt: number = 0
): Promise<Response> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.TIMEOUT);

    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Retry on server errors (5xx) but not on client errors (4xx)
    if (!response.ok && response.status >= 500 && response.status < 600) {
      throw new Error(`Server error: ${response.status}`);
    }

    return response;
  } catch (error) {
    if (attempt >= CONFIG.MAX_RETRIES - 1) {
      // Max retries reached, log warning and re-throw
      console.warn(
        `[Analytics] Max retries (${CONFIG.MAX_RETRIES}) reached for ${url}. Discarding request.`
      );
      throw error;
    }

    const delay = calculateBackoffDelay(attempt);
    console.warn(
      `[Analytics] Request failed (attempt ${attempt + 1}/${CONFIG.MAX_RETRIES}), ` +
        `retrying in ${delay}ms:`,
      error
    );

    await sleep(delay);
    return fetchWithRetry(url, options, attempt + 1);
  }
}

// ============================================================================
// HTTP Request Functions
// ============================================================================

/**
 * Convert AnalyticsEvent to backend payload format
 *
 * @param event - Analytics event
 * @returns Backend event payload
 */
function eventToPayload(event: AnalyticsEvent): AnalyticsEventPayload {
  return {
    event_name: event.event_name,
    ts: event.ts,
    ...(event.scan_id !== undefined && { scan_id: event.scan_id }),
    ...(event.status !== undefined && { status: event.status }),
    ...(event.duration_ms !== undefined && { duration_ms: event.duration_ms }),
    ...(event.input_type !== undefined && { input_type: event.input_type }),
    ...(event.method !== undefined && { method: event.method }),
    ...(event.src !== undefined && { src: event.src }),
    ...(event.ua_basic !== undefined && { ua_basic: event.ua_basic }),
    ...(event.error_code !== undefined && { error_code: event.error_code }),
    ...(event.error_message !== undefined && { error_message: event.error_message }),
    ...(event.error_details !== undefined && { error_details: event.error_details }),
  };
}

function getTrackingIdentity(events: AnalyticsEvent[]): TrackingIdentity {
  const firstWithDevice = events.find((event) => {
    const anyEvent = event as Record<string, unknown>;
    return typeof anyEvent.device_id === 'string' && anyEvent.device_id.length > 0;
  });

  if (firstWithDevice) {
    const anyEvent = firstWithDevice as Record<string, unknown>;
    const sessionCandidate =
      typeof anyEvent.session_id === 'string' && anyEvent.session_id.length > 0
        ? (anyEvent.session_id as string)
        : null;

    return {
      deviceId: anyEvent.device_id as string,
      sessionId: sessionCandidate,
    };
  }

  return {
    deviceId: 'unknown_device',
    sessionId: null,
  };
}

function buildEndpointWithIdentity(identity: TrackingIdentity): string {
  const params = new URLSearchParams();
  params.set('device_id', identity.deviceId);
  if (identity.sessionId) {
    params.set('session_id', identity.sessionId);
  }
  return `${CONFIG.ENDPOINT}?${params.toString()}`;
}

/**
 * Send events using fetch API
 *
 * @param events - Array of analytics events
 * @returns Promise resolving to void
 */
async function sendViaFetch(events: AnalyticsEvent[]): Promise<void> {
  if (events.length === 0) {
    return;
  }

  const payloads = events.map(eventToPayload);

  const identity = getTrackingIdentity(events);
  const endpoint = buildEndpointWithIdentity(identity);

  try {
    const response = await fetchWithRetry(
      endpoint,
      {
        method: CONFIG.METHOD,
        headers: {
          'Content-Type': CONFIG.CONTENT_TYPE,
          'x-device-id': identity.deviceId,
          ...(identity.sessionId ? { 'x-session-id': identity.sessionId } : {}),
        },
        body: JSON.stringify(payloads),
      },
      0 // First attempt
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Parse and log response
    try {
      const data = (await response.json()) as BackendResponse;
      if (data.rejected > 0) {
        console.warn(
          `[Analytics] Backend rejected ${data.rejected}/${data.accepted + data.rejected} events`
        );
      }
    } catch {
      // Response body is optional, ignore parse errors
    }
  } catch (error) {
    // Log error but don't throw (fail silently)
    console.error(
      '[Analytics] Failed to send events to backend:',
      error instanceof Error ? error.message : String(error)
    );
  }
}

/**
 * Send events using sendBeacon (for page unload)
 *
 * @param events - Array of analytics events
 * @returns true if beacon was sent successfully
 */
function sendViaBeacon(events: AnalyticsEvent[]): boolean {
  if (events.length === 0) {
    return false;
  }

  if (typeof navigator === 'undefined' || !navigator.sendBeacon) {
    return false;
  }

  const payloads = events.map(eventToPayload);
  const identity = getTrackingIdentity(events);
  const endpoint = buildEndpointWithIdentity(identity);
  const blob = new Blob([JSON.stringify(payloads)], {
    type: CONFIG.CONTENT_TYPE,
  });

  return navigator.sendBeacon(endpoint, blob);
}

// ============================================================================
// Batching Logic
// ============================================================================

/**
 * Flush buffered events to backend
 *
 * @param force - Force flush even if buffer is empty
 */
async function flushBatch(force: boolean = false): Promise<void> {
  if (!force && batchBuffer.events.length === 0) {
    return;
  }

  if (batchBuffer.isFlushing) {
    // Already flushing, just clear the timer
    if (batchBuffer.flushTimer) {
      clearTimeout(batchBuffer.flushTimer);
      batchBuffer.flushTimer = null;
    }
    return;
  }

  batchBuffer.isFlushing = true;

  // Clear any pending flush timer
  if (batchBuffer.flushTimer) {
    clearTimeout(batchBuffer.flushTimer);
    batchBuffer.flushTimer = null;
  }

  // Get events to send and clear buffer
  const eventsToSend = [...batchBuffer.events];
  batchBuffer.events = [];

  try {
    // Use sendBeacon during page unload
    if (isPageUnloading) {
      sendViaBeacon(eventsToSend);
    } else {
      await sendViaFetch(eventsToSend);
    }
  } finally {
    batchBuffer.isFlushing = false;
  }
}

/**
 * Add event to batch buffer
 *
 * @param event - Analytics event
 */
function addToBatch(event: AnalyticsEvent): void {
  batchBuffer.events.push(event);

  // Flush immediately if batch size exceeded
  if (batchBuffer.events.length >= CONFIG.MAX_BATCH_SIZE) {
    // Don't block, flush asynchronously
    flushBatch().catch((error) => {
      console.error('[Analytics] Error flushing batch:', error);
    });
    return;
  }

  // Flush scheduling is driven by sendToBackend() in this module's current contract.
}

// ============================================================================
// Schedule Utilities
// ============================================================================

/**
 * Schedule work to run during idle time or immediately if not available
 *
 * @param work - Work function to execute
 */
function scheduleIdleWork(work: () => void): void {
  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(() => work(), { timeout: CONFIG.FLUSH_INTERVAL });
  } else {
    // Fallback to setTimeout
    setTimeout(() => work(), 0);
  }
}

function scheduleIdleWorkAsync(work: () => void): Promise<void> {
  return new Promise((resolve) => {
    scheduleIdleWork(() => {
      work();
      resolve();
    });
  });
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Send analytics events to backend /api/analytics endpoint
 *
 * Events are batched and sent periodically or when batch size is reached.
 * Uses exponential backoff retry logic for failed requests.
 *
 * @param events - Array of analytics events to send
 * @returns Promise that resolves when events are queued for sending
 *
 * @example
 * ```ts
 * await sendToBackend([
 *   {
 *     event_name: 'scan_page_view',
 *     ts: Date.now()
 *   },
 *   {
 *     event_name: 'scan_submit_clicked',
 *     input_type: 'url',
 *     ts: Date.now()
 *   }
 * ]);
 * ```
 */
export async function sendToBackend(events: AnalyticsEvent[]): Promise<void> {
  if (events.length === 0) {
    return;
  }

  // Schedule work to avoid blocking main thread.
  // Await scheduling so callers/tests observe deterministic completion semantics.
  await scheduleIdleWorkAsync(() => {
    events.forEach((event) => addToBatch(event));
  });

  // Flush once after enqueue so current batch is promptly delivered.
  await flushBatch();
}

/**
 * Send single event to backend (convenience wrapper)
 *
 * Wraps single event and delegates to sendToBackend.
 *
 * @param eventName - Event name
 * @param props - Event properties
 * @returns Promise that resolves when event is queued for sending
 *
 * @example
 * ```ts
 * await sendToBackendSingle('scan_page_view', {
 *   ts: Date.now()
 * });
 *
 * await sendToBackendSingle('scan_submit_clicked', {
 *   input_type: 'url',
 *   ts: Date.now()
 * });
 * ```
 */
export async function sendToBackendSingle(
  eventName: string,
  props: Record<string, unknown>
): Promise<void> {
  const event: AnalyticsEvent = {
    event_name: eventName,
    ...props,
  } as AnalyticsEvent;

  return sendToBackend([event]);
}

/**
 * Force flush all buffered events immediately
 *
 * Useful before page unload or when you need to ensure events are sent.
 *
 * @returns Promise that resolves when flush completes
 */
export function flushBackendBuffer(): Promise<void> {
  return flushBatch(true);
}

/**
 * Get current buffer size (for debugging/monitoring)
 *
 * @returns Number of events currently buffered
 */
export function getBackendBufferSize(): number {
  return batchBuffer.events.length;
}

/**
 * Initialize backend sink module
 *
 * Sets up page unload handlers for reliable event delivery.
 * @returns Cleanup function to remove event listeners
 */
export function initializeBackendSink(): () => void {
  if (typeof window === 'undefined') {
    return () => {}; // Not in browser environment
  }

  // Mark page as unloading for sendBeacon usage
  const handleUnload = () => {
    isPageUnloading = true;
    // Force flush with sendBeacon
    flushBatch(true).catch((error) => {
      console.error('[Analytics] Error during page unload flush:', error);
    });
  };

  // Listen for page unload events
  window.addEventListener('beforeunload', handleUnload);
  window.addEventListener('pagehide', handleUnload);

  // Cleanup function (if needed in the future)
  return () => {
    window.removeEventListener('beforeunload', handleUnload);
    window.removeEventListener('pagehide', handleUnload);
  };
}

// Auto-initialize if in browser environment
if (typeof window !== 'undefined') {
  initializeBackendSink();
}
