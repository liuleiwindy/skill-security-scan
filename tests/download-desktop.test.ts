/**
 * Tests for desktop download functionality (Task 2.2)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  sanitizeFileName,
} from '@/lib/download';

describe('sanitizeFileName (Desktop Download)', () => {
  it('should convert to lowercase', () => {
    expect(sanitizeFileName('TEST-ID')).toBe('scan-test-id-poster.png');
  });
  
  it('should replace special characters with hyphens', () => {
    expect(sanitizeFileName('Test@Scan#ID$123')).toBe('scan-test-scan-id-123-poster.png');
  });
  
  it('should limit to 32 characters before extension', () => {
    const longId = 'a'.repeat(40);
    const result = sanitizeFileName(longId);
    const baseName = result.replace('scan-', '').replace('-poster.png', '');
    expect(baseName.length).toBeLessThanOrEqual(32);
  });
  
  it('should preserve valid characters', () => {
    expect(sanitizeFileName('Test-Scan_ID-123')).toBe('scan-test-scan_id-123-poster.png');
  });
  
  it('should handle empty string', () => {
    expect(sanitizeFileName('')).toBe('scan--poster.png');
  });
  
  it('should append poster.png suffix', () => {
    expect(sanitizeFileName('abc123')).toBe('scan-abc123-poster.png');
  });
  
  it('should replace consecutive special characters with hyphens', () => {
    expect(sanitizeFileName('test@#$%scan')).toBe('scan-test----scan-poster.png');
  });
  
  it('should handle scanId with spaces', () => {
    expect(sanitizeFileName('test scan id')).toBe('scan-test-scan-id-poster.png');
  });
  
  it('should handle mixed valid and invalid characters', () => {
    expect(sanitizeFileName('ABC-def_123@XYZ')).toBe('scan-abc-def_123-xyz-poster.png');
  });
  
  it('should limit filename correctly when exactly 32 chars', () => {
    const exact32 = 'a'.repeat(32);
    const result = sanitizeFileName(exact32);
    const baseName = result.replace('scan-', '').replace('-poster.png', '');
    expect(baseName.length).toBe(32);
  });
});
