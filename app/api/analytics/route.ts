/**
 * Analytics API Route
 * Accepts analytics events from frontend with partial acceptance strategy
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  validateEventPayload,
  type AnalyticsEvent as ValidatedAnalyticsEvent,
  type ValidationResult,
} from '@/lib/analytics/validation';
import {
  insertAnalyticsEvents,
  type DatabaseAnalyticsEvent,
} from '@/lib/analytics/repository';

// ============================================================================
// Constants
// ============================================================================

const MAX_BATCH_SIZE = 50;
const MIN_BATCH_SIZE = 1;
const MAX_PAYLOAD_SIZE = 1024 * 1024; // 1MB in bytes

/**
 * Extract device_id and session_id from request headers
 * These are set by the analytics SDK on the client side
 */
function extractTrackingInfo(request: NextRequest): {
  deviceId: string | null;
  sessionId: string | null;
} {
  const deviceId =
    request.headers.get('x-device-id') ||
    request.nextUrl.searchParams.get('device_id');
  const sessionId =
    request.headers.get('x-session-id') ||
    request.nextUrl.searchParams.get('session_id');
  return { deviceId, sessionId };
}

/**
 * Convert validated analytics event to database format
 * Adds device_id and session_id from request context
 */
function toDatabaseEvent(
  event: ValidatedAnalyticsEvent,
  deviceId: string,
  sessionId?: string | null
): DatabaseAnalyticsEvent {
  const { ts, ...rest } = event;
  return {
    ...rest,
    device_id: deviceId,
    session_id: sessionId || undefined,
    created_at: new Date(ts),
  };
}

/**
 * Parse and validate request body
 */
async function parseRequestBody(request: NextRequest): Promise<{
  success: boolean;
  data?: unknown[];
  error?: { status: number; message: string };
}> {
  // Check payload size
  const contentLength = request.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > MAX_PAYLOAD_SIZE) {
    return {
      success: false,
      error: {
        status: 413,
        message: 'Payload too large',
      },
    };
  }

  try {
    const body = await request.json();

    // Validate that body is an array
    if (!Array.isArray(body)) {
      return {
        success: false,
        error: {
          status: 400,
          message: 'Invalid payload structure: expected array',
        },
      };
    }

    // Validate batch size
    if (body.length < MIN_BATCH_SIZE) {
      return {
        success: false,
        error: {
          status: 400,
          message: 'Batch too small: minimum 1 event required',
        },
      };
    }

    if (body.length > MAX_BATCH_SIZE) {
      return {
        success: false,
        error: {
          status: 400,
          message: `Batch too large: maximum ${MAX_BATCH_SIZE} events allowed`,
        },
      };
    }

    return {
      success: true,
      data: body,
    };
  } catch (error) {
    return {
      success: false,
      error: {
        status: 400,
        message: 'Invalid JSON format',
      },
    };
  }
}

/**
 * Validate and filter events
 * Returns arrays of valid and invalid events with reasons
 */
function validateEvents(
  events: unknown[]
): {
  validEvents: ValidatedAnalyticsEvent[];
  rejectedCount: number;
} {
  const validEvents: ValidatedAnalyticsEvent[] = [];
  let rejectedCount = 0;

  for (const event of events) {
    const result: ValidationResult = validateEventPayload(event);

    if (result.success && result.data) {
      validEvents.push(result.data);
    } else {
      rejectedCount++;
      // Log validation failure without exposing details to client
      if (result.errors) {
        console.warn(
          '[analytics-api] Event validation failed:',
          JSON.stringify(result.errors)
        );
      }
    }
  }

  return { validEvents, rejectedCount };
}

// ============================================================================
// POST Handler
// ============================================================================

/**
 * POST /api/analytics
 *
 * Accepts analytics events from frontend with partial acceptance strategy.
 *
 * Request body: Array of analytics events (1-50 events, max 1MB)
 * Response: 202 Accepted with counts of accepted/rejected events
 *
 * Security considerations:
 * - No authentication required (anonymous events)
 * - Rate limiting recommended (e.g., 10 requests/second per IP)
 * - Validates payload size to prevent DoS
 * - Sanitizes error messages (doesn't leak internals)
 * - Logs all rejected events for debugging
 *
 * @example
 * ```bash
 * curl -X POST https://example.com/api/analytics \
 *   -H "Content-Type: application/json" \
 *   -H "x-device-id: device_123" \
 *   -d '[
 *     {
 *       "event_name": "scan_page_view",
 *       "ts": 1678901234567
 *     }
 *   ]'
 * ```
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Extract tracking info from headers
    const { deviceId, sessionId } = extractTrackingInfo(request);

    // Validate device_id is present
    if (!deviceId) {
      console.warn('[analytics-api] Request missing x-device-id header');
      return NextResponse.json(
        { error: 'Missing device identifier' },
        { status: 400 }
      );
    }

    // Parse and validate request body
    const parseResult = await parseRequestBody(request);

    if (!parseResult.success || !parseResult.data) {
      return NextResponse.json(
        { error: parseResult.error?.message || 'Invalid request' },
        { status: parseResult.error?.status || 400 }
      );
    }

    const events = parseResult.data;

    // Validate events (partial acceptance strategy)
    const { validEvents, rejectedCount } = validateEvents(events);

    // If all events are invalid, still return 202 but with rejection count
    const acceptedCount = validEvents.length;

    // Convert to database format and insert
    if (acceptedCount > 0) {
      const databaseEvents = validEvents.map((event) =>
        toDatabaseEvent(event, deviceId, sessionId)
      );

      // Insert events asynchronously (fire and forget)
      // We don't await this to return 202 immediately
      insertAnalyticsEvents(databaseEvents).catch((error) => {
        console.error('[analytics-api] Failed to insert events:', error);
      });
    }

    // Return 202 Accepted with counts
    return NextResponse.json(
      {
        accepted: acceptedCount,
        rejected: rejectedCount,
      },
      { status: 202 }
    );
  } catch (error) {
    console.error('[analytics-api] Unexpected error:', error);

    // Return generic error message without exposing internals
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// Method Not Allowed
// ============================================================================

/**
 * Handle unsupported HTTP methods
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function PUT(): Promise<NextResponse> {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function DELETE(): Promise<NextResponse> {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function PATCH(): Promise<NextResponse> {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}
