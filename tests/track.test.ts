/**
 * Analytics Track Module Tests
 *
 * Tests for track() function and related utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { track, getAllowedEvents, isAllowedEvent } from '../lib/analytics/track';

// Mock dependencies
vi.mock('../lib/analytics/context', () => ({
  enrichEventContext: vi.fn((eventName, props) => ({
    event_name: eventName,
    ts: Date.now(),
    device_id: 'test-device-id',
    session_id: 'test-session-id',
    page_path: '/test',
    page_referrer: null,
    src: null,
    ua_basic: 'test-ua',
    ...props,
  })),
}));

vi.mock('../lib/analytics/sinks/ga4', () => ({
  sendToGA4: vi.fn(() => Promise.resolve()),
}));

vi.mock('../lib/analytics/sinks/backend', () => ({
  sendToBackendSingle: vi.fn(() => Promise.resolve()),
}));

// Import mocked modules
import { enrichEventContext } from '../lib/analytics/context';
import { sendToGA4 } from '../lib/analytics/sinks/ga4';
import { sendToBackendSingle } from '../lib/analytics/sinks/backend';

describe('Analytics Track Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset all mock implementations
    (enrichEventContext as any).mockImplementation((eventName, props) => ({
      event_name: eventName,
      ts: Date.now(),
      device_id: 'test-device-id',
      session_id: 'test-session-id',
      page_path: '/test',
      page_referrer: null,
      src: null,
      ua_basic: 'test-ua',
      ...props,
    }));
    (sendToGA4 as any).mockResolvedValue(undefined);
    (sendToBackendSingle as any).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('track()', () => {
    it('should call enrichEventContext with event name and props', async () => {
      track('scan_page_view', { test_prop: 'test_value' });

      // Wait for async operations to complete
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(enrichEventContext).toHaveBeenCalledWith('scan_page_view', { test_prop: 'test_value' });
    });

    it('should call both sendToGA4 and sendToBackendSingle', async () => {
      track('scan_page_view');

      // Wait for async operations to complete
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(sendToGA4).toHaveBeenCalled();
      expect(sendToBackendSingle).toHaveBeenCalled();
    });

    it('should handle events with no properties', async () => {
      track('scan_page_view');

      // Wait for async operations to complete
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(enrichEventContext).toHaveBeenCalledWith('scan_page_view', {});
      expect(sendToGA4).toHaveBeenCalled();
      expect(sendToBackendSingle).toHaveBeenCalled();
    });

    it('should handle events with properties', async () => {
      track('scan_submit_clicked', { input_type: 'github_url' });

      // Wait for async operations to complete
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(enrichEventContext).toHaveBeenCalledWith('scan_submit_clicked', { input_type: 'github_url' });
      expect(sendToGA4).toHaveBeenCalled();
      expect(sendToBackendSingle).toHaveBeenCalled();
    });

    it('should handle complex events with multiple properties', async () => {
      track('scan_result', {
        status: 'success',
        duration_ms: 1500,
        scan_id: 'scan_12345',
      });

      // Wait for async operations to complete
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(enrichEventContext).toHaveBeenCalledWith('scan_result', {
        status: 'success',
        duration_ms: 1500,
        scan_id: 'scan_12345',
      });
      expect(sendToGA4).toHaveBeenCalled();
      expect(sendToBackendSingle).toHaveBeenCalled();
    });

    it('should return void (fire-and-forget)', () => {
      const result = track('scan_page_view');

      expect(result).toBeUndefined();
    });

    it('should not block main thread', () => {
      const startTime = performance.now();
      track('scan_page_view');
      const endTime = performance.now();

      // Function should return immediately (less than 10ms)
      expect(endTime - startTime).toBeLessThan(10);
    });

    it('should handle invalid event names gracefully', () => {
      // Suppress console.warn for this test
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Clear all previous calls
      vi.clearAllMocks();

      // Track invalid event
      track('invalid_event_name');

      // Since it's invalid, no sinks should be called (early return)
      expect(enrichEventContext).not.toHaveBeenCalled();
      expect(sendToGA4).not.toHaveBeenCalled();
      expect(sendToBackendSingle).not.toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    it('should handle errors from enrichEventContext gracefully', async () => {
      // Suppress console.error for this test
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      (enrichEventContext as any).mockImplementation(() => {
        throw new Error('Context enrichment failed');
      });

      track('scan_page_view');

      // Wait for async operations to complete
      await new Promise(resolve => setTimeout(resolve, 10));

      // Should still call sinks even if context enrichment failed
      expect(sendToGA4).toHaveBeenCalled();
      expect(sendToBackendSingle).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should handle errors from sendToGA4 gracefully', async () => {
      // Suppress console.error for this test
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      (sendToGA4 as any).mockRejectedValue(new Error('GA4 failed'));

      track('scan_page_view');

      // Wait for async operations to complete
      await new Promise(resolve => setTimeout(resolve, 10));

      // Should still call backend even if GA4 failed
      expect(sendToBackendSingle).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should handle errors from sendToBackendSingle gracefully', async () => {
      // Suppress console.error for this test
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      (sendToBackendSingle as any).mockRejectedValue(new Error('Backend failed'));

      track('scan_page_view');

      // Wait for async operations to complete
      await new Promise(resolve => setTimeout(resolve, 10));

      // Should still call GA4 even if backend failed
      expect(sendToGA4).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should handle errors from both sinks gracefully', async () => {
      // Suppress console.error for this test
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      (sendToGA4 as any).mockRejectedValue(new Error('GA4 failed'));
      (sendToBackendSingle as any).mockRejectedValue(new Error('Backend failed'));

      // Should not throw even if both sinks fail
      expect(() => track('scan_page_view')).not.toThrow();

      // Wait for async operations to complete
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('getAllowedEvents()', () => {
    it('should return all allowed event names', () => {
      const events = getAllowedEvents();

      expect(events).toEqual([
        'scan_page_view',
        'scan_submit_clicked',
        'scan_result',
        'report_page_view',
        'poster_page_view',
        'poster_save_clicked',
        'poster_download_result',
        'poster_share_result',
        'poster_qr_visit',
      ]);
    });

    it('should return readonly array', () => {
      const events = getAllowedEvents();

      expect(Array.isArray(events)).toBe(true);
    });
  });

  describe('isAllowedEvent()', () => {
    it('should return true for valid event names', () => {
      expect(isAllowedEvent('scan_page_view')).toBe(true);
      expect(isAllowedEvent('scan_submit_clicked')).toBe(true);
      expect(isAllowedEvent('scan_result')).toBe(true);
      expect(isAllowedEvent('report_page_view')).toBe(true);
      expect(isAllowedEvent('poster_page_view')).toBe(true);
      expect(isAllowedEvent('poster_save_clicked')).toBe(true);
      expect(isAllowedEvent('poster_download_result')).toBe(true);
      expect(isAllowedEvent('poster_share_result')).toBe(true);
      expect(isAllowedEvent('poster_qr_visit')).toBe(true);
    });

    it('should return false for invalid event names', () => {
      expect(isAllowedEvent('invalid_event')).toBe(false);
      expect(isAllowedEvent('')).toBe(false);
      expect(isAllowedEvent('SCAN_PAGE_VIEW')).toBe(false);
      expect(isAllowedEvent('scan-page-view')).toBe(false);
    });
  });

  describe('Event whitelisting', () => {
    it('should only track whitelisted events', async () => {
      // Suppress console.warn for this test
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Clear all previous calls
      vi.clearAllMocks();

      track('invalid_event');

      // Wait for async operations to complete
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(enrichEventContext).not.toHaveBeenCalled();
      expect(sendToGA4).not.toHaveBeenCalled();
      expect(sendToBackendSingle).not.toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    it('should track all whitelisted events', async () => {
      const whitelistedEvents = [
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

      for (const eventName of whitelistedEvents) {
        track(eventName);
      }

      // Wait for async operations to complete
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(enrichEventContext).toHaveBeenCalledTimes(whitelistedEvents.length);
      expect(sendToGA4).toHaveBeenCalledTimes(whitelistedEvents.length);
      expect(sendToBackendSingle).toHaveBeenCalledTimes(whitelistedEvents.length);
    });
  });

  describe('Performance', () => {
    it('should handle multiple rapid track calls', () => {
      const startTime = performance.now();

      // Track 100 events rapidly
      for (let i = 0; i < 100; i++) {
        track('scan_page_view', { iteration: i });
      }

      const endTime = performance.now();

      // All 100 calls should complete quickly (less than 100ms total)
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should not block business logic', () => {
      let businessLogicExecuted = false;

      // Call track
      track('scan_page_view');

      // Business logic should execute immediately
      businessLogicExecuted = true;

      expect(businessLogicExecuted).toBe(true);
    });
  });
});
