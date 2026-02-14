/**
 * Task 1.4: Timeout Detection Tests for PosterImage Component
 *
 * These tests verify the timeout detection mechanism:
 * 1. Image request starts 8s timeout detection
 * 2. Timeout after 8s shows retry CTA (keeps placeholder)
 * 3. Development environment logs timeout events
 * 4. Production error reporting is reserved (v0.2.4.4)
 * 5. Custom timeout values work correctly
 * 6. AbortController cancels fetch on timeout
 * 7. Progress tracking during loading
 * 8. Performance metrics are recorded on successful load
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import * as matchers from '@testing-library/jest-dom/matchers';
import { PosterImage, PosterImageErrorType } from '../components/PosterImage';
import path from 'node:path';
import fs from 'node:fs';

expect.extend(matchers);

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock performance API
const mockPerformanceGetEntriesByName = vi.fn();
global.performance.getEntriesByName = mockPerformanceGetEntriesByName;

// Mock console methods
const consoleLogSpy = vi.spyOn(console, 'log');
const consoleWarnSpy = vi.spyOn(console, 'warn');
const consoleErrorSpy = vi.spyOn(console, 'error');

describe('Task 1.4: Timeout Detection Mechanism', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    consoleLogSpy.mockClear();
    consoleWarnSpy.mockClear();
    consoleErrorSpy.mockClear();
    mockPerformanceGetEntriesByName.mockReturnValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('验收标准 1: 图片请求启动 8s 超时检测', () => {
    it('should start loading image when mounted', async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          blob: () => Promise.resolve(new Blob(['image data'], { type: 'image/png' })),
        } as Response)
      );

      render(<PosterImage scanId="test-scan-id" />);

      // Verify fetch was called
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/scan/test-scan-id/poster/image',
          expect.objectContaining({
            signal: expect.any(AbortSignal),
            cache: 'no-cache',
          })
        );
      });
    });

    it('should timeout after default 8 seconds', async () => {
      // Mock a never-resolving fetch
      mockFetch.mockImplementationOnce(() => new Promise(() => {}));

      const onTimeout = vi.fn();
      render(<PosterImage scanId="test-scan-id" onTimeout={onTimeout} />);

      // Fast-forward to 7999ms - should not timeout yet
      vi.advanceTimersByTime(7999);
      await waitFor(() => {
        expect(onTimeout).not.toHaveBeenCalled();
        expect(screen.queryByText(/Network issue while loading poster/i)).not.toBeInTheDocument();
      });

      // Fast-forward to 8000ms - should timeout
      vi.advanceTimersByTime(1);
      await waitFor(() => {
        expect(onTimeout).toHaveBeenCalledTimes(1);
        expect(screen.getByText(/Network issue while loading poster/i)).toBeInTheDocument();
      });
    });

    it('should timeout after custom timeout value', async () => {
      mockFetch.mockImplementationOnce(() => new Promise(() => {}));

      const onTimeout = vi.fn();
      render(<PosterImage scanId="test-scan-id" timeoutMs={5000} onTimeout={onTimeout} />);

      // Fast-forward to 4999ms - should not timeout yet
      vi.advanceTimersByTime(4999);
      await waitFor(() => {
        expect(onTimeout).not.toHaveBeenCalled();
      });

      // Fast-forward to 5000ms - should timeout
      vi.advanceTimersByTime(1);
      await waitFor(() => {
        expect(onTimeout).toHaveBeenCalledTimes(1);
        expect(screen.getByText(/Network issue while loading poster/i)).toBeInTheDocument();
      });
    });
  });

  describe('验收标准 2: 超时后显示 retry CTA（保持 placeholder）', () => {
    it('should show retry CTA after timeout', async () => {
      mockFetch.mockImplementationOnce(() => new Promise(() => {}));

      render(<PosterImage scanId="test-scan-id" />);

      // Trigger timeout
      vi.advanceTimersByTime(8000);
      await waitFor(() => {
        expect(screen.getByText('Retry Loading Poster')).toBeInTheDocument();
      });
    });

    it('should keep placeholder visible after timeout', async () => {
      mockFetch.mockImplementationOnce(() => new Promise(() => {}));

      const { container } = render(<PosterImage scanId="test-scan-id" />);

      // Trigger timeout
      vi.advanceTimersByTime(8000);

      await waitFor(() => {
        // Check that placeholder is still visible (opacity should be 1)
        const placeholder = container.querySelector('[class*="placeholder"]');
        expect(placeholder).toBeInTheDocument();
        expect(placeholder).toHaveStyle({ opacity: '1' });
      });
    });

    it('should retry on button click after timeout', async () => {
      // First attempt times out
      mockFetch.mockImplementationOnce(() => new Promise(() => {}));

      render(<PosterImage scanId="test-scan-id" />);

      // Trigger timeout
      vi.advanceTimersByTime(8000);

      await waitFor(() => {
        const retryButton = screen.getByText('Retry Loading Poster');
        expect(retryButton).toBeInTheDocument();
      });

      // Mock successful response on retry
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          blob: () => Promise.resolve(new Blob(['image data'], { type: 'image/png' })),
        } as Response)
      );

      // Click retry button
      const retryButton = screen.getByText('Retry Loading Poster');
      fireEvent.click(retryButton);

      // Verify fetch was called again
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('验收标准 3: 开发环境 console.log 超时事件', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    it('should log timeout event in development environment', async () => {
      mockFetch.mockImplementationOnce(() => new Promise(() => {}));

      render(<PosterImage scanId="test-scan-id" timeoutMs={5000} />);

      // Trigger timeout
      vi.advanceTimersByTime(5000);

      await waitFor(() => {
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          '[PosterImage] Timed out after 5000ms',
          expect.objectContaining({
            scanId: 'test-scan-id',
            imgSrc: '/api/scan/test-scan-id/poster/image',
            timeoutMs: 5000,
          })
        );
      });
    });

    it('should log successful load with timing in development', async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          blob: () => Promise.resolve(new Blob(['image data'], { type: 'image/png' })),
        } as Response)
      );

      render(<PosterImage scanId="test-scan-id" />);

      await waitFor(() => {
        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('[PosterImage] Loaded in'),
          expect.objectContaining({
            scanId: 'test-scan-id',
          })
        );
      });
    });

    it('should log error with timing in development', async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          status: 404,
          blob: () => Promise.resolve(new Blob([])),
        } as Response)
      );

      const onError = vi.fn();
      render(<PosterImage scanId="test-scan-id" onError={onError} />);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('[PosterImage] Failed after'),
          expect.objectContaining({
            scanId: 'test-scan-id',
            errorType: 'http-404',
            responseStatus: 404,
          })
        );
      });
    });
  });

  describe('验收标准 4: Production 错误上报预留（v0.2.4.4）', () => {
    it('should have reserved spot for production error reporting', async () => {
      // This test verifies the code structure has reserved spots for production telemetry
      // by checking the component exports PerformanceMetrics type
      expect(typeof PosterImage).toBe('function');

      // The component should have a PerformanceMetrics interface exported
      // This is a structural test to ensure the telemetry infrastructure is in place
      const filePath = path.resolve(__dirname, '../components/PosterImage.tsx');
      const fileContent = fs.readFileSync(filePath, 'utf-8');

      expect(fileContent).toContain('PerformanceMetrics');
      expect(fileContent).toContain('// Production: send to analytics service (v0.2.4.4)');
    });

    it('should record performance metrics on successful load', async () => {
      const mockEntry = {
        duration: 1234,
        transferSize: 50000,
        decodedBodySize: 45000,
        startTime: 100,
      };

      mockPerformanceGetEntriesByName.mockReturnValue([mockEntry]);

      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          blob: () => Promise.resolve(new Blob(['image data'], { type: 'image/png' })),
        } as Response)
      );

      render(<PosterImage scanId="test-scan-id" />);

      await waitFor(() => {
        // Verify performance API was queried
        expect(mockPerformanceGetEntriesByName).toHaveBeenCalledWith(
          '/api/scan/test-scan-id/poster/image',
          'resource'
        );

        // Verify metrics were logged in development
        expect(consoleLogSpy).toHaveBeenCalledWith(
          '[PosterImage] Performance metrics:',
          expect.objectContaining({
            scanId: 'test-scan-id',
            duration: 1234,
            transferSize: 50000,
            decodedBodySize: 45000,
            timestamp: 100,
          })
        );
      });
    });
  });

  describe('AbortController Integration', () => {
    it('should abort fetch request on timeout', async () => {
      const abortSpy = vi.fn();
      mockFetch.mockImplementationOnce((url, options) => {
        if (options?.signal) {
          options.signal.addEventListener('abort', abortSpy);
        }
        return new Promise(() => {});
      });

      render(<PosterImage scanId="test-scan-id" timeoutMs={3000} />);

      // Trigger timeout
      vi.advanceTimersByTime(3000);

      await waitFor(() => {
        expect(abortSpy).toHaveBeenCalled();
      });
    });

    it('should cleanup timeout on successful load', async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          blob: () => Promise.resolve(new Blob(['image data'], { type: 'image/png' })),
        } as Response)
      );

      render(<PosterImage scanId="test-scan-id" timeoutMs={8000} />);

      // Fast-forward to 3s (image loaded before timeout)
      vi.advanceTimersByTime(3000);

      await waitFor(() => {
        expect(screen.queryByText(/Network issue while loading poster/i)).not.toBeInTheDocument();
      });

      // Fast-forward past timeout - should not trigger timeout since image loaded
      vi.advanceTimersByTime(5000);

      await waitFor(() => {
        expect(screen.queryByText(/Network issue while loading poster/i)).not.toBeInTheDocument();
      });
    });

    it('should cleanup on unmount', () => {
      const unmountSpy = vi.fn();
      mockFetch.mockImplementationOnce((url, options) => {
        if (options?.signal) {
          options.signal.addEventListener('abort', unmountSpy);
        }
        return new Promise(() => {});
      });

      const { unmount } = render(<PosterImage scanId="test-scan-id" timeoutMs={5000} />);

      // Unmount before timeout
      unmount();

      expect(unmountSpy).toHaveBeenCalled();
    });
  });

  describe('Progress Tracking', () => {
    it('should track progress during loading', async () => {
      const onProgress = vi.fn();
      mockFetch.mockImplementationOnce(() => new Promise(() => {}));

      render(<PosterImage scanId="test-scan-id" timeoutMs={5000} onProgress={onProgress} />);

      // Check progress at different intervals
      vi.advanceTimersByTime(1000);
      await waitFor(() => {
        expect(onProgress).toHaveBeenCalledWith(20); // 1000/5000 * 100
      });

      vi.advanceTimersByTime(1500);
      await waitFor(() => {
        expect(onProgress).toHaveBeenCalledWith(50); // 2500/5000 * 100
      });

      vi.advanceTimersByTime(1000);
      await waitFor(() => {
        expect(onProgress).toHaveBeenCalledWith(70); // 3500/5000 * 100
      });
    });

    it('should cap progress at 100%', async () => {
      const onProgress = vi.fn();
      mockFetch.mockImplementationOnce(() => new Promise(() => {}));

      render(<PosterImage scanId="test-scan-id" timeoutMs={3000} onProgress={onProgress} />);

      // Fast-forward past timeout
      vi.advanceTimersByTime(4000);

      await waitFor(() => {
        expect(onProgress).toHaveBeenCalledWith(100);
      });
    });
  });

  describe('Timeout UI Enhancement', () => {
    it('should display timeout-specific message', async () => {
      mockFetch.mockImplementationOnce(() => new Promise(() => {}));

      render(<PosterImage scanId="test-scan-id" timeoutMs={5000} />);

      vi.advanceTimersByTime(5000);

      await waitFor(() => {
        expect(screen.getByText(/Loading is taking longer than expected/i)).toBeInTheDocument();
        expect(screen.getByText(/Request timed out after 5000ms/i)).toBeInTheDocument();
      });
    });

    it('should display timeout icon', async () => {
      mockFetch.mockImplementationOnce(() => new Promise(() => {}));

      render(<PosterImage scanId="test-scan-id" />);

      vi.advanceTimersByTime(8000);

      await waitFor(() => {
        const timeoutIcon = screen.getByText('⏱️');
        expect(timeoutIcon).toBeInTheDocument();
      });
    });
  });

  describe('Callback Integration', () => {
    it('should call onTimeout callback when timeout occurs', async () => {
      mockFetch.mockImplementationOnce(() => new Promise(() => {}));

      const onTimeout = vi.fn();
      const onError = vi.fn();

      render(<PosterImage scanId="test-scan-id" onTimeout={onTimeout} onError={onError} />);

      vi.advanceTimersByTime(8000);

      await waitFor(() => {
        expect(onTimeout).toHaveBeenCalledTimes(1);
        expect(onError).toHaveBeenCalledWith('timeout' as PosterImageErrorType);
      });
    });

    it('should call onLoad callback when image loads successfully', async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          blob: () => Promise.resolve(new Blob(['image data'], { type: 'image/png' })),
        } as Response)
      );

      const onLoad = vi.fn();

      render(<PosterImage scanId="test-scan-id" onLoad={onLoad} />);

      await waitFor(() => {
        expect(onLoad).toHaveBeenCalledTimes(1);
      });
    });

    it('should call onProgress callback with 100% on success', async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          blob: () => Promise.resolve(new Blob(['image data'], { type: 'image/png' })),
        } as Response)
      );

      const onProgress = vi.fn();

      render(<PosterImage scanId="test-scan-id" onProgress={onProgress} />);

      await waitFor(() => {
        expect(onProgress).toHaveBeenCalledWith(100);
      });
    });
  });

  describe('Network Error vs Timeout Distinction', () => {
    it('should treat network error differently from timeout', async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.reject(new Error('Network connection lost'))
      );

      const onTimeout = vi.fn();
      const onError = vi.fn();

      render(<PosterImage scanId="test-scan-id" onTimeout={onTimeout} onError={onError} />);

      await waitFor(() => {
        expect(onTimeout).not.toHaveBeenCalled();
        expect(onError).toHaveBeenCalledWith('network' as PosterImageErrorType);
        expect(screen.getByText(/Network issue while loading poster/i)).toBeInTheDocument();
      });
    });

    it('should show different icons for timeout vs other errors', async () => {
      // Test timeout
      mockFetch.mockImplementationOnce(() => new Promise(() => {}));

      render(<PosterImage scanId="test-scan-id" timeoutMs={1000} />);

      vi.advanceTimersByTime(1000);

      await waitFor(() => {
        expect(screen.getByText('⏱️')).toBeInTheDocument();
      });

      // Test 404 error
      const { rerender } = render(<PosterImage scanId="test-scan-id-404" />);

      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          status: 404,
          blob: () => Promise.resolve(new Blob([])),
        } as Response)
      );

      rerender(<PosterImage scanId="test-scan-id-404" />);

      await waitFor(() => {
        expect(screen.getByText('⚠️')).toBeInTheDocument();
      });
    });
  });

  describe('Multiple Retry Scenarios', () => {
    it('should handle multiple retries correctly', async () => {
      const onTimeout = vi.fn();

      // First attempt times out
      mockFetch.mockImplementationOnce(() => new Promise(() => {}));
      render(<PosterImage scanId="test-scan-id" onTimeout={onTimeout} />);

      vi.advanceTimersByTime(8000);

      await waitFor(() => {
        expect(onTimeout).toHaveBeenCalledTimes(1);
      });

      // Second attempt also times out
      mockFetch.mockImplementationOnce(() => new Promise(() => {}));

      const retryButton = screen.getByText('Retry Loading Poster');
      fireEvent.click(retryButton);

      vi.advanceTimersByTime(8000);

      await waitFor(() => {
        expect(onTimeout).toHaveBeenCalledTimes(2);
      });
    });

    it('should succeed on retry after initial timeout', async () => {
      mockFetch.mockImplementationOnce(() => new Promise(() => {}));

      render(<PosterImage scanId="test-scan-id" />);

      vi.advanceTimersByTime(8000);

      await waitFor(() => {
        expect(screen.getByText('Retry Loading Poster')).toBeInTheDocument();
      });

      // Mock success on retry
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          blob: () => Promise.resolve(new Blob(['image data'], { type: 'image/png' })),
        } as Response)
      );

      const retryButton = screen.getByText('Retry Loading Poster');
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(screen.queryByText('Retry Loading Poster')).not.toBeInTheDocument();
      });
    });
  });
});

/**
 * Manual Test Checklist for Task 1.4
 *
 * Before marking Task 1.4 as complete, manually verify:
 *
 * 1. Open browser DevTools Console
 * 2. Navigate to /scan/poster/[id] with a valid scan ID
 * 3. Simulate slow network using DevTools Network throttling (e.g., Offline)
 * 4. Observe:
 *    - Placeholder appears immediately
 *    - Progress bar advances from 0 to 100% over 8 seconds
 *    - After 8 seconds, timeout UI appears with:
 *      - ⏱️ icon
 *      - "Network issue while loading poster" message
 *      - "Loading is taking longer than expected" sub-message
 *      - "Request timed out after 8000ms" details
 *      - "Retry Loading Poster" button
 *    - Placeholder remains visible
 *    - Console shows: "[PosterImage] Timed out after 8000ms" with scanId, imgSrc, timeoutMs
 *
 * 5. Click "Retry Loading Poster"
 * 6. Observe:
 *    - Loading state resets
 *    - Progress bar starts from 0
 *    - Placeholder remains visible
 *
 * 7. Test with custom timeout (if implemented):
 *    - Add timeoutMs={5000} prop to component
 *    - Verify timeout occurs at 5 seconds instead of 8
 *
 * 8. Test successful load (for comparison):
 *    - Disable network throttling
 *    - Reload page
 *    - Verify console shows: "[PosterImage] Loaded in Xms" with timing
 *    - Verify console shows: "[PosterImage] Performance metrics:" if available
 *
 * 9. Test error vs timeout distinction:
 *    - Navigate to /scan/poster/non-existent-id
 *    - Verify 404 error shows ⚠️ icon (not ⏱️)
 *    - Verify "Poster not found" message
 *    - Verify no "Request timed out" message
 *
 * 10. Test abort on unmount:
 *     - Navigate to poster page
 *     - Before 8 seconds elapse, navigate away
 *     - Verify console shows abort log (if any)
 *     - Verify no timeout callback is fired
 */
