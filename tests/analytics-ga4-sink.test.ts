/**
 * GA4 sink module tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  sendToGA4,
  isGA4Configured,
  isGA4Initialized,
  getGA4State,
  type GA4EventParams,
} from '../lib/analytics/sinks/ga4';

// ============================================================================
// Mocks
// ============================================================================

// Mock window object
const mockWindow = {
  dataLayer: [] as unknown[],
  gtag: vi.fn(),
} as any;

// Mock document object
const mockDocument = {
  head: {
    appendChild: vi.fn(),
  },
} as any;

// Mock script element
let mockScript: any;

// Mock process.env
const originalEnv = process.env;

// ============================================================================
// Test Setup
// ============================================================================

beforeEach(() => {
  // Reset mocks
  mockWindow.dataLayer = [];
  mockWindow.gtag = vi.fn();
  mockDocument.head.appendChild.mockReset();

  // Create mock script
  mockScript = {
    onload: null as (() => void) | null,
    onerror: null as (() => void) | null,
    src: '',
  };

  // Mock createElement to return our mock script
  mockDocument.createElement = vi.fn(() => mockScript);

  // Set up global window and document
  (global as any).window = mockWindow;
  (global as any).document = mockDocument;

  // Reset process.env
  process.env = { ...originalEnv };
});

afterEach(() => {
  // Restore original environment
  process.env = originalEnv;

  // Clean up globals
  delete (global as any).window;
  delete (global as any).document;
});

// ============================================================================
// Tests
// ============================================================================

describe('GA4 Sink Module', () => {
  describe('isGA4Configured', () => {
    it('should return false when NEXT_PUBLIC_GA4_MEASUREMENT_ID is not set', () => {
      delete process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID;
      expect(isGA4Configured()).toBe(false);
    });

    it('should return false when NEXT_PUBLIC_GA4_MEASUREMENT_ID is empty', () => {
      process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID = '';
      expect(isGA4Configured()).toBe(false);
    });

    it('should return false when NEXT_PUBLIC_GA4_MEASUREMENT_ID is whitespace', () => {
      process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID = '   ';
      expect(isGA4Configured()).toBe(false);
    });

    it('should return true when NEXT_PUBLIC_GA4_MEASUREMENT_ID is set', () => {
      process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID = 'G-123456789';
      expect(isGA4Configured()).toBe(true);
    });
  });

  describe('sendToGA4 - No-op Behavior', () => {
    it('should be no-op when GA4 is not configured', async () => {
      delete process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID;

      await sendToGA4('scan_page_view', { ts: Date.now() });

      // Should not load any script or modify dataLayer
      expect(mockDocument.createElement).not.toHaveBeenCalled();
      expect(mockWindow.dataLayer).toHaveLength(0);
    });

    it('should be no-op when NEXT_PUBLIC_GA4_MEASUREMENT_ID is empty', async () => {
      process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID = '';

      await sendToGA4('scan_page_view', { ts: Date.now() });

      expect(mockDocument.createElement).not.toHaveBeenCalled();
      expect(mockWindow.dataLayer).toHaveLength(0);
    });

    it('should be no-op in server environment (window is undefined)', async () => {
      process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID = 'G-123456789';
      delete (global as any).window;

      await sendToGA4('scan_page_view', { ts: Date.now() });

      expect(mockDocument.createElement).not.toHaveBeenCalled();
    });

    it('should not throw errors when GA4 is not configured', async () => {
      delete process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID;

      await expect(
        sendToGA4('scan_page_view', { ts: Date.now() })
      ).resolves.not.toThrow();
    });
  });

  describe('sendToGA4 - Event Sending (Configured)', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID = 'G-123456789';
    });

    it('should load gtag script when configured', async () => {
      // Simulate successful script load
      setTimeout(() => {
        if (mockScript.onload) mockScript.onload();
      }, 0);

      await sendToGA4('scan_page_view', { ts: Date.now() });

      expect(mockDocument.createElement).toHaveBeenCalledWith('script');
      expect(mockScript.src).toContain('https://www.googletagmanager.com/gtag/js');
      expect(mockScript.src).toContain('G-123456789');
    });

    it('should send event to GA4 when configured', async () => {
      // Simulate successful script load
      setTimeout(() => {
        if (mockScript.onload) mockScript.onload();
      }, 0);

      const eventName = 'scan_page_view';
      const props = { ts: Date.now() };

      await sendToGA4(eventName, props);

      expect(mockWindow.dataLayer.length).toBeGreaterThan(0);
      const lastEvent = mockWindow.dataLayer[mockWindow.dataLayer.length - 1];
      expect(lastEvent[0]).toBe('event');
      expect(lastEvent[1]).toBe(eventName);
    });

    it('should handle all whitelisted event names', async () => {
      const events = [
        'scan_page_view',
        'scan_submit_clicked',
        'scan_result',
        'report_page_view',
        'poster_page_view',
        'poster_save_clicked',
        'poster_download_result',
        'poster_share_result',
        'poster_qr_visit',
      ];

      for (const eventName of events) {
        mockWindow.dataLayer = []; // Reset between tests
        mockDocument.head.appendChild.mockReset();

        // Create fresh mock script
        mockScript = {
          onload: null as (() => void) | null,
          onerror: null as (() => void) | null,
          src: '',
        };
        mockDocument.createElement = vi.fn(() => mockScript);

        // Simulate successful script load
        setTimeout(() => {
          if (mockScript.onload) mockScript.onload();
        }, 0);

        await sendToGA4(eventName, { ts: Date.now() });

        expect(mockWindow.dataLayer.length).toBeGreaterThan(0);
        const lastEvent = mockWindow.dataLayer[mockWindow.dataLayer.length - 1];
        expect(lastEvent[0]).toBe('event');
        expect(lastEvent[1]).toBe(eventName);
      }
    });

    it('should initialize gtag data layer correctly', async () => {
      // Simulate successful script load
      setTimeout(() => {
        if (mockScript.onload) mockScript.onload();
      }, 0);

      await sendToGA4('scan_page_view', { ts: Date.now() });

      // Wait for async operations to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check that dataLayer has the expected initialization calls
      expect(mockWindow.dataLayer.length).toBeGreaterThanOrEqual(1);
      expect(mockWindow.dataLayer[0]).toBeDefined();
    });

    it('should handle error events with error details', async () => {
      // Simulate successful script load
      setTimeout(() => {
        if (mockScript.onload) mockScript.onload();
      }, 0);

      const props = {
        scan_id: 'scan_123',
        status: 'error',
        duration_ms: 1234,
        ts: Date.now(),
        error_code: 'download_timeout',
        error_message: 'Request timed out',
        error_details: { retry_count: 3 },
      };

      await sendToGA4('poster_download_result', props);

      expect(mockWindow.dataLayer.length).toBeGreaterThan(0);
      const lastEvent = mockWindow.dataLayer[mockWindow.dataLayer.length - 1];
      expect(lastEvent[0]).toBe('event');
      expect(lastEvent[2]).toBeDefined();
    });
  });

  describe('sendToGA4 - Error Handling', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID = 'G-123456789';
    });

    it('should handle script loading timeout gracefully', async () => {
      // Don't call onload - simulate timeout
      const promise = sendToGA4('scan_page_view', { ts: Date.now() });

      await expect(promise).resolves.not.toThrow();
    });

    it('should handle script loading error gracefully', async () => {
      // Simulate script loading error
      setTimeout(() => {
        if (mockScript.onerror) mockScript.onerror();
      }, 0);

      await expect(
        sendToGA4('scan_page_view', { ts: Date.now() })
      ).resolves.not.toThrow();
    });

    it('should not throw when dataLayer is not initialized', async () => {
      delete mockWindow.dataLayer;

      // Simulate successful script load
      setTimeout(() => {
        if (mockScript.onload) mockScript.onload();
      }, 0);

      await expect(
        sendToGA4('scan_page_view', { ts: Date.now() })
      ).resolves.not.toThrow();
    });

    it('should not throw when dataLayer.push throws', async () => {
      // Make dataLayer.push throw an error
      mockWindow.dataLayer.push = vi.fn(() => {
        throw new Error('DataLayer error');
      });

      // Simulate successful script load
      setTimeout(() => {
        if (mockScript.onload) mockScript.onload();
      }, 0);

      await expect(
        sendToGA4('scan_page_view', { ts: Date.now() })
      ).resolves.not.toThrow();
    });

    it('should handle multiple consecutive event sends', async () => {
      // Simulate successful script load
      setTimeout(() => {
        if (mockScript.onload) mockScript.onload();
      }, 0);

      await sendToGA4('scan_page_view', { ts: Date.now() });
      await sendToGA4('scan_submit_clicked', { input_type: 'url', ts: Date.now() });
      await sendToGA4('scan_result', { status: 'success', duration_ms: 1234, ts: Date.now() });

      // Should have at least js, config, and 3 events
      expect(mockWindow.dataLayer.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Event Parameter Conversion', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID = 'G-123456789';
    });

    it('should convert numbers correctly', async () => {
      // Simulate successful script load
      setTimeout(() => {
        if (mockScript.onload) mockScript.onload();
      }, 0);

      await sendToGA4('scan_result', {
        status: 'success',
        duration_ms: 1234,
        ts: Date.now(),
      });

      const lastEvent = mockWindow.dataLayer[mockWindow.dataLayer.length - 1];
      expect(lastEvent[2].duration_ms).toBe(1234);
    });

    it('should convert booleans to strings', async () => {
      // Simulate successful script load
      setTimeout(() => {
        if (mockScript.onload) mockScript.onload();
      }, 0);

      await sendToGA4('scan_page_view', {
        ts: Date.now(),
        is_test: true,
        is_prod: false,
      } as any);

      const lastEvent = mockWindow.dataLayer[mockWindow.dataLayer.length - 1];
      expect(lastEvent[2].is_test).toBe('true');
      expect(lastEvent[2].is_prod).toBe('false');
    });

    it('should convert objects to JSON strings', async () => {
      // Simulate successful script load
      setTimeout(() => {
        if (mockScript.onload) mockScript.onload();
      }, 0);

      const metadata = { source: 'web', version: '1.0.0' };
      await sendToGA4('scan_page_view', {
        ts: Date.now(),
        metadata,
      } as any);

      const lastEvent = mockWindow.dataLayer[mockWindow.dataLayer.length - 1];
      expect(typeof lastEvent[2].metadata).toBe('string');
      expect(JSON.parse(lastEvent[2].metadata as string)).toEqual(metadata);
    });

    it('should filter out undefined values', async () => {
      // Simulate successful script load
      setTimeout(() => {
        if (mockScript.onload) mockScript.onload();
      }, 0);

      await sendToGA4('scan_page_view', {
        ts: Date.now(),
        undefined_field: undefined,
        defined_field: 'value',
      } as any);

      const lastEvent = mockWindow.dataLayer[mockWindow.dataLayer.length - 1];
      expect(lastEvent[2].undefined_field).toBeUndefined();
      expect(lastEvent[2].defined_field).toBe('value');
    });
  });

  describe('Performance Considerations', () => {
    it('should not block main thread during event sending', async () => {
      process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID = 'G-123456789';

      // Simulate successful script load
      setTimeout(() => {
        if (mockScript.onload) mockScript.onload();
      }, 0);

      const startTime = performance.now();
      await sendToGA4('scan_page_view', { ts: Date.now() });
      const endTime = performance.now();

      // Should return quickly (promise resolves)
      // Actual event sending happens asynchronously
      expect(endTime - startTime).toBeLessThan(10);
    });
  });
});
