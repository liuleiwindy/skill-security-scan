/**
 * Device ID module tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getDeviceId,
  generateDeviceId,
  resetDeviceId,
  getExistingDeviceId,
  _hasLocalStorageDeviceId,
  _hasCookieDeviceId,
  _getRawLocalStorageDeviceId,
  _getRawCookieDeviceId,
} from '../lib/analytics/device-id';

// Mock localStorage and document.cookie
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string): string | null => store[key] || null,
    setItem: (key: string, value: string): void => {
      store[key] = value;
    },
    removeItem: (key: string): void => {
      delete store[key];
    },
    clear: (): void => {
      store = {};
    },
  };
})();

const cookieStore: string[] = [];

function getCookieValue(name: string): string | null {
  // Join all cookies and split by semicolon
  const allCookies = cookieStore.join('; ').split('; ');
  for (const cookie of allCookies) {
    const equalIndex = cookie.indexOf('=');
    if (equalIndex === -1) continue;

    const cookieName = cookie.substring(0, equalIndex).trim();
    const cookieValue = cookie.substring(equalIndex + 1);

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

function setCookieValue(cookieString: string): void {
  // Parse the cookie name from the cookie string
  const equalIndex = cookieString.indexOf('=');
  if (equalIndex === -1) return;

  const cookieName = cookieString.substring(0, equalIndex).trim();

  // Remove any existing cookie with the same name
  const cookieParts = cookieStore.join('; ').split('; ').filter((cookie) => {
    const existingEqualIndex = cookie.indexOf('=');
    if (existingEqualIndex === -1) return true;

    const existingName = cookie.substring(0, existingEqualIndex).trim();
    return existingName !== cookieName;
  });

  // Check if this is a delete operation (max-age=0)
  const isDelete = cookieString.includes('max-age=0');
  if (!isDelete) {
    cookieParts.push(cookieString);
  }

  // Update the cookie store
  cookieStore.length = 0;
  cookieStore.push(...cookieParts);
}

function clearCookies(): void {
  cookieStore.length = 0;
}

describe('Device ID Module', () => {
  beforeEach(() => {
    // Clear all storage
    localStorageMock.clear();
    clearCookies();

    // Setup mocks
    vi.stubGlobal('localStorage', localStorageMock);
    vi.stubGlobal('document', {
      get cookie() {
        return cookieStore.join('; ');
      },
      set cookie(value: string) {
        setCookieValue(value);
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('generateDeviceId', () => {
    it('should generate a valid UUID v4 format', () => {
      const deviceId = generateDeviceId();
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(deviceId).toMatch(uuidRegex);
    });

    it('should generate unique IDs', () => {
      const id1 = generateDeviceId();
      const id2 = generateDeviceId();
      const id3 = generateDeviceId();

      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
      expect(id1).not.toBe(id3);
    });

    it('should use crypto.randomUUID when available', () => {
      const mockRandomUUID = vi.fn(() => '123e4567-e89b-12d3-a456-426614174000');
      vi.stubGlobal('crypto', {
        randomUUID: mockRandomUUID,
      });

      const deviceId = generateDeviceId();
      expect(deviceId).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(mockRandomUUID).toHaveBeenCalledOnce();

      vi.unstubAllGlobals();
    });

    it('should fallback to random generation when crypto is not available', () => {
      vi.stubGlobal('crypto', undefined);

      const deviceId = generateDeviceId();
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(deviceId).toMatch(uuidRegex);

      vi.unstubAllGlobals();
    });
  });

  describe('getDeviceId', () => {
    it('should return existing device ID from localStorage', () => {
      const existingId = '550e8400-e29b-41d4-a716-446655440000';
      localStorageMock.setItem('security_scan_anon_device_id', existingId);

      const deviceId = getDeviceId();
      expect(deviceId).toBe(existingId);
    });

    it('should return existing device ID from cookie when localStorage is empty', () => {
      const existingId = '550e8400-e29b-41d4-a716-446655440000';
      setCookieValue('security_scan_anon_device_id=' + encodeURIComponent(existingId) + '; max-age=31536000; path=/; SameSite=Lax');

      const deviceId = getDeviceId();
      expect(deviceId).toBe(existingId);
    });

    it('should prioritize localStorage over cookie', () => {
      const localStorageId = '550e8400-e29b-41d4-a716-446655440000';
      const cookieId = '660e8400-e29b-41d4-a716-446655440001';

      localStorageMock.setItem('security_scan_anon_device_id', localStorageId);
      setCookieValue('security_scan_anon_device_id=' + encodeURIComponent(cookieId) + '; max-age=31536000; path=/; SameSite=Lax');

      const deviceId = getDeviceId();
      expect(deviceId).toBe(localStorageId);
    });

    it('should generate new device ID when neither localStorage nor cookie exists', () => {
      const deviceId = getDeviceId();

      // Should be a valid UUID
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(deviceId).toMatch(uuidRegex);

      // Should be persisted to localStorage
      expect(localStorageMock.getItem('security_scan_anon_device_id')).toBe(deviceId);

      // Should be persisted to cookie
      const cookieValue = getCookieValue('security_scan_anon_device_id');
      expect(cookieValue).toBe(deviceId);
    });

    it('should return same device ID across multiple calls', () => {
      const deviceId1 = getDeviceId();
      const deviceId2 = getDeviceId();
      const deviceId3 = getDeviceId();

      expect(deviceId1).toBe(deviceId2);
      expect(deviceId2).toBe(deviceId3);
    });

    it('should sync localStorage to cookie when cookie is missing', () => {
      const localStorageId = '550e8400-e29b-41d4-a716-446655440000';
      localStorageMock.setItem('security_scan_anon_device_id', localStorageId);

      const deviceId = getDeviceId();

      const cookieValue = getCookieValue('security_scan_anon_device_id');
      expect(cookieValue).toBe(localStorageId);
    });

    it('should sync cookie to localStorage when localStorage is empty', () => {
      const cookieId = '550e8400-e29b-41d4-a716-446655440000';
      setCookieValue('security_scan_anon_device_id=' + encodeURIComponent(cookieId) + '; max-age=31536000; path=/; SameSite=Lax');

      const deviceId = getDeviceId();

      const localStorageValue = localStorageMock.getItem('security_scan_anon_device_id');
      expect(localStorageValue).toBe(cookieId);
    });

    it('should regenerate when localStorage has invalid UUID', () => {
      localStorageMock.setItem('security_scan_anon_device_id', 'invalid-uuid');

      const deviceId = getDeviceId();
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(deviceId).toMatch(uuidRegex);
    });

    it('should regenerate when cookie has invalid UUID', () => {
      setCookieValue('security_scan_anon_device_id=' + encodeURIComponent('invalid-uuid') + '; max-age=31536000; path=/; SameSite=Lax');

      const deviceId = getDeviceId();
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(deviceId).toMatch(uuidRegex);
    });
  });

  describe('resetDeviceId', () => {
    it('should clear device ID from localStorage', () => {
      const deviceId = getDeviceId();
      expect(localStorageMock.getItem('security_scan_anon_device_id')).toBe(deviceId);

      resetDeviceId();

      expect(localStorageMock.getItem('security_scan_anon_device_id')).toBeNull();
    });

    it('should clear device ID from cookie', () => {
      const deviceId = getDeviceId();
      expect(getCookieValue('security_scan_anon_device_id')).toBe(deviceId);

      resetDeviceId();

      expect(getCookieValue('security_scan_anon_device_id')).toBeNull();
    });

    it('should allow generating new ID after reset', () => {
      const deviceId1 = getDeviceId();
      resetDeviceId();
      const deviceId2 = getDeviceId();

      expect(deviceId1).not.toBe(deviceId2);
    });
  });

  describe('getExistingDeviceId', () => {
    it('should return device ID from localStorage', () => {
      const existingId = '550e8400-e29b-41d4-a716-446655440000';
      localStorageMock.setItem('security_scan_anon_device_id', existingId);

      const deviceId = getExistingDeviceId();
      expect(deviceId).toBe(existingId);
    });

    it('should return device ID from cookie when localStorage is empty', () => {
      const existingId = '550e8400-e29b-41d4-a716-446655440000';
      setCookieValue('security_scan_anon_device_id=' + encodeURIComponent(existingId) + '; max-age=31536000; path=/; SameSite=Lax');

      const deviceId = getExistingDeviceId();
      expect(deviceId).toBe(existingId);
    });

    it('should return null when device ID does not exist', () => {
      const deviceId = getExistingDeviceId();
      expect(deviceId).toBeNull();
    });

    it('should not generate new ID when none exists', () => {
      const deviceId = getExistingDeviceId();
      expect(deviceId).toBeNull();

      expect(localStorageMock.getItem('security_scan_anon_device_id')).toBeNull();
      expect(getCookieValue('security_scan_anon_device_id')).toBeNull();
    });
  });

  describe('Cookie Utilities', () => {
    it('should set cookie with correct attributes', () => {
      const deviceId = getDeviceId();

      const cookieValue = getCookieValue('security_scan_anon_device_id');
      expect(cookieValue).toBe(deviceId);

      // Check cookie was set with correct max-age and path
      const cookieString = cookieStore.join('; ');
      expect(cookieString).toContain('max-age=31536000');
      expect(cookieString).toContain('path=/');
      expect(cookieString).toContain('SameSite=Lax');
    });
  });

  describe('Error Handling', () => {
    it('should handle localStorage unavailability', () => {
      vi.stubGlobal('localStorage', undefined);

      const deviceId = getDeviceId();
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(deviceId).toMatch(uuidRegex);

      // Should still work with cookie fallback
      const cookieValue = getCookieValue('security_scan_anon_device_id');
      expect(cookieValue).toBe(deviceId);

      vi.unstubAllGlobals();
    });

    it('should handle localStorage throwing errors', () => {
      const throwingStorage = {
        getItem: vi.fn(() => {
          throw new Error('SecurityError');
        }),
        setItem: vi.fn(() => {
          throw new Error('SecurityError');
        }),
        removeItem: vi.fn(),
      };

      vi.stubGlobal('localStorage', throwingStorage);

      const deviceId = getDeviceId();
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(deviceId).toMatch(uuidRegex);

      // Should still work with cookie fallback
      const cookieValue = getCookieValue('security_scan_anon_device_id');
      expect(cookieValue).toBe(deviceId);

      vi.unstubAllGlobals();
    });
  });

  describe('Internal Testing Utilities', () => {
    it('_hasLocalStorageDeviceId should check localStorage', () => {
      expect(_hasLocalStorageDeviceId()).toBe(false);

      localStorageMock.setItem('security_scan_anon_device_id', 'test-id');
      expect(_hasLocalStorageDeviceId()).toBe(true);
    });

    it('_hasCookieDeviceId should check cookie', () => {
      expect(_hasCookieDeviceId()).toBe(false);

      setCookieValue('security_scan_anon_device_id=test-id; max-age=31536000; path=/; SameSite=Lax');
      expect(_hasCookieDeviceId()).toBe(true);
    });

    it('_getRawLocalStorageDeviceId should return raw value', () => {
      const id = '550e8400-e29b-41d4-a716-446655440000';
      localStorageMock.setItem('security_scan_anon_device_id', id);

      expect(_getRawLocalStorageDeviceId()).toBe(id);
    });

    it('_getRawCookieDeviceId should return raw value', () => {
      const id = '550e8400-e29b-41d4-a716-446655440000';
      setCookieValue('security_scan_anon_device_id=' + encodeURIComponent(id) + '; max-age=31536000; path=/; SameSite=Lax');

      expect(_getRawCookieDeviceId()).toBe(id);
    });
  });
});
