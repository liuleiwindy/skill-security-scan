import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { abuseGuard, loadEnvConfig } from '@/lib/scan/abuse-guard';
import type { EnvConfig } from '@/lib/scan/abuse-guard';

// 由于 abuseGuard 是全局单例，我们需要通过设置环境变量来测试
// 本测试文件主要测试类的核心逻辑，实际集成测试在 api.test.ts 中

describe('abuse-guard', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.useRealTimers();
    // 重置 abuseGuard 状态
    abuseGuard.resetInFlight();
    abuseGuard.clearAllIps();
  });

  describe('loadEnvConfig', () => {
    it('loads default values when env vars are not set', () => {
      delete process.env.SCAN_RATE_LIMIT_WINDOW_MS;
      delete process.env.SCAN_RATE_LIMIT_MAX_REQUESTS;
      delete process.env.SCAN_MAX_INFLIGHT;
      delete process.env.SCAN_HARD_TIMEOUT_MS;

      const config = loadEnvConfig();

      expect(config).toEqual({
        rateLimitWindowMs: 60000,
        rateLimitMaxRequests: 10,
        maxInFlight: 4,
        hardTimeoutMs: 45000,
      });
    });

    it('loads custom values from env vars', () => {
      process.env.SCAN_RATE_LIMIT_WINDOW_MS = '120000';
      process.env.SCAN_RATE_LIMIT_MAX_REQUESTS = '20';
      process.env.SCAN_MAX_INFLIGHT = '8';
      process.env.SCAN_HARD_TIMEOUT_MS = '90000';

      const config = loadEnvConfig();

      expect(config).toEqual({
        rateLimitWindowMs: 120000,
        rateLimitMaxRequests: 20,
        maxInFlight: 8,
        hardTimeoutMs: 90000,
      });
    });

    it('handles invalid env vars gracefully', () => {
      process.env.SCAN_RATE_LIMIT_WINDOW_MS = 'invalid';
      process.env.SCAN_RATE_LIMIT_MAX_REQUESTS = 'not-a-number';
      process.env.SCAN_MAX_INFLIGHT = '-2';
      process.env.SCAN_HARD_TIMEOUT_MS = '0';

      const config = loadEnvConfig();

      expect(config.rateLimitWindowMs).toBe(60000);
      expect(config.rateLimitMaxRequests).toBe(10);
      expect(config.maxInFlight).toBe(4);
      expect(config.hardTimeoutMs).toBe(45000);
    });
  });

  describe('SlidingWindowLimiter', () => {
    it('allows requests under threshold', () => {
      const ip = '192.168.1.1';
      const windowMs = 60000;
      const maxRequests = 10;

      // 发送 5 个请求（低于阈值）
      for (let i = 0; i < 5; i++) {
        const result = abuseGuard.checkRateLimit(ip);
        expect(result.allowed).toBe(true);
      }
    });

    it('blocks requests over threshold', () => {
      const ip = '192.168.1.2';
      // 临时修改配置以加快测试
      process.env.SCAN_RATE_LIMIT_MAX_REQUESTS = '3';
      // 注意：由于全局单例已初始化，这个测试会使用初始配置

      // 发送 10 个请求（超过默认阈值）
      let blocked = false;
      for (let i = 0; i < 15; i++) {
        const result = abuseGuard.checkRateLimit(ip);
        if (!result.allowed) {
          blocked = true;
          break;
        }
      }

      expect(blocked).toBe(true);
    });

    it('expires old requests outside window', () => {
      const ip = '192.168.1.3';

      // 填满窗口
      for (let i = 0; i < 10; i++) {
        abuseGuard.checkRateLimit(ip);
      }

      // 应该被阻塞
      let result = abuseGuard.checkRateLimit(ip);
      expect(result.allowed).toBe(false);

      // 前进时间超过窗口期
      vi.advanceTimersByTime(61000);

      // 现在应该允许新请求
      result = abuseGuard.checkRateLimit(ip);
      expect(result.allowed).toBe(true);
    });

    it('prunes expired IP windows when tracker grows large', () => {
      // 先制造大量不同 IP 的窗口记录
      for (let i = 0; i < 250; i++) {
        abuseGuard.checkRateLimit(`10.0.0.${i}`);
      }
      expect(abuseGuard.getTrackedIpCount()).toBeGreaterThan(200);

      // 时间推进到窗口外，使它们全部过期
      vi.advanceTimersByTime(61000);

      // 下一次请求会触发批量清理逻辑
      abuseGuard.checkRateLimit('10.1.1.1');
      expect(abuseGuard.getTrackedIpCount()).toBe(1);
    });

    it('handles different IPs independently', () => {
      const ip1 = '192.168.1.4';
      const ip2 = '192.168.1.5';

      // IP1 填满窗口
      for (let i = 0; i < 10; i++) {
        expect(abuseGuard.checkRateLimit(ip1).allowed).toBe(true);
      }
      expect(abuseGuard.checkRateLimit(ip1).allowed).toBe(false);

      // IP2 应该不受影响
      expect(abuseGuard.checkRateLimit(ip2).allowed).toBe(true);
    });

    it('allows requests after clearing IP', () => {
      const ip = '192.168.1.6';

      // 填满窗口
      for (let i = 0; i < 10; i++) {
        abuseGuard.checkRateLimit(ip);
      }
      expect(abuseGuard.checkRateLimit(ip).allowed).toBe(false);

      // 清理该 IP
      abuseGuard.clearIp(ip);

      // 现在应该允许新请求
      expect(abuseGuard.checkRateLimit(ip).allowed).toBe(true);
    });
  });

  describe('InFlightCounter', () => {
    it('acquires and releases slots', () => {
      // 重置并发计数
      abuseGuard.resetInFlight();

      // 获取槽
      expect(abuseGuard.tryAcquireSlot()).toBe(true);
      expect(abuseGuard.getInFlightCount()).toBe(1);

      // 释放槽
      abuseGuard.releaseSlot();
      expect(abuseGuard.getInFlightCount()).toBe(0);
    });

    it('blocks when cap is reached', () => {
      abuseGuard.resetInFlight();

      // 获取所有可用槽（默认是 4 个）
      const acquired = [];
      for (let i = 0; i < 10; i++) {
        const slot = abuseGuard.tryAcquireSlot();
        acquired.push(slot);
        if (!slot) break;
      }

      // 应该只能获取 4 个槽
      expect(acquired.filter(Boolean).length).toBe(4);
      expect(abuseGuard.getInFlightCount()).toBe(4);

      // 第 5 个尝试应该失败
      expect(abuseGuard.tryAcquireSlot()).toBe(false);

      // 释放一个槽
      abuseGuard.releaseSlot();
      expect(abuseGuard.getInFlightCount()).toBe(3);

      // 现在应该可以获取新槽
      expect(abuseGuard.tryAcquireSlot()).toBe(true);
      expect(abuseGuard.getInFlightCount()).toBe(4);
    });

    it('defends against negative counts', () => {
      abuseGuard.resetInFlight();

      // 多次释放（即使没有获取）
      abuseGuard.releaseSlot();
      abuseGuard.releaseSlot();
      abuseGuard.releaseSlot();

      // 计数不应该变成负数
      expect(abuseGuard.getInFlightCount()).toBeGreaterThanOrEqual(0);
    });
  });

  describe('integration behavior', () => {
    it('combines rate limiting and concurrency control', () => {
      abuseGuard.resetInFlight();
      const ip = '192.168.1.7';

      // 清理 IP 以确保干净状态
      abuseGuard.clearIp(ip);

      // 尝试获取并发槽
      expect(abuseGuard.tryAcquireSlot()).toBe(true);
      expect(abuseGuard.checkRateLimit(ip).allowed).toBe(true);
    });

    it('returns hard timeout config', () => {
      const timeout = abuseGuard.getHardTimeoutMs();
      expect(timeout).toBeGreaterThan(0);
      expect(typeof timeout).toBe('number');
    });
  });
});
