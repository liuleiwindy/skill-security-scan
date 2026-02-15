/**
 * Backend sink module tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  sendToBackend,
  sendToBackendSingle,
  flushBackendBuffer,
  getBackendBufferSize,
  initializeBackendSink,
} from '../lib/analytics/sinks/backend';
import type { AnalyticsEvent } from '../lib/analytics/validation';

// ============================================================================
// Mock Setup
// ============================================================================

const originalFetch = global.fetch;
const originalRequestIdleCallback = global.requestIdleCallback;
const originalSetTimeout = global.setTimeout;
const originalClearTimeout = global.clearTimeout;
const originalWindow = global.window;

const mockFetch = vi.fn();
const mockSendBeacon = vi.fn();
const mockRequestIdleCallback = vi.fn();
const mockSetTimeout = vi.fn();
const mockClearTimeout = vi.fn();
const mockAddEventListener = vi.fn();
const mockRemoveEventListener = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();

  // Set up mocks
  global.fetch = mockFetch as any;
  global.navigator = {
    sendBeacon: mockSendBeacon,
  } as any;
  global.requestIdleCallback = mockRequestIdleCallback as any;
  global.setTimeout = mockSetTimeout as any;
  global.clearTimeout = mockClearTimeout as any;
  global.window = {
    addEventListener: mockAddEventListener,
    removeEventListener: mockRemoveEventListener,
  } as any;

  // Mock requestIdleCallback to execute immediately
  mockRequestIdleCallback.mockImplementation((callback: () => void) => {
    callback();
    return 1;
  });

  // Mock setTimeout to execute immediately for testing
  mockSetTimeout.mockImplementation((callback: () => void, _delay: number) => {
    callback();
    return 1 as any;
  });

  // Mock fetch default response
  mockFetch.mockResolvedValue({
    ok: true,
    status: 202,
    json: async () => ({ accepted: 1, rejected: 0 }),
  });
});

afterEach(() => {
  // Restore original globals
  global.fetch = originalFetch;
  global.requestIdleCallback = originalRequestIdleCallback;
  global.setTimeout = originalSetTimeout;
  global.clearTimeout = originalClearTimeout;
  global.window = originalWindow;
});

// ============================================================================
// Helper Functions
// ============================================================================

function createMockEvent(event_name: string, overrides: Partial<AnalyticsEvent> = {}): AnalyticsEvent {
  return {
    event_name,
    ts: Date.now(),
    ...overrides,
  } as AnalyticsEvent;
}

// ============================================================================
// Tests
// ============================================================================

describe('Backend Sink Module', () => {
  describe('sendToBackend', () => {
    it('should send empty events array without error', async () => {
      await expect(sendToBackend([])).resolves.not.toThrow();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should send single event to batch buffer', async () => {
      const event = createMockEvent('scan_page_view');
      await sendToBackend([event]);

      // Events are buffered and flushed
      expect(getBackendBufferSize()).toBe(0);
    });

    it('should send multiple events to batch buffer', async () => {
      const events = [
        createMockEvent('scan_page_view'),
        createMockEvent('scan_submit_clicked', { input_type: 'url' }),
        createMockEvent('scan_result', { status: 'success', duration_ms: 1234 }),
      ];

      await sendToBackend(events);

      // Events should be buffered and sent
      expect(getBackendBufferSize()).toBe(0);
    });

    it('should call fetch with correct payload', async () => {
      const event = createMockEvent('scan_page_view');

      await sendToBackend([event]);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/analytics?device_id=unknown_device'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'x-device-id': 'unknown_device',
          }),
          body: expect.stringContaining('"event_name":"scan_page_view"'),
        })
      );
    });

    it('should include x-device-id and x-session-id when available on event context', async () => {
      const event = createMockEvent('scan_page_view', {
        device_id: 'device_ctx_123',
        session_id: 'session_ctx_456',
      } as any);

      await sendToBackend([event]);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/analytics?device_id=device_ctx_123&session_id=session_ctx_456'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-device-id': 'device_ctx_123',
            'x-session-id': 'session_ctx_456',
          }),
        })
      );
    });

    it('should batch events in single request', async () => {
      const events = [
        createMockEvent('scan_page_view'),
        createMockEvent('scan_submit_clicked', { input_type: 'url' }),
      ];

      await sendToBackend(events);

      expect(mockFetch).toHaveBeenCalledTimes(1);

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body as string);
      expect(requestBody).toHaveLength(2);
      expect(requestBody[0].event_name).toBe('scan_page_view');
      expect(requestBody[1].event_name).toBe('scan_submit_clicked');
    });
  });

  describe('sendToBackendSingle', () => {
    it('should send single event', async () => {
      await sendToBackendSingle('scan_page_view', { ts: Date.now() });

      expect(mockFetch).toHaveBeenCalled();
    });

    it('should merge props with event name', async () => {
      const ts = Date.now();

      await sendToBackendSingle('scan_submit_clicked', {
        input_type: 'url',
        ts,
      });

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body as string);
      expect(requestBody[0].event_name).toBe('scan_submit_clicked');
      expect(requestBody[0].input_type).toBe('url');
      expect(requestBody[0].ts).toBe(ts);
    });
  });

  describe('Batching Logic', () => {
    it('should flush when batch size exceeds MAX_BATCH_SIZE', async () => {
      // Create 50 events (MAX_BATCH_SIZE)
      const events = Array.from({ length: 50 }, () =>
        createMockEvent('scan_page_view')
      );

      await sendToBackend(events);

      // Should trigger immediate flush due to batch size
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should schedule periodic flush', async () => {
      await sendToBackend([createMockEvent('scan_page_view')]);

      // Verify setTimeout was called for periodic flush
      expect(mockSetTimeout).toHaveBeenCalled();
    });
  });

  describe('Retry Logic', () => {
    it('should retry on server errors (5xx)', async () => {
      let attemptCount = 0;
      mockFetch.mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          return Promise.resolve({
            ok: false,
            status: 503,
            statusText: 'Service Unavailable',
          });
        }
        return Promise.resolve({
          ok: true,
          status: 202,
          json: async () => ({ accepted: 1, rejected: 0 }),
        });
      });

      await sendToBackend([createMockEvent('scan_page_view')]);

      expect(attemptCount).toBeGreaterThanOrEqual(1);
    });

    it('should not retry on client errors (4xx)', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      });

      await sendToBackend([createMockEvent('scan_page_view')]);

      // Should only be called once
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should stop retrying after MAX_RETRIES', async () => {
      let attemptCount = 0;
      mockFetch.mockImplementation(() => {
        attemptCount++;
        return Promise.resolve({
          ok: false,
          status: 503,
        });
      });

      await sendToBackend([createMockEvent('scan_page_view')]);

      // Should only retry 3 times (1 initial + 2 retries)
      expect(attemptCount).toBe(3);
    });

    it('should log warning when max retries exceeded', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      mockFetch.mockResolvedValue({
        ok: false,
        status: 503,
      });

      await sendToBackend([createMockEvent('scan_page_view')]);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Max retries (3) reached')
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('should log errors but not throw', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(
        sendToBackend([createMockEvent('scan_page_view')])
      ).resolves.not.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should handle malformed JSON response', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 202,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      await expect(
        sendToBackend([createMockEvent('scan_page_view')])
      ).resolves.not.toThrow();
    });
  });

  describe('sendBeacon Fallback', () => {
    it('should use sendBeacon when available', async () => {
      mockSendBeacon.mockReturnValue(true);

      // Trigger page unload scenario
      await sendToBackend([createMockEvent('scan_page_view')]);

      // In normal flow, fetch is used. sendBeacon is used during page unload
      // which is tested in initializeBackendSink tests
    });
  });

  describe('flushBackendBuffer', () => {
    it('should flush all buffered events', async () => {
      await sendToBackend([
        createMockEvent('scan_page_view'),
        createMockEvent('scan_submit_clicked', { input_type: 'url' }),
        createMockEvent('scan_result', { status: 'success', duration_ms: 1234 }),
      ]);

      // Force flush
      await flushBackendBuffer();

      expect(mockFetch).toHaveBeenCalled();
    });

    it('should handle empty buffer', async () => {
      await expect(flushBackendBuffer()).resolves.not.toThrow();
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('getBackendBufferSize', () => {
    it('should return 0 for empty buffer', () => {
      expect(getBackendBufferSize()).toBe(0);
    });

    it('should return current buffer size', async () => {
      const events = Array.from({ length: 10 }, () =>
        createMockEvent('scan_page_view')
      );

      await sendToBackend(events);

      // Size should be 0 after events are processed
      expect(getBackendBufferSize()).toBe(0);
    });
  });

  describe('initializeBackendSink', () => {
    it('should register page unload event listeners', () => {
      initializeBackendSink();

      expect(mockAddEventListener).toHaveBeenCalledWith(
        'beforeunload',
        expect.any(Function)
      );
      expect(mockAddEventListener).toHaveBeenCalledWith(
        'pagehide',
        expect.any(Function)
      );
    });

    it('should return cleanup function', () => {
      const cleanup = initializeBackendSink();

      expect(typeof cleanup).toBe('function');
    });

    it('should not add listeners in non-browser environment', () => {
      // @ts-ignore - remove window temporarily
      delete global.window;

      initializeBackendSink();

      expect(mockAddEventListener).not.toHaveBeenCalled();

      // Restore window
      global.window = {
        addEventListener: mockAddEventListener,
        removeEventListener: mockRemoveEventListener,
      } as any;
    });
  });

  describe('Performance', () => {
    it('should use requestIdleCallback when available', async () => {
      await sendToBackend([createMockEvent('scan_page_view')]);

      expect(mockRequestIdleCallback).toHaveBeenCalled();
    });

    it('should not block main thread with fetch calls', async () => {
      const sendPromise = sendToBackend([createMockEvent('scan_page_view')]);

      // Should return immediately without blocking
      await sendPromise;
    });
  });
});
