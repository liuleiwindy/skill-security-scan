/**
 * Analytics Event Validation Module
 * Provides runtime validation for analytics events using Zod
 */

import { z } from 'zod';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Validation result type
 */
export interface ValidationResult {
  success: boolean;
  errors?: ValidationError[];
  data?: AnalyticsEvent;
}

/**
 * Validation error with field path
 */
export interface ValidationError {
  path: string[];
  message: string;
  code: string;
}

/**
 * Base analytics event interface
 */
export interface AnalyticsEvent {
  event_name: string;
  ts: number;
  // Optional common fields
  scan_id?: string;
  status?: string;
  duration_ms?: number;
  input_type?: string;
  method?: string;
  src?: string | null;
  ua_basic?: string;
  // Error tracking fields
  error_code?: string;
  error_message?: string;
  error_details?: Record<string, unknown>;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Allowed event names whitelist
 */
export const EVENT_NAME_WHITELIST = [
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
 * Allowed error domains
 */
export const ERROR_DOMAINS = [
  'scan',
  'poster',
  'download',
  'share',
  'analytics',
] as const;

/**
 * Allowed error types
 */
export const ERROR_TYPES = [
  'timeout',
  'network',
  'http_4xx',
  'http_5xx',
  'validation',
  'not_supported',
  'aborted',
  'unknown',
] as const;

/**
 * Required fields mapping by event name
 */
const REQUIRED_FIELDS_BY_EVENT: Record<string, string[]> = {
  scan_page_view: ['ts'],
  scan_submit_clicked: ['input_type', 'ts'],
  scan_result: ['status', 'duration_ms', 'ts'],
  report_page_view: ['scan_id', 'ts'],
  poster_page_view: ['scan_id', 'ts'],
  poster_save_clicked: ['scan_id', 'method', 'ts'],
  poster_download_result: ['scan_id', 'status', 'duration_ms', 'ts'],
  poster_share_result: ['scan_id', 'status', 'duration_ms', 'ts'],
  poster_qr_visit: ['scan_id', 'src', 'ua_basic', 'ts'],
};

// ============================================================================
// Zod Schemas
// ============================================================================

/**
 * Error code validation: {domain}_{type}
 */
const ErrorCodeSchema = z
  .string()
  .regex(/^[a-z]+_[a-z0-9_]+$/, {
    message: 'Error code must follow format: {domain}_{type}',
  })
  .refine(
    (code) => {
      const parts = code.split('_');
      if (parts.length < 2) return false;
      // Extract the domain (first part before first underscore)
      const domain = parts[0];
      return ERROR_DOMAINS.includes(domain as any);
    },
    { message: 'Error domain not allowed' }
  )
  .refine(
    (code) => {
      const parts = code.split('_');
      if (parts.length < 2) return false;
      // Extract the type (everything after the first underscore)
      const type = parts.slice(1).join('_');
      return ERROR_TYPES.includes(type as any);
    },
    { message: 'Error type not allowed' }
  );

/**
 * Base event schema with common fields
 */
const BaseEventSchema = z.object({
  event_name: z.enum(EVENT_NAME_WHITELIST),
  ts: z.number().int().positive().describe('Timestamp in milliseconds'),
  src: z.string().nullable().optional(),
  ua_basic: z.string().optional(),
});

/**
 * Scan-related event schemas
 */
const ScanPageViewSchema = BaseEventSchema.extend({
  event_name: z.literal('scan_page_view'),
  ts: z.number().int().positive(),
}).strict();

const ScanSubmitClickedSchema = BaseEventSchema.extend({
  event_name: z.literal('scan_submit_clicked'),
  input_type: z.enum(['github_url', 'npm_command', 'unknown']),
  ts: z.number().int().positive(),
}).strict();

const ScanResultSchema = BaseEventSchema.extend({
  event_name: z.literal('scan_result'),
  status: z.enum(['success', 'error', 'cancelled']),
  duration_ms: z.number().int().nonnegative(),
  ts: z.number().int().positive(),
}).strict();

/**
 * Report event schema
 */
const ReportPageViewSchema = BaseEventSchema.extend({
  event_name: z.literal('report_page_view'),
  scan_id: z.string().min(1),
  ts: z.number().int().positive(),
}).strict();

/**
 * Poster event schemas
 */
const PosterPageViewSchema = BaseEventSchema.extend({
  event_name: z.literal('poster_page_view'),
  scan_id: z.string().min(1),
  ts: z.number().int().positive(),
}).strict();

const PosterSaveClickedSchema = BaseEventSchema.extend({
  event_name: z.literal('poster_save_clicked'),
  scan_id: z.string().min(1),
  method: z.enum(['download', 'share']),
  ts: z.number().int().positive(),
}).strict();

const PosterDownloadResultSchema = BaseEventSchema.extend({
  event_name: z.literal('poster_download_result'),
  scan_id: z.string().min(1),
  status: z.enum(['success', 'error', 'cancelled']),
  duration_ms: z.number().int().nonnegative(),
  ts: z.number().int().positive(),
  error_code: ErrorCodeSchema.optional(),
  error_message: z.string().optional(),
  error_details: z.record(z.string(), z.unknown()).optional(),
}).strict();

const PosterShareResultSchema = BaseEventSchema.extend({
  event_name: z.literal('poster_share_result'),
  scan_id: z.string().min(1),
  status: z.enum(['success', 'error', 'cancelled']),
  duration_ms: z.number().int().nonnegative(),
  ts: z.number().int().positive(),
  error_code: ErrorCodeSchema.optional(),
  error_message: z.string().optional(),
  error_details: z.record(z.string(), z.unknown()).optional(),
}).strict();

const PosterQrVisitSchema = BaseEventSchema.extend({
  event_name: z.literal('poster_qr_visit'),
  scan_id: z.string().min(1),
  src: z.string().min(1),
  ua_basic: z.string().min(1),
  ts: z.number().int().positive(),
}).strict();

/**
 * Discriminated union of all event types
 */
export const AnalyticsEventSchema = z.discriminatedUnion('event_name', [
  ScanPageViewSchema,
  ScanSubmitClickedSchema,
  ScanResultSchema,
  ReportPageViewSchema,
  PosterPageViewSchema,
  PosterSaveClickedSchema,
  PosterDownloadResultSchema,
  PosterShareResultSchema,
  PosterQrVisitSchema,
]);

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Convert Zod error to ValidationError format
 */
function convertZodError(error: z.ZodError): ValidationError[] {
  const errors = error.issues || [];
  return errors.map((e) => ({
    path: (e.path || []).map(String),
    message: e.message,
    code: e.code,
  }));
}

/**
 * Validate analytics event payload against schema
 *
 * @param payload - Unknown payload to validate
 * @returns ValidationResult with success status and optional errors
 *
 * @example
 * ```ts
 * const result = validateEventPayload({
 *   event_name: 'scan_page_view',
 *   ts: Date.now()
 * });
 * if (result.success) {
 *   console.log(result.data);
 * }
 * ```
 */
export function validateEventPayload(payload: unknown): ValidationResult {
  const result = AnalyticsEventSchema.safeParse(payload);

  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  }

  return {
    success: false,
    errors: convertZodError(result.error),
  };
}

/**
 * Check if event name is in allowed whitelist
 *
 * @param eventName - Event name to validate
 * @returns true if event name is allowed, false otherwise
 *
 * @example
 * ```ts
 * if (validateEventName('scan_page_view')) {
 *   // Event is allowed
 * }
 * ```
 */
export function validateEventName(eventName: string): boolean {
  return EVENT_NAME_WHITELIST.includes(eventName as any);
}

/**
 * Validate error code format: {domain}_{type}
 *
 * Checks both format compliance and that domain/type are in allowed sets.
 *
 * @param errorCode - Error code to validate (e.g., "scan_timeout", "download_http_5xx")
 * @returns true if error code is valid, false otherwise
 *
 * @example
 * ```ts
 * validateErrorCode('scan_timeout'); // true
 * validateErrorCode('invalid_code'); // false
 * validateErrorCode('unknown_timeout'); // false (unknown is not a valid domain)
 * ```
 */
export function validateErrorCode(errorCode: string): boolean {
  const result = ErrorCodeSchema.safeParse(errorCode);
  return result.success;
}

/**
 * Check if error domain is in allowed set
 *
 * @param domain - Error domain to check
 * @returns true if domain is allowed, false otherwise
 *
 * @example
 * ```ts
 * if (isAllowedDomain('scan')) {
 *   // Domain is allowed
 * }
 * ```
 */
export function isAllowedDomain(domain: string): boolean {
  return ERROR_DOMAINS.includes(domain as any);
}

/**
 * Check if error type is in allowed set
 *
 * @param errorType - Error type to check
 * @returns true if error type is allowed, false otherwise
 *
 * @example
 * ```ts
 * if (isAllowedErrorType('timeout')) {
 *   // Error type is allowed
 * }
 * ```
 */
export function isAllowedErrorType(errorType: string): boolean {
  return ERROR_TYPES.includes(errorType as any);
}

/**
 * Get required fields for a specific event name
 *
 * @param eventName - Event name to get required fields for
 * @returns Array of required field names, or empty array if event not found
 *
 * @example
 * ```ts
 * const required = getRequiredFields('scan_submit_clicked');
 * console.log(required); // ['input_type', 'ts']
 * ```
 */
export function getRequiredFields(eventName: string): string[] {
  return REQUIRED_FIELDS_BY_EVENT[eventName] || [];
}

/**
 * Validate that payload contains all required fields for its event type
 *
 * @param payload - Payload to validate
 * @returns true if all required fields are present, false otherwise
 *
 * @example
 * ```ts
 * const isValid = hasRequiredFields({
 *   event_name: 'scan_submit_clicked',
 *   input_type: 'url',
 *   ts: Date.now()
 * }); // true
 * ```
 */
export function hasRequiredFields(payload: Record<string, unknown>): boolean {
  const eventName = payload.event_name as string;
  if (!eventName || !validateEventName(eventName)) {
    return false;
  }

  const requiredFields = getRequiredFields(eventName);
  return requiredFields.every((field) => field in payload && payload[field] !== undefined);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a validation error object
 *
 * @param path - Field path
 * @param message - Error message
 * @param code - Error code
 * @returns ValidationError object
 */
export function createValidationError(
  path: string[],
  message: string,
  code: string = 'custom_error'
): ValidationError {
  return { path, message, code };
}

/**
 * Format validation errors for display or logging
 *
 * @param errors - Array of validation errors
 * @returns Formatted string representation
 *
 * @example
 * ```ts
 * const result = validateEventPayload(invalidPayload);
 * if (!result.success) {
 *   console.log(formatValidationErrors(result.errors));
 * }
 * ```
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  return errors
    .map((error) => {
      const path = error.path.join('.');
      return `[${path}] ${error.message} (${error.code})`;
    })
    .join('\n');
}
