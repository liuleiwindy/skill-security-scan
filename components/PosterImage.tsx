"use client";

import React from "react";
import { useState, useEffect, useRef, useCallback, ReactNode } from "react";
import Link from "next/link";
import styles from "./PosterImage.module.css";

/**
 * Load state type for PosterImage component
 *
 * @remarks
 * Tracks the loading state of the poster image through its lifecycle
 */
export type LoadState = 'loading' | 'loaded' | 'error' | 'timeout';

/**
 * Error type for poster image loading failures
 *
 * @remarks
 * Distinguishes between different types of errors that can occur during image loading
 * - timeout: Network timeout during image fetch
 * - http-404: Poster not found (404 status)
 * - http-5xx: Server error (500, 502, 503, 504)
 * - network: Generic network failure
 */
export type PosterImageErrorType = "timeout" | "http-404" | "http-5xx" | "network";

/**
 * Image error interface
 *
 * @remarks
 * Contains detailed error information including type, message, and retry capability
 */
export interface ImageError {
  type: PosterImageErrorType;
  message: string;
  retryable: boolean;
}

/**
 * Performance metrics interface for image loading
 *
 * @remarks
 * Tracks performance data for telemetry (v0.2.4.4)
 */
export interface PerformanceMetrics {
  scanId: string;
  duration: number;
  transferSize?: number;
  decodedBodySize?: number;
  timestamp: number;
}

/**
 * Props interface for PosterImage component
 *
 * @param scanId - The scan ID used to fetch the poster image
 * @param src - Optional custom image source. Defaults to `/api/scan/:scanId/poster/image`
 * @param placeholderSrc - Optional custom placeholder source (base64 or URL). Defaults to SVG placeholder
 * @param timeoutMs - Timeout duration in milliseconds. Defaults to 20000ms
 * @param onLoad - Callback invoked when the image loads successfully
 * @param onError - Callback invoked when the image fails to load, receives error type
 * @param onTimeout - Callback invoked when image loading times out
 * @param onProgress - Optional callback for loading progress (0-100)
 * @param className - Optional custom CSS class name
 * @param alt - Optional custom alt text for accessibility
 */
export interface PosterImageProps {
  scanId: string;
  src?: string;
  placeholderSrc?: string;
  timeoutMs?: number;
  onLoad?: () => void;
  onError?: (type: PosterImageErrorType) => void;
  onTimeout?: () => void;
  onProgress?: (percent: number) => void;
  className?: string;
  alt?: string;
}

/**
 * Default configuration values
 */
const DEFAULT_TIMEOUT_MS = 20000;
const ASPECT_RATIO = '687 / 1024';

/**
 * Error messages for each error type
 */
const ERROR_MESSAGES: Record<PosterImageErrorType, string> = {
  'timeout': 'Network issue while loading poster',
  'http-404': 'Poster not found',
  'http-5xx': 'Poster generation is temporarily unavailable',
  'network': 'Network issue while loading poster',
};

/**
 * Error action configuration for each error type
 */
const ERROR_ACTIONS: Record<PosterImageErrorType, { showRetry: boolean; showBackLink: boolean }> = {
  'timeout': { showRetry: true, showBackLink: false },
  'http-404': { showRetry: false, showBackLink: true },
  'http-5xx': { showRetry: true, showBackLink: false },
  'network': { showRetry: true, showBackLink: false },
};

/**
 * Generate default SVG placeholder as base64
 *
 * @remarks
 * Creates a minimal SVG placeholder with gray background and loading text
 *
 * @returns Base64-encoded SVG data URI
 */
const generateDefaultPlaceholder = (): string => {
  const svg = `
    <svg width="687" height="1024" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#1e293b"/>
      <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" fill="#64748b" font-family="system-ui, sans-serif" font-size="18">
        Loading Poster...
      </text>
    </svg>
  `;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

/**
 * Determine error type from HTTP response status
 *
 * @remarks
 * Analyzes the HTTP response to determine the appropriate error type
 *
 * @param response - The fetch Response object
 * @returns The determined error type
 */
const determineErrorTypeFromResponse = (response: Response): PosterImageErrorType => {
  if (response.status === 404) return 'http-404';
  if (response.status >= 500 && response.status < 600) return 'http-5xx';
  return 'network';
};

const ClockIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

/**
 * Not Found Icon component for 404 errors
 */
const NotFoundIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

/**
 * Server Icon component for 5xx errors
 */
const ServerIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
    <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
    <line x1="6" y1="6" x2="6.01" y2="6" />
    <line x1="6" y1="18" x2="6.01" y2="18" />
  </svg>
);

/**
 * Wifi Icon component for network errors
 */
const WifiIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12.55a11 11 0 0 1 14.08 0" />
    <path d="M1.42 9a16 16 0 0 1 21.16 0" />
    <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
    <line x1="12" y1="20" x2="12.01" y2="20" />
  </svg>
);

/**
 * Error Icon component for generic errors
 */
const ErrorIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

/**
 * Get appropriate icon for a given error type
 *
 * @param errorType - The type of error
 * @returns The icon component for error type
 */
function getErrorIcon(errorType: PosterImageErrorType): ReactNode {
  switch (errorType) {
    case 'timeout':
      return <ClockIcon />;
    case 'http-404':
      return <NotFoundIcon />;
    case 'http-5xx':
      return <ServerIcon />;
    case 'network':
      return <WifiIcon />;
    default:
      return <ErrorIcon />;
  }
}

/**
 * PosterImage Component
 *
 * A component that implements LQIP (Low Quality Image Placeholder) strategy
 * for loading poster images with smooth transitions and no layout shift.
 *
 * Features:
 * - Shows low-quality placeholder immediately
 * - Loads high-resolution poster image in background
 * - Smooth fade transition when image loads
 * - No layout shift using absolute positioning
 * - Configurable timeout with retry support (8s default)
 * - Comprehensive error handling with retry CTA
 * - AbortController for cancellable requests
 * - Development environment logging
 * - Performance metrics tracking (for v0.2.4.4)
 * - Loading progress indicator (optional)
 * - Accessibility support (aria-busy, aria-live)
 * - Professional error icons for each error type
 *
 * @example
 * ```tsx
 * <PosterImage
 *   scanId="abc123"
 *   onLoad={() => console.log('Image loaded')}
 *   onError={(type) => console.error('Error:', type)}
 *   onTimeout={() => console.warn('Timeout')}
 * />
 * ```
 *
 * @example
 * ```tsx
 * // With custom timeout and placeholder
 * <PosterImage
 *   scanId="abc123"
 *   timeoutMs={10000}
 *   placeholderSrc="/custom-placeholder.png"
 *   src="/api/scan/abc123/poster/image"
 * />
 * ```
 */
export function PosterImage({
  scanId,
  src,
  placeholderSrc,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  onLoad,
  onError,
  onTimeout,
  onProgress,
  className,
  alt,
}: PosterImageProps) {
  const [state, setState] = useState<LoadState>('loading');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isTimedOut, setIsTimedOut] = useState(false);
  const [loadingStartTime, setLoadingStartTime] = useState<number>(Date.now());
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<ImageError | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);

  const imgRef = useRef<HTMLImageElement>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const timeoutIdRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const progressIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined);

  /**
   * Handle image load success
   */
  const handleImageLoad = useCallback((objectUrl: string) => {
    // Clear timeout
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    // Calculate and log load time
    const loadTime = Date.now() - loadingStartTime;

    // Development environment logging
    if (process.env.NODE_ENV === 'development') {
      console.log(`[PosterImage] Loaded in ${loadTime}ms`, { scanId });
    }

    // Performance metrics tracking (for v0.2.4.4)
    const imgSrc = src || `/api/scan/${scanId}/poster/image`;
    const performanceEntries = performance.getEntriesByName(imgSrc, 'resource') as PerformanceResourceTiming[];
    if (performanceEntries.length > 0) {
      const entry = performanceEntries[0];
      const metrics: PerformanceMetrics = {
        scanId,
        duration: entry.duration,
        transferSize: entry.transferSize,
        decodedBodySize: entry.decodedBodySize,
        timestamp: entry.startTime,
      };

      // Development environment: log performance metrics
      if (process.env.NODE_ENV === 'development') {
        console.log('[PosterImage] Performance metrics:', metrics);
      }

      // Production: send to analytics service (v0.2.4.4)
      // sendPerformanceMetrics(metrics);
    }

    setImageUrl(objectUrl);
    setState('loaded');
    setIsTimedOut(false);
    setError(null);
    setProgress(100);
    onProgress?.(100);
    onLoad?.();

    // Start transition after a small delay to ensure image is rendered
    setIsTransitioning(true);
  }, [scanId, src, loadingStartTime, onLoad, onProgress]);

  /**
   * Handle image load error
   */
  const handleImageError = useCallback((errorType: PosterImageErrorType, response?: Response) => {
    // Clear timeout and progress
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    // Calculate and log error time
    const loadTime = Date.now() - loadingStartTime;

    // Development environment logging
    if (process.env.NODE_ENV === 'development') {
      console.error(`[PosterImage] Failed after ${loadTime}ms`, {
        scanId,
        errorType,
        responseStatus: response?.status,
      });
    }

    const error: ImageError = {
      type: errorType,
      message: ERROR_MESSAGES[errorType],
      retryable: ERROR_ACTIONS[errorType].showRetry,
    };

    setError(error);
    setState('error');
    setIsTimedOut(false);
    onError?.(errorType);
  }, [loadingStartTime, onError, scanId]);

  /**
   * Handle timeout during image load
   */
  const handleTimeout = useCallback(() => {
    // Stop progress animation but keep request in-flight.
    // Cold starts or cross-region requests can exceed timeout and still succeed.
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    const loadTime = Date.now() - loadingStartTime;
    const imgSrc = src || `/api/scan/${scanId}/poster/image`;

    // Development environment logging
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[PosterImage] Timed out after ${loadTime}ms`, {
        scanId,
        imgSrc,
        timeoutMs,
      });
    }

    const error: ImageError = {
      type: 'timeout',
      message: ERROR_MESSAGES['timeout'],
      retryable: true,
    };

    setError(error);
    setIsTimedOut(true);
    setState('timeout');
    setProgress(100);
    onProgress?.(100);
    onError?.('timeout');
    onTimeout?.();
  }, [loadingStartTime, scanId, src, timeoutMs, onError, onTimeout, onProgress]);

  /**
   * Handle retry action
   */
  const handleRetry = useCallback(() => {
    // Reset state and trigger reload
    setState('loading');
    setIsTimedOut(false);
    setError(null);
    setProgress(0);
    setLoadingStartTime(Date.now());
    setRetryNonce((v) => v + 1);
  }, []);

  /**
   * Start loading the image
   */
  useEffect(() => {
    // Don't start loading if already in loaded or error state
    if (state === 'loaded' || state === 'error') {
      return;
    }

    const imgSrc = src || `/api/scan/${scanId}/poster/image`;

    // Reset state when dependencies change
    setState('loading');
    setIsTransitioning(false);
    setImageUrl('');
    setIsTimedOut(false);
    setError(null);
    setLoadingStartTime(Date.now());
    setProgress(0);

    // Create AbortController for cancellable request
    controllerRef.current = new AbortController();

    // Start progress tracking
    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - loadingStartTime;
      const percent = Math.min((elapsed / timeoutMs) * 100, 100);
      setProgress(percent);
      onProgress?.(percent);

      // If we've reached 100%, stop tracking (timeout will be triggered separately)
      if (percent >= 100) {
        clearInterval(progressIntervalRef.current!);
      }
    }, 100);

    // Set up timeout
    timeoutIdRef.current = setTimeout(() => {
      handleTimeout();
    }, timeoutMs);

    // Load image using fetch with AbortController
    const loadImage = async () => {
      try {
        const response = await fetch(imgSrc, {
          signal: controllerRef.current!.signal,
          cache: 'no-cache',
        });

        if (!response.ok) {
          throw { status: response.status, isHttpError: true };
        }

        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);

        // Create Image object to verify it loads correctly
        const img = new Image();

        img.onload = () => {
          handleImageLoad(objectUrl);
        };

        img.onerror = () => {
          handleImageError('network', response);
          URL.revokeObjectURL(objectUrl);
        };

        img.src = objectUrl;

      } catch (error: unknown) {
        // Check if it's an abort error (timeout)
        if (error instanceof DOMException && error.name === 'AbortError') {
          // Timeout already handled by handleTimeout
          return;
        }

        // Check if it's an HTTP error
        if (error && typeof error === 'object' && 'isHttpError' in error) {
          const httpError = error as { status: number; isHttpError: boolean };
          const errorType = determineErrorTypeFromResponse({ status: httpError.status } as Response);
          handleImageError(errorType, { status: httpError.status } as Response);
          return;
        }

        // Network error
        handleImageError('network');
      }
    };

    loadImage();

    // Cleanup function
    return () => {
      controllerRef.current?.abort();
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [scanId, src, timeoutMs, retryNonce, handleImageLoad, handleImageError, handleTimeout, onProgress]);

  // Determine the placeholder source
  const placeholder = placeholderSrc || generateDefaultPlaceholder();
  const altText = alt || `Security Scan Poster - ${scanId}`;
  const isLoaded = state === 'loaded' || state === 'timeout';
  const showErrorState = state === 'error' || isTimedOut;

  return (
    <div
      className={`${styles.container} ${className || ''}`}
      style={{ aspectRatio: ASPECT_RATIO }}
      role="img"
      aria-label={altText}
      aria-busy={state === 'loading'}
      data-testid="poster-image"
    >
      {/* Placeholder Layer - Always rendered, fades out when image loads */}
      <div
        className={styles.placeholder}
        style={{
          opacity: isLoaded && !isTimedOut ? 0 : 1,
          transition: 'opacity 0.3s ease',
        }}
        aria-hidden="true"
      >
        <img
          src={placeholder}
          alt=""
          className={styles.placeholderImage}
          style={{ filter: 'blur(8px)' }}
        />
      </div>

      {/* Full Image Layer - Renders over placeholder when loaded */}
      {imageUrl && (
        <img
          ref={imgRef}
          src={imageUrl}
          alt={altText}
          className={styles.fullImage}
          style={{
            opacity: isLoaded && !isTimedOut ? 1 : 0,
            transition: 'opacity 0.3s ease',
          }}
        />
      )}

      {/* Loading Progress Bar */}
      {state === 'loading' && !isTimedOut && (
        <div className={`${styles.loadingProgress} ${isTimedOut ? styles.isTimedOut : ''}`} aria-hidden="true">
          <div
            className={styles.progressBar}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Loading Indicator */}
      {state === 'loading' && !isTimedOut && (
        <div className={styles.loadingIndicator} aria-hidden="true">
          <svg
            className={styles.spinner}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className={styles.spinnerCircle}
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className={styles.spinnerPath}
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
      )}

      {/* Error State */}
      {showErrorState && error && (
        <div className={styles.errorState} aria-live="polite">
          <div className={styles.errorIcon}>
            {getErrorIcon(error.type)}
          </div>
          <div className={styles.errorMessage}>{error.message}</div>

          {/* Timeout-specific details */}
          {isTimedOut && (
            <div className={styles.timeoutInfo}>
              <div className={styles.timeoutMessage}>
                Loading is taking longer than expected
              </div>
              <div className={styles.timeoutDetails}>
                Request timed out after {timeoutMs}ms
              </div>
            </div>
          )}

          {/* Retry Button */}
          {error.retryable && (
            <button
              className={styles.retryButton}
              onClick={handleRetry}
              type="button"
              aria-label="Retry loading poster"
            >
              Retry Loading Poster
            </button>
          )}

          {/* Back to Scan Link (for 404 errors) */}
          {ERROR_ACTIONS[error.type].showBackLink && (
            <Link
              href="/scan"
              className={styles.backLink}
              aria-label="Back to scan page"
            >
              Back to Scan
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
