/**
 * Download and File Utilities
 * 
 * Provides utilities for fetching images, blob downloads, and file handling.
 * Handles desktop blob download, file name sanitization, and browser compatibility.
 * 
 * @module lib/download
 */

/**
 * Fetches an image from a URL and converts it to a File object
 * 
 * @remarks
 * This function:
 * - Fetches the image from the provided URL
 * - Converts the response to a blob
 * - Creates a File object with the specified name and type
 * - Throws descriptive errors for fetch failures
 * 
 * @param url - The URL of the image to fetch
 * @param fileName - The name to give the created file
 * @returns A Promise resolving to a File object
 * @throws {Error} If the fetch fails or returns a non-OK status
 * 
 * @example
 * ```ts
 * try {
 *   const file = await fetchImageAsFile(
 *     '/api/scan/abc123/poster/image',
 *     'abc123-poster.png'
 *   );
 *   // Use the file object
 * } catch (error) {
 *   // Handle error
 * }
 * ```
 */
export async function fetchImageAsFile(
  url: string,
  fileName: string
): Promise<File> {
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(
      `Failed to fetch image: ${response.status} ${response.statusText}`
    );
  }
  
  const blob = await response.blob();
  
  return new File([blob], fileName, { type: 'image/png' });
}

/**
 * Sanitizes a scan ID to create a safe file name
 * 
 * @remarks
 * This function:
 * - Converts the ID to lowercase
 * - Replaces special characters with hyphens
 * - Limits the length to 32 characters
 * - Appends '-poster.png' suffix
 * 
 * Used for creating safe, readable file names from scan IDs.
 * 
 * @param scanId - The scan ID to sanitize
 * @returns A sanitized file name with .png extension
 * 
 * @example
 * ```ts
 * sanitizeFileName('Abc-123_@#$') // 'abc-123-poster.png'
 * sanitizeFileName('very-long-scan-id-that-exceeds-limit') 
 *   // 'very-long-scan-id-that-exceeds-li-poster.png'
 * ```
 */
export function sanitizeFileName(scanId: string): string {
  // Convert to lowercase
  const sanitized = scanId.toLowerCase();
  
  // Replace special characters with hyphens
  const cleaned = sanitized.replace(/[^a-z0-9-_]/g, '-');
  
  // Limit to 32 characters
  const truncated = cleaned.substring(0, 32);
  
  // Add file extension with required v0.2.4.2 prefix
  return `scan-${truncated}-poster.png`;
}

/**
 * Triggers a browser download using blob and anchor element
 * 
 * @remarks
 * This function:
 * - Creates an Object URL from the blob
 * - Creates a temporary anchor element with download attribute
 * - Triggers a click to start the download
 * - Cleans up the DOM and Object URL after 100ms
 * 
 * This approach is used for desktop blob downloads and provides better
 * compatibility across browsers than direct navigation.
 * 
 * @param blob - The blob to download
 * @param fileName - The name to save the file as
 * 
 * @example
 * ```ts
 * const blob = new Blob(['image data'], { type: 'image/png' });
 * triggerBrowserDownload(blob, 'poster.png');
 * ```
 */
export function triggerBrowserDownload(
  blob: Blob,
  fileName: string
): void {
  // Create Object URL
  const url = URL.createObjectURL(blob);
  
  // Create temporary anchor element
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.style.display = 'none';
  
  // Add to DOM
  document.body.appendChild(link);
  
  // Trigger click
  link.click();
  
  // Clean up after a short delay
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
}

/**
 * Detects if the browser supports blob download
 * 
 * @remarks
 * Checks for the 'download' attribute support on anchor elements.
 * This is required for triggering programmatic downloads.
 * 
 * @returns true if blob download is supported
 * 
 * @example
 * ```ts
 * if (supportsBlobDownload()) {
 *   // Use blob download
 * } else {
 *   // Use fallback
 * }
 * ```
 */
export function supportsBlobDownload(): boolean {
  const link = document.createElement('a');
  return 'download' in link;
}

/**
 * Detects if running in a desktop environment
 * 
 * @remarks
 * Uses User-Agent detection to identify non-mobile devices.
 * Mobile user agents typically contain Mobile, Android, iPhone, iPad, or iPod.
 * 
 * @returns true if running on a desktop device
 * 
 * @example
 * ```ts
 * if (isDesktopEnvironment()) {
 *   // Use desktop-specific behavior
 * }
 * ```
 */
export function isDesktopEnvironment(): boolean {
  if (typeof navigator === 'undefined') {
    return false;
  }
  
  const isMobile = /Mobile|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  return !isMobile;
}

/**
 * Browser information interface for compatibility checks
 */
export interface BrowserInfo {
  /** Browser name */
  name: string;
  /** Browser major version */
  version: number;
  /** Whether the browser is supported for poster download */
  isSupported: boolean;
}

/**
 * Gets browser information for compatibility checking
 * 
 * @remarks
 * Parses the User-Agent string to detect browser name and version.
 * Supports Chrome, Safari, Firefox, and Edge detection.
 * 
 * Browser support baseline (latest 2 major versions as of 2025):
 * - Chrome: 120+
 * - Safari: 17+
 * - Firefox: 121+
 * - Edge: 120+
 * 
 * @returns Browser information with support status
 * 
 * @example
 * ```ts
 * const info = getBrowserInfo();
 * console.log(`${info.name} ${info.version} - Supported: ${info.isSupported}`);
 * ```
 */
export function getBrowserInfo(): BrowserInfo {
  if (typeof navigator === 'undefined') {
    return { name: 'unknown', version: 0, isSupported: false };
  }
  
  const ua = navigator.userAgent;
  let name = 'unknown';
  let version = 0;
  
  // Chrome
  const chromeMatch = ua.match(/Chrome\/(\d+)/);
  if (chromeMatch && !/Edg\//.test(ua)) {
    name = 'Chrome';
    version = parseInt(chromeMatch[1], 10);
  }
  
  // Safari (must check before Chrome as Chrome UA contains Safari)
  const safariMatch = ua.match(/Version\/(\d+).*Safari/);
  if (safariMatch && !/Chrome|Edg/.test(ua)) {
    name = 'Safari';
    version = parseInt(safariMatch[1], 10);
  }
  
  // Firefox
  const firefoxMatch = ua.match(/Firefox\/(\d+)/);
  if (firefoxMatch) {
    name = 'Firefox';
    version = parseInt(firefoxMatch[1], 10);
  }
  
  // Edge
  const edgeMatch = ua.match(/Edg\/(\d+)/);
  if (edgeMatch) {
    name = 'Edge';
    version = parseInt(edgeMatch[1], 10);
  }
  
  // Check if version is supported
  const isSupported = checkBrowserSupport(name, version);
  
  return { name, version, isSupported };
}

/**
 * Checks if a browser version meets the minimum support requirements
 * 
 * @remarks
 * Uses the baseline of supporting the latest 2 major versions:
 * - Chrome: 120+
 * - Safari: 17+
 * - Firefox: 121+
 * - Edge: 120+
 * 
 * @param name - Browser name
 * @param version - Browser major version
 * @returns true if the browser version is supported
 */
function checkBrowserSupport(name: string, version: number): boolean {
  const supportedVersions: Record<string, number> = {
    Chrome: 120,
    Safari: 17,
    Firefox: 121,
    Edge: 120,
  };
  
  const minVersion = supportedVersions[name];
  return minVersion ? version >= minVersion : false;
}

/**
 * Download options for desktop download
 */
export interface DownloadOptions {
  /** Optional progress callback (0-100) */
  onProgress?: (percent: number) => void;
  /** Timeout in milliseconds (default: 30000) */
  timeout?: number;
}

/**
 * Downloads a poster for desktop environment with progress tracking
 * 
 * @remarks
 * This function implements the complete desktop download flow:
 * - Fetches the image from the URL with timeout support
 * - Streams the response and tracks download progress
 * - Creates a blob from the downloaded data
 * - Triggers browser download with sanitized filename
 * - Handles various error scenarios (network, timeout, abort)
 * 
 * Default timeout is 30 seconds to prevent indefinite waiting.
 * Progress is reported in percentage (0-100) if content-length is available.
 * 
 * @param scanId - The scan ID (used for filename generation)
 * @param imageUrl - The URL of the image to download
 * @param options - Optional download options (progress, timeout)
 * @returns A Promise that resolves when download is complete
 * @throws {Error} If download fails, times out, or is aborted
 * 
 * @example
 * ```ts
 * try {
 *   await downloadPosterForDesktop('abc123', '/api/scan/abc123/poster/image', {
 *     onProgress: (percent) => console.log(`Downloaded ${percent}%`),
 *     timeout: 30000
 *   });
 *   console.log('Download complete');
 * } catch (error) {
 *   console.error('Download failed:', error);
 * }
 * ```
 */
export async function downloadPosterForDesktop(
  scanId: string,
  imageUrl: string,
  options?: DownloadOptions
): Promise<void> {
  const fileName = sanitizeFileName(scanId);
  const timeoutMs = options?.timeout || 30000;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);
  
  try {
    const response = await fetch(imageUrl, { signal: controller.signal });
    
    if (!response.ok) {
      throw new Error(`Download failed: ${response.status} ${response.statusText}`);
    }
    
    // Get content length for progress tracking
    const contentLength = response.headers.get('content-length');
    const total = contentLength ? parseInt(contentLength, 10) : 0;
    let loaded = 0;
    
    // Get reader for streaming
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body not readable');
    }
    
    // Read chunks
    const chunks: BlobPart[] = [];
    
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      chunks.push(value);
      loaded += value.length;
      
      // Report progress if we have total size and callback
      if (options?.onProgress && total > 0) {
        const percent = Math.round((loaded / total) * 100);
        options.onProgress(percent);
      }
    }
    
    // Create blob from chunks
    const blob = new Blob(chunks, { type: 'image/png' });
    
    // Trigger download
    triggerBrowserDownload(blob, fileName);
    
    // Clear timeout
    clearTimeout(timeoutId);
    
    // Report 100% progress
    if (options?.onProgress) {
      options.onProgress(100);
    }
  } catch (error) {
    clearTimeout(timeoutId);
    
    // Handle timeout specifically
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(`Download timed out after ${timeoutMs}ms`);
    }
    
    // Re-throw other errors
    throw error;
  }
}
