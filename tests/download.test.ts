/**
 * Unit tests for download utilities
 * Tests image fetching, file creation, and file name sanitization
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  fetchImageAsFile,
  sanitizeFileName,
} from '@/lib/download';

describe('sanitizeFileName', () => {
  it('converts to lowercase', () => {
    expect(sanitizeFileName('ABC-DEF')).toBe('scan-abc-def-poster.png');
  });

  it('replaces special characters with hyphens', () => {
    expect(sanitizeFileName('abc@123#def$')).toBe('scan-abc-123-def--poster.png');
  });

  it('preserves alphanumeric characters, hyphens, and underscores', () => {
    expect(sanitizeFileName('abc-123_def')).toBe('scan-abc-123_def-poster.png');
  });

  it('limits length to 32 characters before suffix', () => {
    const longId = 'a'.repeat(40);
    const result = sanitizeFileName(longId);
    // 'scan-' + 32 chars + '-poster.png' = 48 chars total
    expect(result.length).toBe(48);
    expect(result).toBe('scan-' + 'a'.repeat(32) + '-poster.png');
  });

  it('handles empty string', () => {
    expect(sanitizeFileName('')).toBe('scan--poster.png');
  });

  it('handles strings with only special characters', () => {
    expect(sanitizeFileName('@#$%^&*')).toBe('scan---------poster.png');
  });

  it('preserves scan ID format correctly', () => {
    expect(sanitizeFileName('scan-123_abc')).toBe('scan-scan-123_abc-poster.png');
  });
});

describe('fetchImageAsFile', () => {
  beforeEach(() => {
    // Mock global fetch
    global.fetch = vi.fn() as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches image and creates File object successfully', async () => {
    const mockBlob = new Blob(['test'], { type: 'image/png' });
    const mockResponse = {
      ok: true,
      status: 200,
      statusText: 'OK',
      blob: vi.fn().mockResolvedValue(mockBlob),
    };
    
    (global.fetch as any).mockResolvedValue(mockResponse);
    
    const file = await fetchImageAsFile('/test/image.png', 'test.png');
    
    expect(file).toBeInstanceOf(File);
    expect(file.name).toBe('test.png');
    expect(file.type).toBe('image/png');
    expect(global.fetch).toHaveBeenCalledWith('/test/image.png');
  });

  it('throws error when fetch fails with non-OK status', async () => {
    const mockResponse = {
      ok: false,
      status: 404,
      statusText: 'Not Found',
    };
    
    (global.fetch as any).mockResolvedValue(mockResponse);
    
    await expect(fetchImageAsFile('/test/image.png', 'test.png')).rejects.toThrow(
      'Failed to fetch image: 404 Not Found'
    );
  });

  it('throws error with 500 status', async () => {
    const mockResponse = {
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    };
    
    (global.fetch as any).mockResolvedValue(mockResponse);
    
    await expect(fetchImageAsFile('/test/image.png', 'test.png')).rejects.toThrow(
      'Failed to fetch image: 500 Internal Server Error'
    );
  });

  it('throws error when fetch rejects', async () => {
    (global.fetch as any).mockRejectedValue(new Error('Network error'));
    
    await expect(fetchImageAsFile('/test/image.png', 'test.png')).rejects.toThrow(
      'Network error'
    );
  });
});
