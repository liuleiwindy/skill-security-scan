/**
 * Mobile Share API Utilities
 * 
 * Provides Web Share API integration for mobile devices with file support.
 * Handles compatibility checks and error types for sharing files.
 * 
 * @module lib/mobile-share
 */

/**
 * Options for sharing a file via Web Share API
 */
export interface ShareFileOptions {
  /** The file to share */
  file: File;
  /** Title for the share (optional) */
  title?: string;
  /** Description text for the share (optional) */
  text?: string;
}

/**
 * Error types that can occur during share operations
 */
export type ShareErrorType = 'abort' | 'not-allowed' | 'network' | 'unknown';

/**
 * Detects if the browser supports Web Share API with file support
 * 
 * @remarks
 * This checks for both navigator.share and navigator.canShare APIs,
 * and verifies that file sharing is specifically supported.
 * 
 * @returns true if Web Share API with file support is available
 * 
 * @example
 * ```ts
 * if (canShareFiles()) {
 *   // Use Web Share API
 * } else {
 *   // Use fallback
 * }
 * ```
 */
export function canShareFiles(): boolean {
  return !!(
    typeof navigator !== 'undefined' &&
    'share' in navigator &&
    'canShare' in navigator &&
    navigator.canShare({ files: [] })
  );
}

/**
 * Shares a file using the Web Share API
 * 
 * @remarks
 * This function uses the Web Share API to share files. It handles:
 * - File sharing via navigator.share()
 * - Error propagation for caller handling
 * - Type safety with TypeScript interfaces
 * 
 * @param options - Share options including file, title, and text
 * @throws {Error} If Web Share API is not available
 * @throws {DOMException} From navigator.share() (AbortError, NotAllowedError, etc.)
 * 
 * @example
 * ```ts
 * try {
 *   await shareFile({
 *     file: posterFile,
 *     title: 'Security Scan Poster',
 *     text: 'Check out my security scan poster!'
 *   });
 *   // Success handling
 * } catch (error) {
 *   // Error handling
 * }
 * ```
 */
export async function shareFile(options: ShareFileOptions): Promise<void> {
  if (!canShareFiles()) {
    throw new Error('Web Share API with file support not available');
  }
  
  try {
    await navigator.share({
      files: [options.file],
      title: options.title || 'Save Poster',
      text: options.text || '',
    });
  } catch (error) {
    // Re-throw error for caller to handle
    throw error;
  }
}

/**
 * Classifies share errors into specific types for proper handling
 * 
 * @remarks
 * This function determines the type of error that occurred during
 * a share operation, enabling appropriate error handling:
 * - 'abort': User cancelled the share (silent)
 * - 'not-allowed': Permission denied or security error (show fallback)
 * - 'network': Network or fetch errors (show fallback)
 * - 'unknown': Other errors (show error UI)
 * 
 * @param error - The error object from a share operation
 * @returns The classified error type
 * 
 * @example
 * ```ts
 * try {
 *   await shareFile({ file: posterFile });
 * } catch (error) {
 *   const errorType = getErrorType(error);
 *   
 *   switch (errorType) {
 *     case 'abort':
 *       // User cancelled, silent
 *       break;
 *     case 'not-allowed':
 *       // Show fallback sheet
 *       break;
 *     case 'network':
 *       // Show fallback sheet
 *       break;
 *     case 'unknown':
 *       // Show error UI
 *       break;
 *   }
 * }
 * ```
 */
export function getErrorType(error: unknown): ShareErrorType {
  if (!(error instanceof Error) && !(error instanceof DOMException)) {
    return 'unknown';
  }
  
  const name = error.name;
  
  // User cancelled the share - this is expected, not an error
  if (name === 'AbortError') {
    return 'abort';
  }
  
  // Permission denied or security error
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return 'not-allowed';
  }
  
  // Network or fetch error
  if (name === 'NetworkError' || name === 'TypeError') {
    return 'network';
  }
  
  return 'unknown';
}

/**
 * Detects if the current device is a mobile device
 * 
 * @remarks
 * Uses User-Agent string to detect mobile devices.
 * Note: This is a basic detection and may need refinement for specific use cases.
 * 
 * @returns true if running on a mobile device
 * 
 * @example
 * ```ts
 * if (isMobileDevice()) {
 *   // Use mobile-specific behavior
 * }
 * ```
 */
export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') {
    return false;
  }
  
  return /Mobile|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

/**
 * Detects if the current browser is iOS Safari
 * 
 * @remarks
 * iOS Safari has specific limitations with Web Share API file support.
 * This detection helps apply appropriate fallback strategies.
 * 
 * @returns true if running on iOS Safari
 * 
 * @example
 * ```ts
 * if (isIOSSafari() && !canShareFiles()) {
 *   // Use fallback immediately
 * }
 * ```
 */
export function isIOSSafari(): boolean {
  if (typeof navigator === 'undefined') {
    return false;
  }
  
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) && /Safari/i.test(ua);
}

/**
 * Detects if the current browser is Android Chrome
 * 
 * @remarks
 * Android Chrome has good Web Share API file support.
 * This detection helps apply appropriate share strategies.
 * 
 * @returns true if running on Android Chrome
 * 
 * @example
 * ```ts
 * if (isAndroidChrome()) {
 *   // Prefer Web Share API with file support
 * }
 * ```
 */
export function isAndroidChrome(): boolean {
  if (typeof navigator === 'undefined') {
    return false;
  }
  
  const ua = navigator.userAgent;
  return /Android/.test(ua) && /Chrome/i.test(ua);
}
