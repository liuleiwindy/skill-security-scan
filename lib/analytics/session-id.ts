/**
 * Session ID module
 * 
 * Provides anonymous, session-scoped identifiers for grouping events
 * within a single browsing session (tab/window).
 * 
 * Privacy considerations:
 * - Session ID is anonymous and short-lived
 * - Automatically cleared when tab is closed
 * - No cross-tab tracking (sessionStorage is tab-scoped)
 * - No persistent storage
 * - Cannot be used for long-term user tracking
 */

const SESSION_STORAGE_KEY = 'security_scan_anon_session_id';

/**
 * Generate a new UUID-based session ID
 * 
 * Uses browser's crypto.randomUUID() for secure, unique identifier generation.
 * Returns a UUID v4 format string (e.g., "550e8400-e29b-41d4-a716-446655440000").
 * 
 * @returns New UUID v4 string
 */
export function generateSessionId(): string {
  // Use browser crypto API for secure UUID generation
  // Falls back to a simple random string if crypto.randomUUID() is not available
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback for older browsers (should rarely happen in modern environments)
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${randomPart}`;
}

/**
 * Get or generate session ID for current tab/session
 * 
 * Read priority:
 * 1. Check sessionStorage for existing session ID
 * 2. If not exists, generate new session ID
 * 3. Store generated ID in sessionStorage
 * 
 * Write strategy:
 * - Writes to sessionStorage only
 * - No cookie persistence (session-scoped by design)
 * - No localStorage (session-scoped by design)
 * 
 * Persistence:
 * - Stored in sessionStorage (tab-scoped)
 * - Automatically cleared when tab/window is closed
 * - New session ID for each new tab/window
 * 
 * @returns Current session ID (existing or newly generated)
 */
export function getSessionId(): string {
  try {
    // Check if sessionStorage is available (may not work in some iframe contexts)
    if (typeof sessionStorage === 'undefined') {
      console.warn('sessionStorage not available, generating transient session ID');
      return generateSessionId();
    }

    // Priority 1: Read from sessionStorage
    const existingSessionId = sessionStorage.getItem(SESSION_STORAGE_KEY);

    if (existingSessionId) {
      return existingSessionId;
    }

    // Priority 2: Generate new session ID if not exists
    const newSessionId = generateSessionId();

    // Write to sessionStorage only (session-scoped by design)
    sessionStorage.setItem(SESSION_STORAGE_KEY, newSessionId);

    return newSessionId;
  } catch (error) {
    // Handle potential security errors (e.g., cookies disabled, private browsing mode)
    console.warn('Failed to access sessionStorage, generating transient session ID:', error);
    return generateSessionId();
  }
}

/**
 * Clear the current session ID from sessionStorage
 * 
 * This is optional - typically session ID is automatically cleared
 * when the tab is closed. This function is provided for manual cleanup.
 * 
 * @returns true if session ID was cleared, false otherwise
 */
export function clearSessionId(): boolean {
  try {
    if (typeof sessionStorage === 'undefined') {
      return false;
    }

    const existed = sessionStorage.getItem(SESSION_STORAGE_KEY) !== null;
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    return existed;
  } catch (error) {
    console.warn('Failed to clear session ID:', error);
    return false;
  }
}
