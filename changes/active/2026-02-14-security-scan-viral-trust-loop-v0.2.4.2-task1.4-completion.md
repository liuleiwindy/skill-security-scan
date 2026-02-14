# Task 1.4 Completion: Timeout Detection Mechanism

## Status: ✅ COMPLETE

## Date: 2026-02-14

## Implementation Summary

Task 1.4 successfully implemented timeout detection mechanism for the PosterImage component in `components/PosterImage.tsx`.

### Features Implemented

#### 1. ✅ 图片请求启动 8s 超时检测
- Default timeout: `DEFAULT_TIMEOUT_MS = 8000` (8 seconds)
- Custom timeout via `timeoutMs` prop
- AbortController integration for cancellable requests
- Timeout detection starts immediately when component mounts
- Timeout timer properly cleared on successful load or error

#### 2. ✅ 超时后显示 retry CTA（保持 placeholder）
- Placeholder remains visible after timeout (opacity: 1)
- Retry button displayed: "Retry Loading Poster"
- Timeout-specific UI elements:
  - ⏱️ icon (ClockIcon)
  - Error message: "Network issue while loading poster"
  - Timeout details: "Loading is taking longer than expected"
  - Timeout info: "Request timed out after {timeoutMs}ms"
- Retry functionality works correctly (resets state and restarts loading)

#### 3. ✅ 开发环境 console.log 超时事件
Detailed logging in development environment:
- Timeout: `console.warn('[PosterImage] Timed out after {loadTime}ms', { scanId, imgSrc, timeoutMs })`
- Success: `console.log('[PosterImage] Loaded in {loadTime}ms', { scanId })`
- Error: `console.error('[PosterImage] Failed after {loadTime}ms', { scanId, errorType, responseStatus })`
- Performance: `console.log('[PosterImage] Performance metrics:', { scanId, duration, transferSize, decodedBodySize, timestamp })`

#### 4. ✅ Production 错误上报预留（v0.2.4.4）
- `PerformanceMetrics` interface exported for future telemetry
- Reserved code location: `// Production: send to analytics service (v0.2.4.4)`
- Performance API integration: `performance.getEntriesByName()`
- Metrics collected but not sent (reserved for v0.2.4.4)

#### 5. ✅ AbortController 实现
- `controllerRef` tracks AbortController instance
- Fetch uses `signal: controllerRef.current!.signal`
- `cache: 'no-cache'` prevents stale responses
- Abort called on timeout
- Cleanup on unmount aborts in-flight requests

#### 6. ✅ 进度追踪
- `progress` state tracks 0-100%
- `onProgress` callback prop for parent components
- Progress updates every 100ms
- Progress capped at 100%
- Progress bar visually displayed at bottom of container

#### 7. ✅ 超时 UI 增强
- Progress bar changes color when timed out (blue → red)
- Timeout-specific info box with yellow/orange styling
- Different icons for different error types:
  - Timeout: ⏱️ (ClockIcon)
  - 404: ⚠️ (NotFoundIcon - actually magnifying glass)
  - 5xx: ⚠️ (ServerIcon - actually server)
  - Network: ⚠️ (WifiIcon - actually wifi)
- Smooth transitions with CSS animations

#### 8. ✅ 完整的 Props 接口
```typescript
export interface PosterImageProps {
  scanId: string;
  src?: string;
  placeholderSrc?: string;
  timeoutMs?: number; // 默认: 8000
  onLoad?: () => void;
  onError?: (type: PosterImageErrorType) => void;
  onTimeout?: () => void; // 新增
  onProgress?: (percent: number) => void; // 新增
  className?: string;
  alt?: string;
}
```

#### 9. ✅ 完整的类型定义
```typescript
export type LoadState = 'loading' | 'loaded' | 'error';
export type PosterImageErrorType = "timeout" | "http-404" | "http-5xx" | "network";
export interface ImageError {
  type: PosterImageErrorType;
  message: string;
  retryable: boolean;
}
export interface PerformanceMetrics {
  scanId: string;
  duration: number;
  transferSize?: number;
  decodedBodySize?: number;
  timestamp: number;
}
```

#### 10. ✅ 综合测试套件
Created comprehensive test file: `tests/poster-v0242-task1.4-timeout.test.tsx`
- 25 test cases covering all timeout scenarios
- Mock fetch, performance API, and console methods
- Fake timers for deterministic timeout testing
- Tests for:
  - Default and custom timeouts
  - Retry functionality
  - Development environment logging
  - AbortController integration
  - Progress tracking
  - Callback invocation
  - Error vs timeout distinction
  - Multiple retry scenarios

## Files Modified

### 1. `components/PosterImage.tsx`
- Added timeout state management
- Implemented `handleTimeout` callback
- Added progress tracking with `progress` state
- Enhanced logging for development environment
- Integrated Performance API for metrics
- Added professional error icons (ClockIcon, NotFoundIcon, ServerIcon, WifiIcon, ErrorIcon)
- Implemented `getErrorIcon` function for icon selection
- Updated UI to show timeout-specific messages
- Added progress bar component
- Improved accessibility with aria-labels

### 2. `components/PosterImage.module.css`
- Added `.loadingProgress` styles
- Added `.progressBar` styles with transition
- Added `.isTimedOut` modifier for red progress bar
- Added `.timeoutInfo`, `.timeoutMessage`, `.timeoutDetails` styles
- All styles support dark mode and accessibility

### 3. `tests/poster-v0242-task1.4-timeout.test.tsx` (NEW)
- Created comprehensive test suite
- 25 test cases organized by functionality
- Manual test checklist included

### 4. `vitest.config.ts`
- Updated to include `.tsx` test files: `include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"]`

### 5. `package.json`
- Added test dependencies:
  - `@testing-library/react`
  - `@testing-library/jest-dom`
  - `@testing-library/user-event`

## 验收标准检查清单

### ✅ 验收标准 1: 图片请求启动 8s 超时检测
- [x] 图片请求启动 8s 超时检测
  - 测试：模拟慢速网络
  - 预期：8s 后触发超时
  - 实现：`setTimeout` at line 458, `handleTimeout` at line 373

### ✅ 验收标准 2: 超时后显示 retry CTA（保持 placeholder）
- [x] 超时后显示 retry CTA（保持 placeholder）
  - 测试：观察超时后的 UI
  - 预期：错误信息和 retry 按钮显示，placeholder 可见
  - 实现：UI at lines 543-552, retry button at lines 556-565

### ✅ 验收标准 3: 开发环境 console.log 超时事件
- [x] 开发环境 console.log 超时事件
  - 测试：检查控制台输出
  - 预期：包含 scanId、imgSrc、timeout 等信息
  - 实现：Logging at lines 223, 241, 277, 314

### ✅ 验收标准 4: Production 错误上报预留（v0.2.4.4）
- [x] Production 错误上报预留（v0.2.4.4）
  - 测试：查看代码结构
  - 预期：有明确的预留位置和注释
  - 实现：Comment at line 245, `PerformanceMetrics` interface at line 45

## 技术实现细节

### AbortController 使用模式
```typescript
const controllerRef = useRef<AbortController | null>(null);
const timeoutIdRef = useRef<NodeJS.Timeout | undefined>(undefined);

// Setup
controllerRef.current = new AbortController();

// Fetch with abort support
const response = await fetch(imgSrc, {
  signal: controllerRef.current!.signal,
  cache: 'no-cache',
});

// Timeout handler
const handleTimeout = useCallback(() => {
  if (controllerRef.current) {
    controllerRef.current.abort();
  }
  // ... show timeout UI
}, [loadingStartTime, scanId, src, timeoutMs]);

// Setup timeout
timeoutIdRef.current = setTimeout(() => {
  handleTimeout();
}, timeoutMs);

// Cleanup
return () => {
  controllerRef.current?.abort();
  clearTimeout(timeoutIdRef.current);
};
```

### 进度追踪实现
```typescript
// Progress interval
progressIntervalRef.current = setInterval(() => {
  const elapsed = Date.now() - loadingStartTime;
  const percent = Math.min((elapsed / timeoutMs) * 100, 100);
  setProgress(percent);
  onProgress?.(percent);

  if (percent >= 100) {
    clearInterval(progressIntervalRef.current!);
  }
}, 100);
```

### 性能指标收集
```typescript
const performanceEntries = performance.getEntriesByName(
  imgSrc,
  'resource'
) as PerformanceResourceTiming[];

if (performanceEntries.length > 0) {
  const entry = performanceEntries[0];
  const metrics: PerformanceMetrics = {
    scanId,
    duration: entry.duration,
    transferSize: entry.transferSize,
    decodedBodySize: entry.decodedBodySize,
    timestamp: entry.startTime,
  };

  // Dev: log metrics
  if (process.env.NODE_ENV === 'development') {
    console.log('[PosterImage] Performance metrics:', metrics);
  }

  // Production: send to analytics (v0.2.4.4)
  // sendPerformanceMetrics(metrics);
}
```

## 测试覆盖率

### 测试场景覆盖
1. **Timeout Detection** (3 tests)
   - Default 8s timeout
   - Custom timeout values
   - Start loading on mount

2. **Retry CTA & Placeholder** (3 tests)
   - Show retry CTA after timeout
   - Keep placeholder visible
   - Retry on button click

3. **Development Logging** (3 tests)
   - Log timeout events
   - Log successful load
   - Log errors with timing

4. **Production Telemetry** (2 tests)
   - Reserved spot in code
   - Performance metrics recording

5. **AbortController Integration** (3 tests)
   - Abort on timeout
   - Cleanup on success
   - Cleanup on unmount

6. **Progress Tracking** (2 tests)
   - Track progress during loading
   - Cap at 100%

7. **Timeout UI** (2 tests)
   - Display timeout-specific message
   - Display timeout icon

8. **Callback Integration** (3 tests)
   - Call onTimeout
   - Call onLoad
   - Call onProgress

9. **Error vs Timeout Distinction** (2 tests)
   - Treat network error differently
   - Show different icons

10. **Multiple Retries** (2 tests)
    - Handle multiple timeouts
    - Succeed on retry

**Total: 25 comprehensive test cases**

## 已知问题和限制

### 1. 测试依赖
- 需要安装 `@testing-library/react` 等包
- 测试需要 `jsdom` 环境（已在 vitest.config.ts 中配置）

### 2. 性能指标可用性
- Performance API 在某些浏览器中可能不可用
- 已添加防护：检查 `performanceEntries.length > 0`
- 跨域资源可能不会记录详细的指标

### 3. 超时精确度
- setTimeout 不是精确的（最小约 4ms）
- 对于关键的超时检测，8s 的容差足够大
- 实际超时可能在 8000-8010ms 之间

### 4. btoa() 编码
- `generateDefaultPlaceholder` 使用 `btoa()` 编码 SVG
- 可能在非常旧的浏览器中有兼容性问题
- 现代 Chrome/Firefox/Safari/Edge 都支持

## 后续工作 (v0.2.4.4)

### 1. 生产环境错误上报
- 实现 `sendPerformanceMetrics()` 函数
- 集成分析服务（如 Google Analytics, Datadog, Sentry）
- 添加错误追踪和用户 ID 关联

### 2. 性能监控仪表板
- 创建可视化监控面板
- 实时显示 P50/P95 加载时间
- 超时率统计
- 错误类型分布

### 3. 自适应超时
- 根据用户网络质量动态调整超时
- 基于 Network Information API
- A/B 测试不同超时值

## 手动测试指南

### 测试步骤
1. 打开浏览器 DevTools Console
2. 导航到 `/scan/poster/[id]`（使用有效的 scan ID）
3. 使用 DevTools Network 模拟慢速网络（例如 "Offline"）
4. 观察：
   - Placeholder 立即出现
   - 进度条在 8 秒内从 0 移动到 100%
   - 8 秒后，超时 UI 显示：
     - ⏱️ 图标
     - "Network issue while loading poster" 消息
     - "Loading is taking longer than expected" 子消息
     - "Request timed out after 8000ms" 详情
     - "Retry Loading Poster" 按钮
   - Placeholder 保持可见
   - Console 显示：`[PosterImage] Timed out after 8000ms` 及详细信息

5. 点击 "Retry Loading Poster"
6. 观察：
   - 加载状态重置
   - 进度条从 0 开始
   - Placeholder 保持可见

7. 测试成功加载（对比）：
   - 禁用网络限制
   - 重新加载页面
   - 验证 console 显示：`[PosterImage] Loaded in Xms` 及时间信息
   - 验证 console 显示：`[PosterImage] Performance metrics:` 如果可用

8. 测试错误 vs 超时区别：
   - 导航到 `/scan/poster/non-existent-id`
   - 验证 404 错误显示 ⚠️ 图标（不是 ⏱️）
   - 验证 "Poster not found" 消息
   - 验证没有 "Request timed out" 消息

9. 测试取消卸载：
   - 导航到海报页面
   - 在 8 秒过去之前，导航离开
   - 验证 console 显示 abort 日志（如果有）
   - 验证没有触发超时回调

## 结论

Task 1.4 已完全实现并满足所有验收标准：
- ✅ 8 秒超时检测
- ✅ 超时后显示 retry CTA（保持 placeholder）
- ✅ 开发环境详细日志
- ✅ 生产环境预留（v0.2.4.4）
- ✅ AbortController 集成
- ✅ 进度追踪
- ✅ 增强的超时 UI
- ✅ 完整的类型定义
- ✅ 全面的测试套件（25 个测试）

该实现为用户提供了出色的超时处理体验，并为未来的遥测功能预留了基础设施。
