/**
 * Session ID module tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getSessionId, generateSessionId, clearSessionId } from '../lib/analytics/session-id';

describe('Session ID Module', () => {
  const SESSION_STORAGE_KEY = 'security_scan_anon_session_id';

  beforeEach(() => {
    // Clear sessionStorage before each test
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.clear();
    }
  });

  afterEach(() => {
    // Clear sessionStorage after each test
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.clear();
    }
  });

  describe('generateSessionId', () => {
    it('should generate a UUID v4 format string', () => {
      const sessionId = generateSessionId();
      expect(sessionId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('should generate unique IDs', () => {
      const id1 = generateSessionId();
      const id2 = generateSessionId();
      expect(id1).not.toBe(id2);
    });

    it('should generate IDs with consistent format', () => {
      const sessionId = generateSessionId();
      expect(sessionId).toHaveLength(36); // UUID v4 length
      expect(sessionId.split('-')).toHaveLength(5); // UUID v4 has 5 parts
    });
  });

  describe('getSessionId', () => {
    describe('with sessionStorage available', () => {
      it('should generate new session ID on first call', () => {
        const sessionId = getSessionId();
        expect(sessionId).toBeDefined();
        expect(sessionId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      });

      it('should return same session ID on subsequent calls', () => {
        const id1 = getSessionId();
        const id2 = getSessionId();
        const id3 = getSessionId();

        expect(id1).toBe(id2);
        expect(id2).toBe(id3);
      });

      it('should persist session ID in sessionStorage', () => {
        const sessionId = getSessionId();
        const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);

        expect(stored).toBe(sessionId);
      });

      it('should retrieve existing session ID from sessionStorage', () => {
        const existingId = '550e8400-e29b-41d4-a716-446655440000';
        sessionStorage.setItem(SESSION_STORAGE_KEY, existingId);

        const sessionId = getSessionId();

        expect(sessionId).toBe(existingId);
      });

      it('should not overwrite existing session ID', () => {
        const existingId = '550e8400-e29b-41d4-a716-446655440000';
        sessionStorage.setItem(SESSION_STORAGE_KEY, existingId);

        const sessionId = getSessionId();

        expect(sessionId).toBe(existingId);
        expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBe(existingId);
      });
    });

    describe('error handling', () => {
      it('should generate transient session ID when sessionStorage is undefined', () => {
        const originalSessionStorage = (global as any).sessionStorage;

        // Mock sessionStorage as undefined
        delete (global as any).sessionStorage;

        const sessionId = getSessionId();

        expect(sessionId).toBeDefined();
        expect(typeof sessionId).toBe('string');

        // Restore sessionStorage
        (global as any).sessionStorage = originalSessionStorage;
      });

      it('should handle sessionStorage access errors gracefully', () => {
        const originalGetItem = sessionStorage.getItem;
        const originalSetItem = sessionStorage.setItem;

        // Mock sessionStorage to throw errors
        vi.spyOn(sessionStorage, 'getItem').mockImplementation(() => {
          throw new Error('SecurityError');
        });

        // Should still return a session ID despite error
        const sessionId = getSessionId();
        expect(sessionId).toBeDefined();

        // Restore original methods
        sessionStorage.getItem = originalGetItem;
        sessionStorage.setItem = originalSetItem;
      });
    });
  });

  describe('clearSessionId', () => {
    it('should clear session ID from sessionStorage', () => {
      // Generate a session ID first
      const sessionId = getSessionId();
      expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBe(sessionId);

      // Clear the session ID
      const cleared = clearSessionId();

      expect(cleared).toBe(true);
      expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
    });

    it('should return false when session ID does not exist', () => {
      const cleared = clearSessionId();
      expect(cleared).toBe(false);
    });

    it('should generate new session ID after clearing', () => {
      // Generate initial session ID
      const id1 = getSessionId();

      // Clear session ID
      clearSessionId();

      // Generate new session ID
      const id2 = getSessionId();

      expect(id1).not.toBe(id2);
    });

    it('should handle sessionStorage access errors gracefully', () => {
      const originalRemoveItem = sessionStorage.removeItem;

      // Mock sessionStorage to throw errors
      vi.spyOn(sessionStorage, 'removeItem').mockImplementation(() => {
        throw new Error('SecurityError');
      });

      const cleared = clearSessionId();
      expect(cleared).toBe(false);

      // Restore original method
      sessionStorage.removeItem = originalRemoveItem;
    });
  });

  describe('session-scoped behavior', () => {
    it('should not use localStorage', () => {
      const sessionId = getSessionId();

      // Verify session ID is in sessionStorage, not localStorage
      expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBe(sessionId);
      expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
    });

    it('should not affect localStorage', () => {
      // Store something in localStorage
      localStorage.setItem('test_key', 'test_value');

      // Generate session ID
      getSessionId();

      // Verify localStorage is unchanged
      expect(localStorage.getItem('test_key')).toBe('test_value');
      expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
    });
  });

  describe('privacy considerations', () => {
    it('should generate anonymous IDs (no user data)', () => {
      const sessionId = getSessionId();

      // Session ID should be a random UUID, not tied to user
      expect(sessionId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      expect(sessionId).not.toContain('user');
      expect(sessionId).not.toContain('email');
      expect(sessionId).not.toContain('name');
    });

    it('should not store any personal information', () => {
      const sessionId = getSessionId();

      // Verify only the session ID is stored
      const storedData = sessionStorage.getItem(SESSION_STORAGE_KEY);
      expect(storedData).toBe(sessionId);
      expect(storedData?.length).toBe(36); // UUID length only
    });
  });
});
