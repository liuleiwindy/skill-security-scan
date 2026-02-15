/**
 * Poster Query Parser
 *
 * Query parameter parsing and validation for poster image API endpoints.
 * V0.2.4.1 Data and API Integration
 */

import type { NextRequest } from "next/server";

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Allowed query parameter overrides for poster image rendering.
 * These parameters can be used to customize poster output without modifying
 * the underlying scan report data.
 */
export interface ImageQueryOverrides {
  /** Override score display (0-100) */
  score?: number;
  /** Override beats ratio text (e.g., "78%") */
  beatsRatio?: string;
  /** Override proof text (e.g., "PROOF ID: X9K2 · 2026-02-14 14:32 UTC") */
  proof?: string;
  /** Override short footer text (e.g., "POWERED BY MYSKILL.INFO") */
  short?: string;
  /** Override ring progress percentage (0-100) */
  ringPercent?: number;
  /** Override progress bar color (hex format, e.g., "#7dffb1") */
  progressBarColor?: string;
}

/**
 * Standardized error response for poster API endpoints.
 * All poster-related API errors should conform to this shape.
 */
export interface PosterApiError {
  /** Machine-readable error code (e.g., "POSTER_INVALID_QUERY") */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Unique request identifier for debugging and logging */
  requestId?: string;
}

/**
 * Result of parsing poster query parameters.
 * Returns either valid overrides or an error.
 */
export type ParseResult =
  | { ok: true; overrides: ImageQueryOverrides }
  | { ok: false; error: PosterApiError };

// ============================================================================
// Constants
// ============================================================================

/**
 * Allowlist of supported query parameter names.
 * Any parameter not in this list will trigger a validation error.
 */
const ALLOWED_QUERY_PARAMS: ReadonlySet<string> = new Set([
  "score",
  "beatsRatio",
  "proof",
  "short",
  "ringPercent",
  "progressBarColor",
]);

// ============================================================================
// Request ID Generation
// ============================================================================

/**
 * Generate a unique request ID in the format "req_xxx".
 * Uses cryptographically strong random values when available,
 * falling back to timestamp-based generation otherwise.
 *
 * @returns A unique request ID string
 *
 * @example
 * ```ts
 * const requestId = generateRequestId(); // "req_a1b2c3d4e5f6"
 * ```
 */
export function generateRequestId(): string {
  // Use crypto.randomUUID if available (Node.js 15.6+, modern browsers)
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `req_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
  }

  // Fallback: timestamp + random suffix
  const timestamp = Date.now().toString(36);
  const randomSuffix = Math.random().toString(36).slice(2, 10);
  return `req_${timestamp}_${randomSuffix}`;
}

// ============================================================================
// Query Parameter Parsing
// ============================================================================

/**
 * Extract URLSearchParams from various input types.
 *
 * @param input - URLSearchParams or NextRequest object
 * @returns URLSearchParams instance
 */
function extractSearchParams(input: URLSearchParams | NextRequest): URLSearchParams {
  if (input instanceof URLSearchParams) {
    return input;
  }

  // NextRequest - use nextUrl.searchParams
  return input.nextUrl.searchParams;
}

/**
 * Validate that a value is a valid number.
 *
 * @param value - String value to validate
 * @returns True if the value can be parsed as a finite number
 */
function isValidNumber(value: string): boolean {
  const parsed = Number(value);
  return Number.isFinite(parsed);
}

/**
 * Validate that a value is within a numeric range (inclusive).
 *
 * @param value - String value to validate
 * @param min - Minimum allowed value (inclusive)
 * @param max - Maximum allowed value (inclusive)
 * @returns True if the value is a valid number within the range
 */
function isInRange(value: string, min: number, max: number): boolean {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max;
}

/**
 * Validate that a value is a valid 6-digit hex color (format #xxxxxx).
 *
 * @param value - String value to validate
 * @returns True if the value is a valid hex color
 */
function isValidHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

/**
 * Decode a URL-encoded value.
 * Handles common encoded characters like %23 for #.
 *
 * @param value - URL-encoded string
 * @returns Decoded string
 */
function decodeQueryParam(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    // If decoding fails, return original value
    return value;
  }
}

/**
 * Parse and validate query parameters for poster image rendering.
 *
 * This function:
 * 1. Extracts query parameters from URLSearchParams or NextRequest
 * 2. Validates that only allowlisted parameters are present
 * 3. Performs type validation on numeric parameters
 * 4. URL-decodes values as needed (e.g., %23 -> #)
 *
 * @param input - URLSearchParams or NextRequest object
 * @returns ParseResult containing either valid overrides or an error
 *
 * @example
 * ```ts
 * // Success case
 * const params = new URLSearchParams("score=85&progressBarColor=%237dffb1");
 * const result = parsePosterQueryOverrides(params);
 * // result = { ok: true, overrides: { score: 85, progressBarColor: "#7dffb1" } }
 *
 * // Error case - unsupported parameter
 * const params = new URLSearchParams("foo=bar");
 * const result = parsePosterQueryOverrides(params);
 * // result = { ok: false, error: { code: "POSTER_INVALID_QUERY", message: "..." } }
 * ```
 */
export function parsePosterQueryOverrides(
  input: URLSearchParams | NextRequest
): ParseResult {
  const params = extractSearchParams(input);
  const overrides: ImageQueryOverrides = {};

  // Check for unsupported parameters
  const paramKeys = Array.from(params.keys());
  for (const key of paramKeys) {
    if (!ALLOWED_QUERY_PARAMS.has(key)) {
      return {
        ok: false,
        error: {
          code: "POSTER_INVALID_QUERY",
          message: `Unsupported query parameter: ${key}`,
        },
      };
    }
  }

  // Parse and validate each parameter
  const paramEntries = Array.from(params.entries());
  for (const [key, rawValue] of paramEntries) {
    const value = decodeQueryParam(rawValue);

    switch (key) {
      case "score": {
        if (!isValidNumber(value)) {
          return {
            ok: false,
            error: {
              code: "POSTER_INVALID_QUERY",
              message: `Invalid score value: ${rawValue}. Must be a number.`,
            },
          };
        }
        overrides.score = Number(value);
        break;
      }

      case "ringPercent": {
        if (!isInRange(value, 0, 100)) {
          return {
            ok: false,
            error: {
              code: "POSTER_INVALID_QUERY",
              message: `Invalid ringPercent value: ${rawValue}. Must be a number between 0 and 100.`,
            },
          };
        }
        overrides.ringPercent = Number(value);
        break;
      }

      case "beatsRatio":
        overrides.beatsRatio = value;
        break;

      case "proof":
        overrides.proof = value;
        break;

      case "short":
        overrides.short = value;
        break;

      case "progressBarColor": {
        if (!isValidHexColor(value)) {
          return {
            ok: false,
            error: {
              code: "POSTER_INVALID_QUERY",
              message: `Invalid progressBarColor value: ${rawValue}. Must be a valid 6-digit hex color (e.g., #7dffb1).`,
            },
          };
        }
        overrides.progressBarColor = value;
        break;
      }
    }
  }

  return { ok: true, overrides };
}

/**
 * Create a standardized poster API error response.
 *
 * @param code - Error code
 * @param message - Error message
 * @param requestId - Optional request ID for tracing
 * @returns A PosterApiError object
 *
 * @example
 * ```ts
 * const error = createPosterApiError(
 *   "POSTER_INVALID_QUERY",
 *   "Unsupported query parameter: foo",
 *   "req_abc123"
 * );
 * ```
 */
export function createPosterApiError(
  code: string,
  message: string,
  requestId?: string
): PosterApiError {
  return {
    code,
    message,
    requestId,
  };
}
