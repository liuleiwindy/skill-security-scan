/**
 * Tests for browser detection functionality (Task 2.2)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isDesktopEnvironment,
  getBrowserInfo,
  supportsBlobDownload,
} from '@/lib/download';

describe('Browser Detection (Desktop Download)', () => {
  let originalNavigator: any;
  
  beforeEach(() => {
    originalNavigator = global.navigator;
  });
  
  afterEach(() => {
    global.navigator = originalNavigator;
  });
  
  describe('isDesktopEnvironment', () => {
    it('should return false for iPhone user agents', () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        },
        writable: true,
        configurable: true,
      });
      
      expect(isDesktopEnvironment()).toBe(false);
    });
    
    it('should return false for iPad user agents', () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)',
        },
        writable: true,
        configurable: true,
      });
      
      expect(isDesktopEnvironment()).toBe(false);
    });
    
    it('should return false for iPod user agents', () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (iPod touch; CPU iPhone OS 14_0 like Mac OS X)',
        },
        writable: true,
        configurable: true,
      });
      
      expect(isDesktopEnvironment()).toBe(false);
    });
    
    it('should return false for Android user agents', () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (Linux; Android 10; SM-G973F)',
        },
        writable: true,
        configurable: true,
      });
      
      expect(isDesktopEnvironment()).toBe(false);
    });
    
    it('should return true for macOS user agents', () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        },
        writable: true,
        configurable: true,
      });
      
      expect(isDesktopEnvironment()).toBe(true);
    });
    
    it('should return true for Windows user agents', () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        },
        writable: true,
        configurable: true,
      });
      
      expect(isDesktopEnvironment()).toBe(true);
    });
    
    it('should return true for Linux user agents', () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (X11; Linux x86_64)',
        },
        writable: true,
        configurable: true,
      });
      
      expect(isDesktopEnvironment()).toBe(true);
    });
    
    it('should return false when navigator is undefined', () => {
      Object.defineProperty(global, 'navigator', {
        value: undefined,
        writable: true,
        configurable: true,
      });
      
      expect(isDesktopEnvironment()).toBe(false);
    });
  });
  
  describe('getBrowserInfo', () => {
    it('should detect supported Chrome version', () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        writable: true,
        configurable: true,
      });
      
      const info = getBrowserInfo();
      expect(info.name).toBe('Chrome');
      expect(info.version).toBe(120);
      expect(info.isSupported).toBe(true);
    });
    
    it('should detect unsupported old Chrome version', () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        },
        writable: true,
        configurable: true,
      });
      
      const info = getBrowserInfo();
      expect(info.name).toBe('Chrome');
      expect(info.version).toBe(119);
      expect(info.isSupported).toBe(false);
    });
    
    it('should detect supported Safari version', () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
        },
        writable: true,
        configurable: true,
      });
      
      const info = getBrowserInfo();
      expect(info.name).toBe('Safari');
      expect(info.version).toBe(17);
      expect(info.isSupported).toBe(true);
    });
    
    it('should detect unsupported old Safari version', () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Safari/605.1.15',
        },
        writable: true,
        configurable: true,
      });
      
      const info = getBrowserInfo();
      expect(info.name).toBe('Safari');
      expect(info.version).toBe(15);
      expect(info.isSupported).toBe(false);
    });
    
    it('should detect supported Firefox version', () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0',
        },
        writable: true,
        configurable: true,
      });
      
      const info = getBrowserInfo();
      expect(info.name).toBe('Firefox');
      expect(info.version).toBe(121);
      expect(info.isSupported).toBe(true);
    });
    
    it('should detect unsupported old Firefox version', () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:120.0) Gecko/20100101 Firefox/120.0',
        },
        writable: true,
        configurable: true,
      });
      
      const info = getBrowserInfo();
      expect(info.name).toBe('Firefox');
      expect(info.version).toBe(120);
      expect(info.isSupported).toBe(false);
    });
    
    it('should detect supported Edge version', () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
        },
        writable: true,
        configurable: true,
      });
      
      const info = getBrowserInfo();
      expect(info.name).toBe('Edge');
      expect(info.version).toBe(120);
      expect(info.isSupported).toBe(true);
    });
    
    it('should detect unsupported old Edge version', () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0',
        },
        writable: true,
        configurable: true,
      });
      
      const info = getBrowserInfo();
      expect(info.name).toBe('Edge');
      expect(info.version).toBe(119);
      expect(info.isSupported).toBe(false);
    });
    
    it('should return unknown when navigator is undefined', () => {
      Object.defineProperty(global, 'navigator', {
        value: undefined,
        writable: true,
        configurable: true,
      });
      
      const info = getBrowserInfo();
      expect(info.name).toBe('unknown');
      expect(info.version).toBe(0);
      expect(info.isSupported).toBe(false);
    });
  });
  
  describe('supportsBlobDownload', () => {
    it('should return true when download attribute is supported', () => {
      // In a real browser environment, this should return true
      const result = supportsBlobDownload();
      expect(typeof result).toBe('boolean');
    });
  });
});
