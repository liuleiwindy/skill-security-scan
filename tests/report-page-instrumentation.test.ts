/**
 * Report Page Instrumentation Tests
 *
 * Tests for report page analytics tracking including:
 * - report_page_view event on page load
 * - poster_qr_visit event for QR attribution
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';

// Mock track function BEFORE importing component
vi.mock('../lib/analytics/track', () => ({
  track: vi.fn(),
}));

// Now import component after mock is set up
import { ReportInstrumentation } from '../app/scan/report/[id]/report-instrumentation';
import { track } from '../lib/analytics/track';

// Get the mock implementation
const trackMock = vi.mocked(track);

// Mock window.location.search
const mockUrlSearchParams = {
  get: vi.fn(),
  toString: vi.fn(() => ''),
};

// Mock sessionStorage
const sessionStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true,
});

// Mock navigator.userAgent
Object.defineProperty(navigator, 'userAgent', {
  value: 'test-user-agent',
  configurable: true,
});

// Mock URLSearchParams
const originalURLSearchParams = window.URLSearchParams;
Object.defineProperty(window, 'URLSearchParams', {
  writable: true,
  configurable: true,
  value: class MockURLSearchParams {
    constructor() {
      return mockUrlSearchParams as unknown as URLSearchParams;
    }
  },
});

describe('Report Page Instrumentation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear sessionStorage before each test
    sessionStorageMock.clear();
    // Reset URLSearchParams mock
    mockUrlSearchParams.get.mockReturnValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('report_page_view event', () => {
    it('should fire report_page_view event when component mounts with scan_id', () => {
      const scanId = 'test-scan-123';
      
      // Render component
      renderHook(() => ReportInstrumentation({ scanId }));

      // Verify track was called
      expect(trackMock).toHaveBeenCalledWith('report_page_view', { scan_id: scanId });
    });

    it('should fire report_page_view only once on mount', () => {
      const scanId = 'test-scan-456';

      // Render component
      const { rerender } = renderHook(({ scanId }) => ReportInstrumentation({ scanId }), {
        initialProps: { scanId },
      });

      // Rerender with same props
      rerender({ scanId });

      // Verify it was called exactly once (not on re-renders)
      expect(trackMock).toHaveBeenCalledTimes(1);
      expect(trackMock).toHaveBeenCalledWith('report_page_view', { scan_id: scanId });
    });

    it('should not block rendering when tracking report_page_view', () => {
      const scanId = 'test-scan-789';
      const startTime = performance.now();

      // Render component - should be immediate
      renderHook(() => ReportInstrumentation({ scanId }));

      const endTime = performance.now();

      // Component should render quickly (less than 10ms)
      expect(endTime - startTime).toBeLessThan(10);
    });
  });

  describe('poster_qr_visit event (QR Attribution)', () => {
    it('should fire poster_qr_visit when src=poster_qr is present in URL', () => {
      const scanId = 'test-scan-qr-123';
      
      // Mock URL parameters to return 'poster_qr'
      mockUrlSearchParams.get.mockReturnValue('poster_qr');

      // Render component
      renderHook(() => ReportInstrumentation({ scanId }));

      // Verify both events were fired
      expect(trackMock).toHaveBeenCalledWith('report_page_view', { scan_id: scanId });
      expect(trackMock).toHaveBeenCalledWith('poster_qr_visit', {
        scan_id: scanId,
        src: 'poster_qr',
        ua_basic: 'test-user-agent',
      });
      expect(trackMock).toHaveBeenCalledTimes(2);
    });

    it('should NOT fire poster_qr_visit when src parameter is not poster_qr', () => {
      const scanId = 'test-scan-other-456';
      
      // Mock URL parameters to return a different source
      mockUrlSearchParams.get.mockReturnValue('other_source');

      // Render component
      renderHook(() => ReportInstrumentation({ scanId }));

      // poster_qr_visit should NOT be called
      expect(trackMock).not.toHaveBeenCalledWith('poster_qr_visit', expect.any(Object));

      // But report_page_view should still fire
      expect(trackMock).toHaveBeenCalledWith('report_page_view', { scan_id: scanId });
      expect(trackMock).toHaveBeenCalledTimes(1);
    });

    it('should NOT fire poster_qr_visit when src parameter is missing', () => {
      const scanId = 'test-scan-missing-789';
      
      // Mock URL parameters to return null (missing)
      mockUrlSearchParams.get.mockReturnValue(null);

      // Render component
      renderHook(() => ReportInstrumentation({ scanId }));

      // poster_qr_visit should NOT be called
      expect(trackMock).not.toHaveBeenCalledWith('poster_qr_visit', expect.any(Object));

      // But report_page_view should still fire
      expect(trackMock).toHaveBeenCalledWith('report_page_view', { scan_id: scanId });
      expect(trackMock).toHaveBeenCalledTimes(1);
    });

    it('should use sessionStorage to prevent duplicate poster_qr_visit for same scan_id', () => {
      const scanId = 'test-scan-duplicate-123';
      
      // Mock URL parameters to return 'poster_qr'
      mockUrlSearchParams.get.mockReturnValue('poster_qr');

      // Simulate first visit - mark as already tracked in sessionStorage
      sessionStorageMock.setItem(`qr_visit_${scanId}`, 'true');

      // Render component
      renderHook(() => ReportInstrumentation({ scanId }));

      // poster_qr_visit should NOT be called (already tracked)
      expect(trackMock).not.toHaveBeenCalledWith('poster_qr_visit', expect.any(Object));

      // But report_page_view should still fire
      expect(trackMock).toHaveBeenCalledWith('report_page_view', { scan_id: scanId });
      expect(trackMock).toHaveBeenCalledTimes(1);
    });

    it('should mark QR visit in sessionStorage after firing poster_qr_visit', () => {
      const scanId = 'test-scan-mark-456';
      const storageKey = `qr_visit_${scanId}`;
      
      // Mock URL parameters to return 'poster_qr'
      mockUrlSearchParams.get.mockReturnValue('poster_qr');

      // Render component
      renderHook(() => ReportInstrumentation({ scanId }));

      // Verify poster_qr_visit was called
      expect(trackMock).toHaveBeenCalledWith('poster_qr_visit', {
        scan_id: scanId,
        src: 'poster_qr',
        ua_basic: 'test-user-agent',
      });

      // Verify sessionStorage was updated
      expect(sessionStorageMock.getItem(storageKey)).toBe('true');
    });
  });

  describe('Integration - Both events on QR source', () => {
    it('should fire both report_page_view and poster_qr_visit when src=poster_qr and first visit', () => {
      const scanId = 'test-scan-both-123';
      
      // Mock URL parameters to return 'poster_qr'
      mockUrlSearchParams.get.mockReturnValue('poster_qr');

      // Render component
      renderHook(() => ReportInstrumentation({ scanId }));

      // Both events should fire
      expect(trackMock).toHaveBeenCalledWith('report_page_view', { scan_id: scanId });
      expect(trackMock).toHaveBeenCalledWith('poster_qr_visit', {
        scan_id: scanId,
        src: 'poster_qr',
        ua_basic: 'test-user-agent',
      });

      expect(trackMock).toHaveBeenCalledTimes(2);
    });
  });
});
