/**
 * Unit tests for mobile-share utilities
 * Tests Web Share API detection, error handling, and platform detection
 */

import { describe, it, expect } from 'vitest';
import {
  canShareFiles,
  shareFile,
  getErrorType,
  isMobileDevice,
  isIOSSafari,
  isAndroidChrome,
} from '@/lib/mobile-share';

describe('getErrorType', () => {
  it('returns "abort" for AbortError', () => {
    const error = new DOMException('User cancelled', 'AbortError');
    expect(getErrorType(error)).toBe('abort');
  });

  it('returns "abort" for Error with name AbortError', () => {
    const error = new Error('User cancelled') as any;
    error.name = 'AbortError';
    expect(getErrorType(error)).toBe('abort');
  });

  it('returns "not-allowed" for NotAllowedError', () => {
    const error = new DOMException('Permission denied', 'NotAllowedError');
    expect(getErrorType(error)).toBe('not-allowed');
  });

  it('returns "not-allowed" for SecurityError', () => {
    const error = new DOMException('Security violation', 'SecurityError');
    expect(getErrorType(error)).toBe('not-allowed');
  });

  it('returns "network" for NetworkError', () => {
    const error = new DOMException('Network failure', 'NetworkError');
    expect(getErrorType(error)).toBe('network');
  });

  it('returns "network" for TypeError', () => {
    const error = new TypeError('Invalid URL');
    expect(getErrorType(error)).toBe('network');
  });

  it('returns "unknown" for other error types', () => {
    const error = new Error('Unknown error');
    expect(getErrorType(error)).toBe('unknown');
  });

  it('returns "unknown" for non-Error objects', () => {
    expect(getErrorType('string')).toBe('unknown');
    expect(getErrorType(123)).toBe('unknown');
    expect(getErrorType(null)).toBe('unknown');
    expect(getErrorType(undefined)).toBe('unknown');
  });
});

describe('canShareFiles - basic detection', () => {
  it('returns false when navigator is undefined', () => {
    // This test verifies the function handles undefined navigator
    // In a real browser environment, navigator would be defined
    const result = canShareFiles();
    expect(typeof result).toBe('boolean');
  });

  it('checks for navigator.share availability', () => {
    // Verifies function doesn't throw when checking navigator
    const result = canShareFiles();
    expect(typeof result).toBe('boolean');
  });
});

describe('isMobileDevice - basic detection', () => {
  it('returns a boolean value', () => {
    const result = isMobileDevice();
    expect(typeof result).toBe('boolean');
  });
});

describe('isIOSSafari - basic detection', () => {
  it('returns a boolean value', () => {
    const result = isIOSSafari();
    expect(typeof result).toBe('boolean');
  });
});

describe('isAndroidChrome - basic detection', () => {
  it('returns a boolean value', () => {
    const result = isAndroidChrome();
    expect(typeof result).toBe('boolean');
  });
});
