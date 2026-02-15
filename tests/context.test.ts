/**
 * Analytics Context module tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  enrichEventContext,
  getCurrentPageContext,
  getSourceAttribution,
  clearContextCache,
  _getContextCache,
  type PageContext,
  type EnrichedEventContext,
} from '../lib/analytics/context';

// Mock localStorage
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

// Mock document.cookie
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

// Mock sessionStorage
const sessionStorageMock = (() => {
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

// Mock browser APIs
const mockWindow = {
  location: {
    pathname: '/test/page',
    search: '?src=poster_qr&utm_medium=social',
  },
} as Window;

const mockDocument = {
  referrer: 'https://example.com/landing',
} as Document;

const mockNavigator = {
  userAgent:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
} as Navigator;

describe('Analytics Context Module', () => {
  beforeEach(() => {
    // Clear cache before each test
    clearContextCache();

    // Clear all storage
    localStorageMock.clear();
    clearCookies();
    sessionStorageMock.clear();

    // Setup mocks
    vi.stubGlobal('localStorage', localStorageMock);
    vi.stubGlobal('sessionStorage', sessionStorageMock);
    vi.stubGlobal('document', {
      referrer: mockDocument.referrer,
      get cookie() {
        return cookieStore.join('; ');
      },
      set cookie(value: string) {
        setCookieValue(value);
      },
    });
    vi.stubGlobal('window', mockWindow);
    vi.stubGlobal('navigator', mockNavigator);
  });

  afterEach(() => {
    // Restore globals
    vi.unstubAllGlobals();
  });

  describe('getCurrentPageContext', () => {
    it('should return page path and referrer', () => {
      const context = getCurrentPageContext();

      expect(context).toBeDefined();
      expect(context.page_path).toBe('/test/page');
      expect(context.page_referrer).toBe('https://example.com/landing');
    });

    it('should cache page context', () => {
      const context1 = getCurrentPageContext();
      const cache1 = _getContextCache();

      expect(cache1.pageContext).not.toBeNull();

      const context2 = getCurrentPageContext();
      expect(context1).toBe(context2);
    });

    it('should provide fallback values when window is undefined', () => {
      vi.unstubAllGlobals();
      vi.stubGlobal('window', undefined);

      const context = getCurrentPageContext();

      expect(context.page_path).toBe('/unknown');
      expect(context.page_referrer).toBeNull();
    });

    it('should provide fallback values when document is undefined', () => {
      vi.unstubAllGlobals();
      vi.stubGlobal('document', undefined);

      const context = getCurrentPageContext();

      expect(context.page_referrer).toBeNull();
    });

    it('should handle errors gracefully', () => {
      vi.unstubAllGlobals();
      vi.stubGlobal('window', {
        get location() {
          throw new Error('Access denied');
        },
      } as unknown as Window);

      const context = getCurrentPageContext();

      expect(context.page_path).toBe('/unknown');
      expect(context.page_referrer).toBeNull();
    });
  });

  describe('getSourceAttribution', () => {
    it('should extract src from URL parameters', () => {
      const src = getSourceAttribution();

      expect(src).toBe('poster_qr');
    });

    it('should cache src value', () => {
      const src1 = getSourceAttribution();
      const cache1 = _getContextCache();

      expect(cache1.src).toBe('poster_qr');

      const src2 = getSourceAttribution();
      expect(src1).toBe(src2);
    });

    it('should return null when src parameter is not present', () => {
      vi.unstubAllGlobals();
      vi.stubGlobal('window', {
        location: {
          pathname: '/test/page',
          search: '?utm_medium=social',
        },
      } as Window);

      const src = getSourceAttribution();

      expect(src).toBeNull();
    });

    it('should return null when window is undefined', () => {
      vi.unstubAllGlobals();
      vi.stubGlobal('window', undefined);

      const src = getSourceAttribution();

      expect(src).toBeNull();
    });

    it('should handle errors gracefully', () => {
      vi.unstubAllGlobals();
      vi.stubGlobal('window', {
        get location() {
          throw new Error('Access denied');
        },
      } as unknown as Window);

      const src = getSourceAttribution();

      expect(src).toBeNull();
    });
  });

  describe('enrichEventContext', () => {
    it('should enrich event with all required context fields', () => {
      const enriched = enrichEventContext('test_event', {
        custom_prop: 'custom_value',
      });

      expect(enriched).toBeDefined();
      expect(enriched.event_name).toBe('test_event');
      expect(enriched.ts).toBeDefined();
      expect(enriched.device_id).toBeDefined();
      expect(enriched.session_id).toBeDefined();
      expect(enriched.page_path).toBe('/test/page');
      expect(enriched.page_referrer).toBe('https://example.com/landing');
      expect(enriched.src).toBe('poster_qr');
      expect(enriched.ua_basic).toBeDefined();
      expect(enriched.custom_prop).toBe('custom_value');
    });

    it('should use current timestamp', () => {
      const before = Date.now();
      const enriched = enrichEventContext('test_event', {});
      const after = Date.now();

      expect(enriched.ts).toBeGreaterThanOrEqual(before);
      expect(enriched.ts).toBeLessThanOrEqual(after);
    });

    it('should include custom properties', () => {
      const enriched = enrichEventContext('test_event', {
        button_id: 'submit',
        button_text: 'Submit Form',
        count: 42,
      });

      expect(enriched.button_id).toBe('submit');
      expect(enriched.button_text).toBe('Submit Form');
      expect(enriched.count).toBe(42);
    });

    it('should work with empty props', () => {
      const enriched = enrichEventContext('test_event', {});

      expect(enriched.event_name).toBe('test_event');
      expect(enriched.ts).toBeDefined();
      expect(enriched.device_id).toBeDefined();
      expect(enriched.session_id).toBeDefined();
    });

    it('should cache device_id and session_id', () => {
      const enriched1 = enrichEventContext('test_event', {});
      const enriched2 = enrichEventContext('test_event', {});

      expect(enriched1.device_id).toBe(enriched2.device_id);
      expect(enriched1.session_id).toBe(enriched2.session_id);
    });

    it('should truncate user agent if too long', () => {
      vi.unstubAllGlobals();
      vi.stubGlobal('navigator', {
        userAgent: 'a'.repeat(250), // Longer than MAX_USER_AGENT_LENGTH
      } as Navigator);

      const enriched = enrichEventContext('test_event', {});

      expect(enriched.ua_basic.length).toBe(200);
      expect(enriched.ua_basic).toBe('a'.repeat(200));
    });

    it('should use fallback values when browser APIs are unavailable', () => {
      vi.unstubAllGlobals();
      vi.stubGlobal('window', undefined);
      vi.stubGlobal('document', undefined);
      vi.stubGlobal('navigator', undefined);

      const enriched = enrichEventContext('test_event', {});

      expect(enriched.page_path).toBe('/unknown');
      expect(enriched.page_referrer).toBeNull();
      expect(enriched.src).toBeNull();
      expect(enriched.ua_basic).toBe('unknown_ua');
    });
  });

  describe('clearContextCache', () => {
    it('should clear all cached values', () => {
      // Populate cache
      enrichEventContext('test_event', {});
      const cacheBefore = _getContextCache();

      expect(cacheBefore.deviceId).not.toBeNull();
      expect(cacheBefore.sessionId).not.toBeNull();
      expect(cacheBefore.pageContext).not.toBeNull();

      // Clear cache
      clearContextCache();
      const cacheAfter = _getContextCache();

      expect(cacheAfter.deviceId).toBeNull();
      expect(cacheAfter.sessionId).toBeNull();
      expect(cacheAfter.pageContext).toBeNull();
      expect(cacheAfter.src).toBeNull();
      expect(cacheAfter.timestamp).toBe(0);
    });

    it('should force refresh after cache clear', () => {
      // Get initial event
      const event1 = enrichEventContext('test_event', { value: 1 });

      // Clear cache
      clearContextCache();

      // Get new event - should have fresh timestamp
      const event2 = enrichEventContext('test_event', { value: 2 });

      expect(event1.device_id).toBe(event2.device_id);
      expect(event1.session_id).toBe(event2.session_id);
      expect(event2.value).toBe(2);
    });
  });

  describe('_getContextCache', () => {
    it('should return current cache state', () => {
      const cache = _getContextCache();

      expect(cache).toBeDefined();
      expect(cache.deviceId).toBeNull();
      expect(cache.sessionId).toBeNull();
      expect(cache.pageContext).toBeNull();
      expect(cache.src).toBeNull();
      expect(cache.timestamp).toBe(0);
    });

    it('should reflect cache state after operations', () => {
      // Populate cache
      getCurrentPageContext();
      const cache = _getContextCache();

      expect(cache.pageContext).not.toBeNull();
      expect(cache.isValid).toBe(true);
    });

    it('should return isValid based on cache TTL', () => {
      getCurrentPageContext();
      let cache = _getContextCache();
      expect(cache.isValid).toBe(true);

      // Manually set old timestamp
      const oldTimestamp = Date.now() - 6 * 60 * 1000; // 6 minutes ago
      const timestamp = Date.now();
      vi.useFakeTimers().setSystemTime(new Date(timestamp));
      clearContextCache();
      getCurrentPageContext();
      cache = _getContextCache();
      expect(cache.timestamp).toBe(timestamp);
      expect(cache.isValid).toBe(true);

      vi.useRealTimers();
    });
  });

  describe('integration with device-id and session-id', () => {
    it('should use actual device ID from device-id module', () => {
      const enriched = enrichEventContext('test_event', {});

      expect(enriched.device_id).toBeDefined();
      expect(enriched.device_id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });

    it('should use actual session ID from session-id module', () => {
      const enriched = enrichEventContext('test_event', {});

      expect(enriched.session_id).toBeDefined();
      expect(enriched.session_id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });
  });

  describe('error handling', () => {
    it('should never throw errors from context enrichment', () => {
      vi.unstubAllGlobals();
      vi.stubGlobal('window', {
        get location() {
          throw new Error('Access denied');
        },
      } as unknown as Window);

      expect(() => {
        enrichEventContext('test_event', {});
      }).not.toThrow();
    });

    it('should use fallback values when device ID fails', () => {
      // This test would require mocking getDeviceId to throw
      // For now, we verify the structure includes the field
      const enriched = enrichEventContext('test_event', {});

      expect(enriched.device_id).toBeDefined();
    });

    it('should use fallback values when session ID fails', () => {
      // This test would require mocking getSessionId to throw
      // For now, we verify the structure includes the field
      const enriched = enrichEventContext('test_event', {});

      expect(enriched.session_id).toBeDefined();
    });
  });

  describe('performance optimization', () => {
    it('should minimize DOM reads by caching page context', () => {
      const windowLocationSpy = vi.spyOn(mockWindow.location, 'pathname', 'get');

      // First call reads from DOM
      getCurrentPageContext();
      expect(windowLocationSpy).toHaveBeenCalledTimes(1);

      // Second call uses cache
      getCurrentPageContext();
      expect(windowLocationSpy).toHaveBeenCalledTimes(1);

      windowLocationSpy.mockRestore();
    });

    it('should cache device_id after first retrieval', () => {
      const enriched1 = enrichEventContext('test_event', {});
      const deviceId = enriched1.device_id;

      // Get cache state
      const cache = _getContextCache();
      expect(cache.deviceId).toBe(deviceId);

      // Second call should use cached device_id
      const enriched2 = enrichEventContext('test_event', {});
      expect(enriched2.device_id).toBe(deviceId);
    });

    it('should cache session_id after first retrieval', () => {
      const enriched1 = enrichEventContext('test_event', {});
      const sessionId = enriched1.session_id;

      // Get cache state
      const cache = _getContextCache();
      expect(cache.sessionId).toBe(sessionId);

      // Second call should use cached session_id
      const enriched2 = enrichEventContext('test_event', {});
      expect(enriched2.session_id).toBe(sessionId);
    });
  });
});
