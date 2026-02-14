/**
 * PosterImage Component Usage Examples
 * 
 * This file demonstrates various ways to use the PosterImage component
 */

"use client";

import { PosterImage, PosterImageErrorType, LoadState } from "./PosterImage";
import { useState } from "react";

/**
 * Example 1: Basic Usage
 * 
 * Simple usage with default configuration
 */
export function BasicExample() {
  return (
    <div>
      <h2>Basic Poster Image</h2>
      <PosterImage scanId="abc123" />
    </div>
  );
}

/**
 * Example 2: With Callbacks
 * 
 * Demonstrates handling load and error events
 */
export function WithCallbacksExample() {
  const [status, setStatus] = useState<string>('Waiting...');

  const handleLoad = () => {
    setStatus('✅ Image loaded successfully!');
  };

  const handleError = (type: PosterImageErrorType) => {
    setStatus(`❌ Error: ${type}`);
  };

  return (
    <div>
      <h2>Poster with Callbacks</h2>
      <p>Status: {status}</p>
      <PosterImage
        scanId="def456"
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  );
}

/**
 * Example 3: Custom Timeout
 * 
 * Demonstrates setting a custom timeout duration
 */
export function CustomTimeoutExample() {
  return (
    <div>
      <h2>Poster with Custom Timeout (15s)</h2>
      <PosterImage
        scanId="ghi789"
        timeoutMs={15000}
      />
    </div>
  );
}

/**
 * Example 4: Custom Placeholder
 * 
 * Demonstrates using a custom placeholder image
 */
export function CustomPlaceholderExample() {
  // Custom base64 SVG placeholder
  const customPlaceholder = `data:image/svg+xml;base64,${btoa(`
    <svg width="687" height="1024" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#312e81"/>
      <circle cx="343.5" cy="512" r="100" fill="#6366f1" opacity="0.5"/>
      <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" fill="#a5b4fc" font-family="system-ui, sans-serif" font-size="24" font-weight="600">
        Custom Placeholder
      </text>
    </svg>
  `)}`;

  return (
    <div>
      <h2>Poster with Custom Placeholder</h2>
      <PosterImage
        scanId="jkl012"
        placeholderSrc={customPlaceholder}
      />
    </div>
  );
}

/**
 * Example 5: Custom Image Source
 * 
 * Demonstrates using a custom image URL instead of the default API endpoint
 */
export function CustomSourceExample() {
  return (
    <div>
      <h2>Poster with Custom Source</h2>
      <PosterImage
        scanId="mno345"
        src="/api/custom/poster/mno345"
      />
    </div>
  );
}

/**
 * Example 6: Custom Styling
 * 
 * Demonstrates using custom CSS class
 */
export function CustomStylingExample() {
  return (
    <div>
      <h2>Poster with Custom Styling</h2>
      <PosterImage
        scanId="pqr678"
        className="my-custom-poster-class"
      />
    </div>
  );
}

/**
 * Example 7: Full Configuration
 * 
 * Demonstrates all available props
 */
export function FullConfigExample() {
  const [loadState, setLoadState] = useState<LoadState>('loading');

  const handleLoad = () => {
    setLoadState('loaded');
    console.log('Poster loaded successfully');
  };

  const handleError = (type: PosterImageErrorType) => {
    setLoadState('error');
    console.error('Poster failed to load:', type);
  };

  return (
    <div>
      <h2>Full Configuration Example</h2>
      <p>Current State: {loadState}</p>
      <PosterImage
        scanId="stu901"
        src="/api/scan/stu901/poster/image"
        placeholderSrc={`data:image/svg+xml;base64,${btoa(
          '<svg width="687" height="1024" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#1e293b"/><text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" fill="#64748b" font-family="system-ui, sans-serif" font-size="18">Loading...</text></svg>'
        )}`}
        timeoutMs={12000}
        onLoad={handleLoad}
        onError={handleError}
        className="w-full max-w-2xl mx-auto"
        alt="Security Scan Poster - stu901"
      />
    </div>
  );
}

/**
 * Example 8: Integration in Poster Page
 * 
 * Shows how to integrate PosterImage in the poster page
 */
export function PosterPageIntegrationExample() {
  const scanId = "xyz789";

  return (
    <div className="poster-page">
      <header>
        <a href="/scan">← Back to Scan</a>
      </header>
      
      <main>
        <PosterImage
          scanId={scanId}
          onLoad={() => console.log(`Poster ${scanId} loaded`)}
          onError={(type) => console.error(`Poster ${scanId} failed: ${type}`)}
          alt={`Security Scan Poster - ${scanId}`}
        />
      </main>
      
      <footer>
        <p>© {new Date().getFullYear()} Skill Security Scan</p>
      </footer>
    </div>
  );
}

/**
 * Example 9: Retry Logic (Extension)
 * 
 * Demonstrates how to implement retry functionality
 * This would be useful for Task 1.3
 */
export function RetryExample() {
  const [retryCount, setRetryCount] = useState(0);
  const [key, setKey] = useState(0);

  const handleError = (type: PosterImageErrorType) => {
    console.error(`Load failed (attempt ${retryCount + 1}):`, type);
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    setKey(prev => prev + 1); // Force re-render
  };

  return (
    <div>
      <h2>Poster with Retry</h2>
      <p>Retry attempts: {retryCount}</p>
      <PosterImage
        key={key}
        scanId="retry123"
        onError={handleError}
      />
      <button onClick={handleRetry}>
        Retry ({retryCount})
      </button>
    </div>
  );
}

/**
 * Example 10: Error State UI Enhancement
 * 
 * Shows how to enhance the error state with more information
 */
export function EnhancedErrorStateExample() {
  const [errorType, setErrorType] = useState<PosterImageErrorType | null>(null);

  const getErrorMessage = (type: PosterImageErrorType): string => {
    switch (type) {
      case 'timeout':
        return 'Poster generation is taking longer than expected. Please wait or try again later.';
      case 'http-404':
        return 'Poster not found. Please check the scan ID and try again.';
      case 'http-5xx':
        return 'Server error occurred. Please try again.';
      case 'network':
        return 'Network error. Please check your connection and try again.';
      default:
        return 'Failed to load poster.';
    }
  };

  return (
    <div>
      <h2>Enhanced Error Handling</h2>
      {errorType && (
        <div className="error-details">
          <p>Error Type: {errorType}</p>
          <p>Message: {getErrorMessage(errorType)}</p>
        </div>
      )}
      <PosterImage
        scanId="error456"
        onError={setErrorType}
      />
    </div>
  );
}

/**
 * Example 11: Performance Monitoring
 * 
 * Demonstrates how to measure loading performance
 */
export function PerformanceMonitoringExample() {
  const [loadTime, setLoadTime] = useState<number | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);

  const handleLoadStart = () => {
    setStartTime(Date.now());
  };

  const handleLoad = () => {
    if (startTime) {
      const duration = Date.now() - startTime;
      setLoadTime(duration);
      console.log(`Poster loaded in ${duration}ms`);
    }
  };

  return (
    <div>
      <h2>Performance Monitoring</h2>
      {loadTime !== null && (
        <p>Load time: {loadTime}ms</p>
      )}
      <PosterImage
        scanId="perf789"
        onLoad={handleLoad}
      />
    </div>
  );
}

/**
 * Example 12: No Layout Shift Verification
 * 
 * This example is for testing layout shift behavior
 * Use DevTools Performance tab to verify no layout shift occurs
 */
export function NoLayoutShiftExample() {
  return (
    <div style={{ border: '2px solid red', padding: '20px' }}>
      <h2>No Layout Shift Test</h2>
      <p>
        Instructions:
        <br />1. Open DevTools Performance tab
        <br />2. Start recording
        <br />3. Reload the page
        <br />4. Stop recording
        <br />5. Check for layout shifts (should be 0)
      </p>
      <PosterImage scanId="shifttest123" />
    </div>
  );
}
