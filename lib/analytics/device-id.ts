/**
 * Device ID Module
 * Provides anonymous device identification with cross-session persistence
 *
 * Privacy considerations:
 * - Device ID is anonymous and cannot be linked to individuals
 * - Stored locally, never transmitted in plain text for identification
 * - Users can clear by clearing browser data
 * - No cross-site tracking (same domain only)
 */

// ============================================================================
// Constants
// ============================================================================

/**
 * Storage key for device ID
 */
const DEVICE_ID_KEY = 'security_scan_anon_device_id';

/**
 * Cookie max-age in seconds (365 days)
 */
const COOKIE_MAX_AGE = 31_536_000;

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Storage types for device ID
 */
type StorageType = 'localStorage' | 'cookie';

/**
 * Result of a storage operation
 */
interface StorageResult {
  success: boolean;
  storageType: StorageType;
  value?: string;
  error?: Error;
}

// ============================================================================
// Cookie Utilities
// ============================================================================

/**
 * Set a cookie with the given name, value, and options
 *
 * @param name - Cookie name
 * @param value - Cookie value
 * @param maxAge - Cookie max-age in seconds (default: 365 days)
 * @param path - Cookie path (default: '/')
 * @param domain - Optional cookie domain
 * @returns StorageResult indicating success or failure
 */
function setCookie(
  name: string,
  value: string,
  maxAge: number = COOKIE_MAX_AGE,
  path: string = '/',
  domain?: string
): StorageResult {
  try {
    let cookieString = `${name}=${encodeURIComponent(value)}; max-age=${maxAge}; path=${path}`;

    if (domain) {
      cookieString += `; domain=${domain}`;
    }

    // Set SameSite attribute for better security
    cookieString += '; SameSite=Lax';

    document.cookie = cookieString;

    return {
      success: true,
      storageType: 'cookie',
      value,
    };
  } catch (error) {
    return {
      success: false,
      storageType: 'cookie',
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * Get a cookie value by name
 *
 * @param name - Cookie name to retrieve
 * @returns Cookie value or null if not found
 */
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [cookieName, cookieValue] = cookie.trim().split('=');
    if (cookieName === name) {
      try {
        return decodeURIComponent(cookieValue);
      } catch {
        return null;
      }
    }
  }
  return null;
}

/**
 * Delete a cookie by name
 *
 * @param name - Cookie name to delete
 * @param path - Cookie path (default: '/')
 * @param domain - Optional cookie domain
 */
function deleteCookie(name: string, path: string = '/', domain?: string): void {
  let cookieString = `${name}=; max-age=0; path=${path}`;
  if (domain) {
    cookieString += `; domain=${domain}`;
  }
  document.cookie = cookieString;
}

// ============================================================================
// LocalStorage Utilities
// ============================================================================

/**
 * Check if localStorage is available
 *
 * @returns true if localStorage is accessible, false otherwise
 */
function isLocalStorageAvailable(): boolean {
  if (typeof localStorage === 'undefined') {
    return false;
  }

  try {
    const testKey = '__localStorage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get a value from localStorage
 *
 * @param key - Storage key
 * @returns Stored value or null if not found/unavailable
 */
function getFromLocalStorage(key: string): string | null {
  if (!isLocalStorageAvailable()) {
    return null;
  }

  try {
    const value = localStorage.getItem(key);
    return value;
  } catch {
    return null;
  }
}

/**
 * Set a value in localStorage
 *
 * @param key - Storage key
 * @param value - Value to store
 * @returns StorageResult indicating success or failure
 */
function setInLocalStorage(key: string, value: string): StorageResult {
  if (!isLocalStorageAvailable()) {
    return {
      success: false,
      storageType: 'localStorage',
      error: new Error('localStorage is not available'),
    };
  }

  try {
    localStorage.setItem(key, value);
    return {
      success: true,
      storageType: 'localStorage',
      value,
    };
  } catch (error) {
    return {
      success: false,
      storageType: 'localStorage',
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Generate a new UUID v4 device ID using browser crypto API
 *
 * Uses crypto.randomUUID() for cryptographically secure random generation.
 * This ensures uniqueness and prevents predictable device IDs.
 *
 * @returns A new UUID v4 string
 *
 * @example
 * ```ts
 * const deviceId = generateDeviceId();
 * console.log(deviceId); // e.g., "550e8400-e29b-41d4-a716-446655440000"
 * ```
 */
export function generateDeviceId(): string {
  // Use browser crypto API for secure UUID generation
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback for environments without crypto.randomUUID()
  // This generates a UUID v4 compatible string
  // Note: This should never happen in modern browsers, but we provide a fallback
  const fallback = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
  return fallback.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Persist device ID to both localStorage and cookie
 *
 * Attempts to write to both storage mechanisms for redundancy.
 * Handles cases where one storage method fails.
 *
 * @param deviceId - Device ID to persist
 * @returns Array of storage results
 *
 * @example
 * ```ts
 * const deviceId = generateDeviceId();
 * const results = persistDeviceId(deviceId);
 * console.log(`Persisted to ${results.filter(r => r.success).length} storage(s)`);
 * ```
 */
function persistDeviceId(deviceId: string): StorageResult[] {
  const results: StorageResult[] = [];

  // Try to persist to localStorage
  const localStorageResult = setInLocalStorage(DEVICE_ID_KEY, deviceId);
  results.push(localStorageResult);

  // Always try to set cookie as backup
  const cookieResult = setCookie(DEVICE_ID_KEY, deviceId);
  results.push(cookieResult);

  return results;
}

/**
 * Read device ID from localStorage
 *
 * @returns Device ID from localStorage or null if not found
 */
function readFromLocalStorage(): string | null {
  return getFromLocalStorage(DEVICE_ID_KEY);
}

/**
 * Read device ID from cookie
 *
 * @returns Device ID from cookie or null if not found
 */
function readFromCookie(): string | null {
  return getCookie(DEVICE_ID_KEY);
}

/**
 * Validate that a string is a valid UUID format
 *
 * @param deviceId - Device ID to validate
 * @returns true if valid UUID format, false otherwise
 */
function isValidUUID(deviceId: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(deviceId);
}

/**
 * Get or generate anonymous device ID with persistence
 *
 * This function implements the following read strategy:
 * 1. Check localStorage first
 * 2. If not found, check cookie
 * 3. If neither exists, generate new UUID and persist to both
 *
 * Write strategy:
 * - Always write to localStorage (if available)
 * - Always write to cookie as backup
 * - Cookie expires after 365 days
 * - Cookie path is set to '/' for domain-wide tracking
 *
 * @returns Device ID string (UUID v4 format)
 *
 * @example
 * ```ts
 * // Get existing or generate new device ID
 * const deviceId = getDeviceId();
 * console.log(`Device ID: ${deviceId}`);
 *
 * // On subsequent calls, returns the same device ID
 * const sameDeviceId = getDeviceId();
 * console.log(sameDeviceId === deviceId); // true
 * ```
 */
export function getDeviceId(): string {
  // Step 1: Try to read from localStorage
  const localStorageDeviceId = readFromLocalStorage();
  if (localStorageDeviceId && isValidUUID(localStorageDeviceId)) {
    // Sync to cookie if missing or mismatch
    const cookieDeviceId = readFromCookie();
    if (!cookieDeviceId || cookieDeviceId !== localStorageDeviceId) {
      setCookie(DEVICE_ID_KEY, localStorageDeviceId);
    }
    return localStorageDeviceId;
  }

  // Step 2: Try to read from cookie
  const cookieDeviceId = readFromCookie();
  if (cookieDeviceId && isValidUUID(cookieDeviceId)) {
    // Sync to localStorage if available
    if (isLocalStorageAvailable()) {
      setInLocalStorage(DEVICE_ID_KEY, cookieDeviceId);
    }
    return cookieDeviceId;
  }

  // Step 3: Generate new device ID and persist to both
  const newDeviceId = generateDeviceId();
  const results = persistDeviceId(newDeviceId);

  // Log if any persistence failed (for debugging)
  const failedResults = results.filter((r) => !r.success);
  if (failedResults.length > 0 && typeof console !== 'undefined' && console.warn) {
    console.warn(
      `Device ID persistence partially failed: ${failedResults.map((r) => r.storageType).join(', ')}`
    );
  }

  return newDeviceId;
}

/**
 * Reset device ID by clearing from both localStorage and cookie
 *
 * This is useful for testing or when users want to opt-out of tracking.
 * After calling this, the next getDeviceId() call will generate a new ID.
 *
 * @example
 * ```ts
 * // Clear existing device ID
 * resetDeviceId();
 *
 * // Next call will generate new ID
 * const newDeviceId = getDeviceId();
 * ```
 */
export function resetDeviceId(): void {
  // Clear from localStorage
  if (isLocalStorageAvailable()) {
    try {
      localStorage.removeItem(DEVICE_ID_KEY);
    } catch {
      // Ignore errors when clearing
    }
  }

  // Clear from cookie
  deleteCookie(DEVICE_ID_KEY);
}

/**
 * Get device ID without auto-generating if it doesn't exist
 *
 * This is useful when you want to check if a device ID exists
 * without triggering generation of a new one.
 *
 * @returns Device ID if exists, null otherwise
 *
 * @example
 * ```ts
 * const existingDeviceId = getExistingDeviceId();
 * if (existingDeviceId) {
 *   console.log(`Device already has ID: ${existingDeviceId}`);
 * } else {
 *   console.log('No device ID found');
 * }
 * ```
 */
export function getExistingDeviceId(): string | null {
  const localStorageDeviceId = readFromLocalStorage();
  if (localStorageDeviceId && isValidUUID(localStorageDeviceId)) {
    return localStorageDeviceId;
  }

  const cookieDeviceId = readFromCookie();
  if (cookieDeviceId && isValidUUID(cookieDeviceId)) {
    return cookieDeviceId;
  }

  return null;
}

// ============================================================================
// Testing Utilities (for development/testing only)
// ============================================================================

/**
 * Check if localStorage contains a device ID
 *
 * @internal
 */
export function _hasLocalStorageDeviceId(): boolean {
  return getFromLocalStorage(DEVICE_ID_KEY) !== null;
}

/**
 * Check if cookie contains a device ID
 *
 * @internal
 */
export function _hasCookieDeviceId(): boolean {
  return getCookie(DEVICE_ID_KEY) !== null;
}

/**
 * Get the current localStorage device ID without validation
 *
 * @internal
 */
export function _getRawLocalStorageDeviceId(): string | null {
  return getFromLocalStorage(DEVICE_ID_KEY);
}

/**
 * Get the current cookie device ID without validation
 *
 * @internal
 */
export function _getRawCookieDeviceId(): string | null {
  return getCookie(DEVICE_ID_KEY);
}
