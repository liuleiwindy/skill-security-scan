/**
 * V0.2.3.5 Abuse Control Guard
 *
 * 防止扫描 API 被滥用：
 * 1. 滑动窗口限流（IP 键）
 * 2. 并发扫描数量上限
 * 3. 可配置的环境变量
 */

/**
 * 环境配置
 */
export interface EnvConfig {
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
  maxInFlight: number;
  hardTimeoutMs: number;
}

/**
 * 滑动窗口限流器
 * 基于 IP 追踪请求时间戳
 */
class SlidingWindowLimiter {
  private windows = new Map<string, number[]>(); // IP -> timestamps

  /**
   * 当跟踪 IP 太多时，触发一次全量过期清理，避免内存长期累积
   */
  private cleanupExpired(windowMs: number, now: number): void {
    for (const [key, timestamps] of this.windows.entries()) {
      const valid = timestamps.filter((t) => now - t < windowMs);
      if (valid.length === 0) {
        this.windows.delete(key);
      } else {
        this.windows.set(key, valid);
      }
    }
  }

  /**
   * 检查 IP 是否超过限流阈值
   * @param ip 客户端 IP
   * @param windowMs 时间窗口（毫秒）
   * @param maxRequests 窗口内最大请求数
   * @returns { allowed: boolean }
   */
  check(ip: string, windowMs: number, maxRequests: number): { allowed: boolean } {
    const now = Date.now();
    if (this.windows.size > 200) {
      this.cleanupExpired(windowMs, now);
    }
    const timestamps = this.windows.get(ip) || [];

    // 清理过期时间戳（滑动窗口）
    const validTimestamps = timestamps.filter((t) => now - t < windowMs);
    if (validTimestamps.length === 0) {
      this.windows.delete(ip);
    } else {
      this.windows.set(ip, validTimestamps);
    }

    // 检查是否超限
    if (validTimestamps.length >= maxRequests) {
      return { allowed: false };
    }

    // 记录本次请求时间戳
    validTimestamps.push(now);
    this.windows.set(ip, validTimestamps);

    return { allowed: true };
  }

  /**
   * 清理指定 IP 的窗口记录
   * 用于测试或重置
   */
  clear(ip: string): void {
    this.windows.delete(ip);
  }

  /**
   * 清空所有窗口记录
   */
  clearAll(): void {
    this.windows.clear();
  }

  /**
   * 获取当前跟踪的 IP 数量（用于测试/监控）
   */
  getTrackedIpCount(): number {
    return this.windows.size;
  }
}

/**
 * 并发计数器
 * 追踪当前正在执行的扫描数量
 */
class InFlightCounter {
  private count = 0;
  private max: number;

  constructor(max: number) {
    this.max = max;
  }

  /**
   * 尝试获取并发槽
   * @returns true if acquired, false if cap reached
   */
  tryAcquire(): boolean {
    if (this.count >= this.max) {
      return false;
    }
    this.count++;
    return true;
  }

  /**
   * 释放并发槽
   * ⚠️ 只在 tryAcquire() 返回 true 后调用
   * 防御性编程：确保不会减成负数
   */
  release(): void {
    if (this.count > 0) {
      this.count--;
    }
  }

  /**
   * 获取当前并发数
   */
  getCount(): number {
    return this.count;
  }

  /**
   * 重置计数器（用于测试）
   */
  reset(): void {
    this.count = 0;
  }
}

/**
 * 滥用控制守卫
 * 统一管理限流和并发控制
 */
class AbuseGuard {
  private limiter: SlidingWindowLimiter;
  private inFlight: InFlightCounter;
  private config: EnvConfig;

  constructor(config: EnvConfig) {
    this.config = config;
    this.limiter = new SlidingWindowLimiter();
    this.inFlight = new InFlightCounter(config.maxInFlight);
  }

  /**
   * 检查 rate limiter
   * @param ip 客户端 IP
   * @returns { allowed: boolean }
   */
  checkRateLimit(ip: string): { allowed: boolean } {
    return this.limiter.check(
      ip,
      this.config.rateLimitWindowMs,
      this.config.rateLimitMaxRequests,
    );
  }

  /**
   * 尝试获取并发槽
   * @returns true if acquired, false if cap reached
   */
  tryAcquireSlot(): boolean {
    return this.inFlight.tryAcquire();
  }

  /**
   * 释放并发槽
   * ⚠️ 只在 tryAcquireSlot() 返回 true 后调用
   */
  releaseSlot(): void {
    this.inFlight.release();
  }

  /**
   * 获取硬超时配置
   */
  getHardTimeoutMs(): number {
    return this.config.hardTimeoutMs;
  }

  /**
   * 获取当前并发数（用于监控/测试）
   */
  getInFlightCount(): number {
    return this.inFlight.getCount();
  }

  /**
   * 测试辅助：清理指定 IP 的限流记录
   */
  clearIp(ip: string): void {
    this.limiter.clear(ip);
  }

  /**
   * 测试辅助：清空所有 IP 限流记录
   */
  clearAllIps(): void {
    this.limiter.clearAll();
  }

  /**
   * 测试辅助：重置并发计数器
   */
  resetInFlight(): void {
    this.inFlight.reset();
  }

  /**
   * 测试/监控辅助：获取当前限流器跟踪的 IP 数量
   */
  getTrackedIpCount(): number {
    return this.limiter.getTrackedIpCount();
  }
}

/**
 * 从环境变量加载配置，提供安全默认值
 */
export function loadEnvConfig(): EnvConfig {
  const parsePositiveInt = (value: string | undefined, fallback: number): number => {
    const parsed = Number.parseInt(value ?? "", 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  };

  return {
    rateLimitWindowMs: parsePositiveInt(process.env.SCAN_RATE_LIMIT_WINDOW_MS, 60000),
    rateLimitMaxRequests: parsePositiveInt(process.env.SCAN_RATE_LIMIT_MAX_REQUESTS, 10),
    maxInFlight: parsePositiveInt(process.env.SCAN_MAX_INFLIGHT, 4),
    hardTimeoutMs: parsePositiveInt(process.env.SCAN_HARD_TIMEOUT_MS, 45000),
  };
}

/**
 * 全局单例（module-level）
 * 在应用启动时初始化一次
 */
const guard = new AbuseGuard(loadEnvConfig());

export { guard as abuseGuard };
export type { SlidingWindowLimiter, InFlightCounter };
