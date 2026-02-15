/**
 * Analytics validation module tests
 */

import { describe, it, expect } from 'vitest';
import {
  validateEventPayload,
  validateEventName,
  validateErrorCode,
  isAllowedDomain,
  isAllowedErrorType,
  getRequiredFields,
  hasRequiredFields,
  formatValidationErrors,
  EVENT_NAME_WHITELIST,
  ERROR_DOMAINS,
  ERROR_TYPES,
} from '../lib/analytics/validation';

describe('Analytics Validation Module', () => {
  describe('validateEventName', () => {
    it('should validate whitelisted event names', () => {
      EVENT_NAME_WHITELIST.forEach((eventName) => {
        expect(validateEventName(eventName)).toBe(true);
      });
    });

    it('should reject non-whitelisted event names', () => {
      expect(validateEventName('invalid_event')).toBe(false);
      expect(validateEventName('custom_event')).toBe(false);
      expect(validateEventName('')).toBe(false);
    });
  });

  describe('validateErrorCode', () => {
    it('should validate valid error codes', () => {
      // Test valid combinations
      expect(validateErrorCode('scan_timeout')).toBe(true);
      expect(validateErrorCode('scan_network')).toBe(true);
      expect(validateErrorCode('poster_http_4xx')).toBe(true);
      expect(validateErrorCode('download_http_5xx')).toBe(true);
      expect(validateErrorCode('share_validation')).toBe(true);
      expect(validateErrorCode('analytics_unknown')).toBe(true);
    });

    it('should reject invalid error codes', () => {
      expect(validateErrorCode('invalid_timeout')).toBe(false); // invalid domain
      expect(validateErrorCode('scan_invalid')).toBe(false); // invalid type
      expect(validateErrorCode('invalid')).toBe(false); // no underscore
      expect(validateErrorCode('scan_timeout_extra')).toBe(false); // too many parts
      expect(validateErrorCode('')).toBe(false);
    });

    it('should reject error codes with uppercase', () => {
      expect(validateErrorCode('Scan_timeout')).toBe(false);
      expect(validateErrorCode('scan_Timeout')).toBe(false);
      expect(validateErrorCode('SCAN_TIMEOUT')).toBe(false);
    });
  });

  describe('isAllowedDomain', () => {
    it('should return true for allowed domains', () => {
      ERROR_DOMAINS.forEach((domain) => {
        expect(isAllowedDomain(domain)).toBe(true);
      });
    });

    it('should return false for non-allowed domains', () => {
      expect(isAllowedDomain('invalid')).toBe(false);
      expect(isAllowedDomain('unknown')).toBe(false);
      expect(isAllowedDomain('')).toBe(false);
    });
  });

  describe('isAllowedErrorType', () => {
    it('should return true for allowed error types', () => {
      ERROR_TYPES.forEach((type) => {
        expect(isAllowedErrorType(type)).toBe(true);
      });
    });

    it('should return false for non-allowed error types', () => {
      expect(isAllowedErrorType('invalid')).toBe(false);
      expect(isAllowedErrorType('unknown_type')).toBe(false);
      expect(isAllowedErrorType('')).toBe(false);
    });
  });

  describe('getRequiredFields', () => {
    it('should return correct required fields for each event', () => {
      expect(getRequiredFields('scan_page_view')).toEqual(['ts']);
      expect(getRequiredFields('scan_submit_clicked')).toEqual(['input_type', 'ts']);
      expect(getRequiredFields('scan_result')).toEqual(['status', 'duration_ms', 'ts']);
      expect(getRequiredFields('report_page_view')).toEqual(['scan_id', 'ts']);
      expect(getRequiredFields('poster_page_view')).toEqual(['scan_id', 'ts']);
      expect(getRequiredFields('poster_save_clicked')).toEqual(['scan_id', 'method', 'ts']);
      expect(getRequiredFields('poster_download_result')).toEqual(['scan_id', 'status', 'duration_ms', 'ts']);
      expect(getRequiredFields('poster_share_result')).toEqual(['scan_id', 'status', 'duration_ms', 'ts']);
      expect(getRequiredFields('poster_qr_visit')).toEqual(['scan_id', 'src', 'ua_basic', 'ts']);
    });

    it('should return empty array for unknown events', () => {
      expect(getRequiredFields('invalid_event')).toEqual([]);
    });
  });

  describe('hasRequiredFields', () => {
    it('should return true when all required fields are present', () => {
      const payload = {
        event_name: 'scan_submit_clicked',
        input_type: 'url',
        ts: Date.now(),
      };
      expect(hasRequiredFields(payload)).toBe(true);
    });

    it('should return false when required fields are missing', () => {
      const payload = {
        event_name: 'scan_submit_clicked',
        input_type: 'url',
      };
      expect(hasRequiredFields(payload)).toBe(false);
    });

    it('should return false for invalid event names', () => {
      const payload = {
        event_name: 'invalid_event',
        ts: Date.now(),
      };
      expect(hasRequiredFields(payload)).toBe(false);
    });
  });

  describe('validateEventPayload', () => {
    describe('scan_page_view', () => {
      it('should validate correct payload', () => {
        const payload = {
          event_name: 'scan_page_view',
          ts: Date.now(),
        };
        const result = validateEventPayload(payload);
        expect(result.success).toBe(true);
        expect(result.data).toEqual(payload);
      });

      it('should reject missing ts field', () => {
        const payload = {
          event_name: 'scan_page_view',
        };
        const result = validateEventPayload(payload);
        expect(result.success).toBe(false);
        expect(result.errors).toBeDefined();
        expect(result.errors?.some((e) => e.path.includes('ts'))).toBe(true);
      });

      it('should reject extra fields (strict mode)', () => {
        const payload = {
          event_name: 'scan_page_view',
          ts: Date.now(),
          extra_field: 'not_allowed',
        };
        const result = validateEventPayload(payload);
        expect(result.success).toBe(false);
        expect(result.errors).toBeDefined();
      });
    });

    describe('scan_submit_clicked', () => {
      it('should validate correct payload', () => {
        const payload = {
          event_name: 'scan_submit_clicked',
          input_type: 'github_url' as const,
          ts: Date.now(),
        };
        const result = validateEventPayload(payload);
        expect(result.success).toBe(true);
        expect(result.data).toEqual(payload);
      });

      it('should validate all input types', () => {
        ['github_url', 'npm_command', 'unknown'].forEach((inputType) => {
          const payload = {
            event_name: 'scan_submit_clicked',
            input_type: inputType as 'github_url' | 'npm_command' | 'unknown',
            ts: Date.now(),
          };
          const result = validateEventPayload(payload);
          expect(result.success).toBe(true);
        });
      });

      it('should reject invalid input_type', () => {
        const payload = {
          event_name: 'scan_submit_clicked',
          input_type: 'invalid' as any,
          ts: Date.now(),
        };
        const result = validateEventPayload(payload);
        expect(result.success).toBe(false);
      });
    });

    describe('scan_result', () => {
      it('should validate correct payload', () => {
        const payload = {
          event_name: 'scan_result',
          status: 'success' as const,
          duration_ms: 1234,
          ts: Date.now(),
        };
        const result = validateEventPayload(payload);
        expect(result.success).toBe(true);
        expect(result.data).toEqual(payload);
      });

      it('should validate all status values', () => {
        ['success', 'error', 'cancelled'].forEach((status) => {
          const payload = {
            event_name: 'scan_result',
            status: status as 'success' | 'error' | 'cancelled',
            duration_ms: 1234,
            ts: Date.now(),
          };
          const result = validateEventPayload(payload);
          expect(result.success).toBe(true);
        });
      });
    });

    describe('poster_download_result', () => {
      it('should validate correct payload', () => {
        const payload = {
          event_name: 'poster_download_result',
          scan_id: 'scan_123',
          status: 'success' as const,
          duration_ms: 5678,
          ts: Date.now(),
        };
        const result = validateEventPayload(payload);
        expect(result.success).toBe(true);
      });

      it('should validate payload with error details', () => {
        const payload = {
          event_name: 'poster_download_result',
          scan_id: 'scan_123',
          status: 'error' as const,
          duration_ms: 5678,
          ts: Date.now(),
          error_code: 'download_timeout',
          error_message: 'Request timed out',
          error_details: { retry_count: 3 },
        };
        const result = validateEventPayload(payload);
        expect(result.success).toBe(true);
      });

      it('should validate error_code', () => {
        const validPayload = {
          event_name: 'poster_download_result',
          scan_id: 'scan_123',
          status: 'error',
          duration_ms: 5678,
          ts: Date.now(),
          error_code: 'download_http_5xx',
        };
        const result = validateEventPayload(validPayload);
        expect(result.success).toBe(true);
      });

      it('should reject invalid error_code', () => {
        const invalidPayload = {
          event_name: 'poster_download_result',
          scan_id: 'scan_123',
          status: 'error',
          duration_ms: 5678,
          ts: Date.now(),
          error_code: 'invalid_error',
        };
        const result = validateEventPayload(invalidPayload);
        expect(result.success).toBe(false);
      });
    });

    describe('poster_qr_visit', () => {
      it('should validate correct payload', () => {
        const payload = {
          event_name: 'poster_qr_visit',
          scan_id: 'scan_123',
          src: 'https://example.com',
          ua_basic: 'Mozilla/5.0',
          ts: Date.now(),
        };
        const result = validateEventPayload(payload);
        expect(result.success).toBe(true);
      });
    });

    describe('event_name validation', () => {
      it('should reject invalid event_name', () => {
        const payload = {
          event_name: 'invalid_event',
          ts: Date.now(),
        };
        const result = validateEventPayload(payload);
        expect(result.success).toBe(false);
      });
    });

    describe('ts validation', () => {
      it('should reject non-integer ts', () => {
        const payload = {
          event_name: 'scan_page_view',
          ts: 1234.5,
        };
        const result = validateEventPayload(payload);
        expect(result.success).toBe(false);
      });

      it('should reject negative ts', () => {
        const payload = {
          event_name: 'scan_page_view',
          ts: -1,
        };
        const result = validateEventPayload(payload);
        expect(result.success).toBe(false);
      });

      it('should reject zero ts', () => {
        const payload = {
          event_name: 'scan_page_view',
          ts: 0,
        };
        const result = validateEventPayload(payload);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('formatValidationErrors', () => {
    it('should format validation errors correctly', () => {
      const errors = [
        {
          path: ['event_name'],
          message: 'Invalid enum value',
          code: 'invalid_enum_value',
        },
        {
          path: ['ts'],
          message: 'Required',
          code: 'invalid_type',
        },
      ];

      const formatted = formatValidationErrors(errors);
      expect(formatted).toContain('[event_name] Invalid enum value');
      expect(formatted).toContain('[ts] Required');
      expect(formatted).toContain('(invalid_enum_value)');
      expect(formatted).toContain('(invalid_type)');
    });

    it('should handle nested paths', () => {
      const errors = [
        {
          path: ['error_details', 'retry_count'],
          message: 'Expected number',
          code: 'invalid_type',
        },
      ];

      const formatted = formatValidationErrors(errors);
      expect(formatted).toContain('[error_details.retry_count]');
    });
  });
});
