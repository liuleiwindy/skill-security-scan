# Analytics Module

这个模块提供了 analytics 事件的验证和发送功能，包括数据验证、GA4 集成和数据仓库操作。

## 模块结构

```
lib/analytics/
├── validation.ts          # 事件验证模块
├── sinks/
│   └── ga4.ts            # GA4 sink 模块
├── repository.ts         # 数据仓库模块
├── session-id.ts         # Session ID 模块
├── device-id.ts          # Device ID 模块
└── index.ts              # 模块导出
```

## 功能特性

### Validation Module (validation.ts)
- ✅ **事件白名单验证** - 只允许预定义的 9 种事件类型
- ✅ **错误码验证** - 严格验证 `{domain}_{type}` 格式
- ✅ **字段验证** - 根据事件类型验证必需和可选字段
- ✅ **结构化错误** - 返回带有字段路径的详细验证错误
- ✅ **TypeScript 类型** - 完整的类型定义和类型推断

### GA4 Sink (sinks/ga4.ts)
- ✅ **特性门控** - 基于 `NEXT_PUBLIC_GA4_MEASUREMENT_ID` 的可选集成
- ✅ **No-op 行为** - 未配置时不发送事件，不阻塞应用
- ✅ **动态加载** - 仅在配置时加载 gtag.js 脚本
- ✅ **错误处理** - GA4 错误不抛出异常，优雅降级
- ✅ **事件映射** - 内部事件名到 GA4 事件名的映射
- ✅ **参数转换** - 自动转换参数类型为 GA4 兼容格式

## 快速开始

### 使用 GA4 Sink

```typescript
import { sendToGA4, isGA4Configured } from './lib/analytics/sinks/ga4';

// 发送事件到 GA4
await sendToGA4('scan_page_view', { ts: Date.now() });

// 检查 GA4 是否配置
if (isGA4Configured()) {
  console.log('GA4 已配置');
}
```

### 使用 Validation Module

## 安装依赖

```bash
pnpm add zod
```

## 使用示例

### GA4 Sink

#### 基本使用

```typescript
import { sendToGA4, isGA4Configured } from './lib/analytics/sinks/ga4';

// 发送事件到 GA4
await sendToGA4('scan_page_view', { ts: Date.now() });

// 检查 GA4 是否配置
if (isGA4Configured()) {
  console.log('GA4 已配置');
}
```

#### 在 React 组件中使用

```tsx
import { useEffect } from 'react';
import { sendToGA4 } from '@/lib/analytics/sinks/ga4';

function ScanPage() {
  useEffect(() => {
    // 页面加载时发送事件
    sendToGA4('scan_page_view', { ts: Date.now() });
  }, []);

  const handleSubmit = async () => {
    // 用户提交时发送事件
    await sendToGA4('scan_submit_clicked', {
      input_type: 'url',
      ts: Date.now(),
    });
  };

  return <button onClick={handleSubmit}>Submit</button>;
}
```

#### 发送带错误详情的事件

```typescript
await sendToGA4('poster_download_result', {
  scan_id: 'scan_123',
  status: 'error',
  duration_ms: 5678,
  ts: Date.now(),
  error_code: 'download_timeout',
  error_message: 'Request timed out',
  error_details: {
    retry_count: 3,
    timeout_ms: 30000,
  },
});
```

### Validation Module

#### 基本验证

```typescript
import { validateEventPayload } from './lib/analytics/validation';

// 验证事件 payload
const result = validateEventPayload({
  event_name: 'scan_page_view',
  ts: Date.now()
});

if (result.success) {
  console.log('事件验证成功:', result.data);
} else {
  console.log('验证失败:', result.errors);
}
```

### 事件名验证

```typescript
import { validateEventName } from './lib/analytics/validation';

if (validateEventName('scan_page_view')) {
  console.log('事件名在白名单中');
}
```

### 错误码验证

```typescript
import { validateErrorCode, isAllowedDomain, isAllowedErrorType } from './lib/analytics/validation';

// 验证完整的错误码格式
if (validateErrorCode('scan_timeout')) {
  console.log('错误码格式正确');
}

// 单独验证 domain 和 type
if (isAllowedDomain('scan')) {
  console.log('domain 允许');
}

if (isAllowedErrorType('timeout')) {
  console.log('error type 允许');
}
```

### 处理验证错误

```typescript
import { validateEventPayload, formatValidationErrors } from './lib/analytics/validation';

const result = validateEventPayload({
  event_name: 'scan_page_view'
  // 缺少 ts 字段
});

if (!result.success) {
  console.error('验证失败:');
  console.log(formatValidationErrors(result.errors));
  // 输出: [ts] Required (invalid_type)
}
```

## 支持的事件类型

| 事件名 | 必需字段 | 可选字段 |
|--------|---------|---------|
| `scan_page_view` | `ts` | - |
| `scan_submit_clicked` | `input_type`, `ts` | - |
| `scan_result` | `status`, `duration_ms`, `ts` | - |
| `report_page_view` | `scan_id`, `ts` | - |
| `poster_page_view` | `scan_id`, `ts` | - |
| `poster_save_clicked` | `scan_id`, `method`, `ts` | - |
| `poster_download_result` | `scan_id`, `status`, `duration_ms`, `ts` | `error_code`, `error_message`, `error_details` |
| `poster_share_result` | `scan_id`, `status`, `duration_ms`, `ts` | `error_code`, `error_message`, `error_details` |
| `poster_qr_visit` | `scan_id`, `src`, `ua_basic`, `ts` | - |

## 支持的错误域 (Error Domains)

- `scan`
- `poster`
- `download`
- `share`
- `analytics`

## 支持的错误类型 (Error Types)

- `timeout`
- `network`
- `http_4xx`
- `http_5xx`
- `validation`
- `not_supported`
- `aborted`
- `unknown`

## API 文档

### GA4 Sink API

#### `sendToGA4(eventName: string, props: Record<string, unknown>): Promise<void>`

发送事件到 GA4，当 GA4 未配置时为 no-op。

**参数:**
- `eventName`: 内部事件名（如 'scan_page_view'）
- `props`: 事件属性

**示例:**
```typescript
await sendToGA4('scan_page_view', { ts: Date.now() });
```

**特性:**
- 特性门控：当 `NEXT_PUBLIC_GA4_MEASUREMENT_ID` 未设置时 no-op
- 服务器端安全：在非浏览器环境中 no-op
- 错误处理：GA4 错误不抛出异常
- 异步发送：不阻塞主线程

#### `isGA4Configured(): boolean`

检查 GA4 是否已配置。

**返回值:**
- `true`: `NEXT_PUBLIC_GA4_MEASUREMENT_ID` 已设置且非空
- `false`: GA4 未配置

#### `isGA4Initialized(): boolean`

检查 GA4 是否已初始化。

**返回值:**
- `true`: gtag.js 已成功加载
- `false`: GA4 未初始化

#### `getGA4State(): GA4State`

获取当前 GA4 初始化状态。

**返回值:**
- `'uninitialized'`: 未初始化
- `'loading'`: 正在加载
- `'initialized'`: 已初始化
- `'error'`: 加载失败

### Validation Module API

#### `validateEventPayload(payload: unknown): ValidationResult`

验证完整的事件 payload。

**返回值:**
```typescript
{
  success: boolean;
  data?: AnalyticsEvent;  // 验证成功时包含
  errors?: ValidationError[];  // 验证失败时包含
}
```

### `validateEventName(eventName: string): boolean`

检查事件名是否在白名单中。

### `validateErrorCode(errorCode: string): boolean`

验证错误码格式 `{domain}_{type}` 和值的有效性。

### `isAllowedDomain(domain: string): boolean`

检查错误 domain 是否在允许列表中。

### `isAllowedErrorType(errorType: string): boolean`

检查错误 type 是否在允许列表中。

## TypeScript 类型

模块导出了完整的 TypeScript 类型定义:

```typescript
interface AnalyticsEvent {
  event_name: string;
  ts: number;
  scan_id?: string;
  status?: string;
  duration_ms?: number;
  input_type?: string;
  method?: string;
  src?: string;
  ua_basic?: string;
  error_code?: string;
  error_message?: string;
  error_details?: Record<string, unknown>;
}

interface ValidationResult {
  success: boolean;
  errors?: ValidationError[];
  data?: AnalyticsEvent;
}

interface ValidationError {
  path: string[];
  message: string;
  code: string;
}
```

## 测试

运行所有 analytics 测试:

```bash
# 运行 validation 测试
pnpm test tests/analytics-validation.test.ts

# 运行 GA4 sink 测试
pnpm test tests/analytics-ga4-sink.test.ts

# 运行所有 analytics 测试
pnpm test tests/analytics-*.test.ts
```

## GA4 配置

### 环境变量

在 `.env.local` 文件中添加 GA4 Measurement ID:

```bash
NEXT_PUBLIC_GA4_MEASUREMENT_ID=G-XXXXXXXXXX
```

### 特性门控

GA4 sink 是可选的：
- ✅ 当 `NEXT_PUBLIC_GA4_MEASUREMENT_ID` 未设置时，函数为 no-op
- ✅ 当 `NEXT_PUBLIC_GA4_MEASUREMENT_ID` 为空时，函数为 no-op
- ✅ GA4 错误不会阻塞应用功能
- ✅ 后端数据仓库是必需的，GA4 是可选的

### 事件映射

| 内部事件名 | GA4 事件名 | 类型 |
|-----------|-----------|------|
| `scan_page_view` | `scan_page_view` | 自定义事件 |
| `scan_submit_clicked` | `scan_submit_clicked` | 自定义事件 |
| `scan_result` | `scan_result` | 自定义事件 |
| `report_page_view` | `report_page_view` | 自定义事件 |
| `poster_page_view` | `poster_page_view` | 自定义事件 |
| `poster_save_clicked` | `poster_save_clicked` | 自定义事件 |
| `poster_download_result` | `poster_download_result` | 自定义事件 |
| `poster_share_result` | `poster_share_result` | 自定义事件 |
| `poster_qr_visit` | `poster_qr_visit` | 自定义事件 |

## 约束条件

### GA4 Sink
- 不允许直接在业务代码中调用 gtag()
- 不允许使用其他 GA4 集成方法
- 不允许在 GA4 未配置时发送事件
- GA4 错误不抛出异常

### Validation Module

- 不允许自定义验证逻辑
- 不允许绕过 analytics API 的验证
- 强制执行事件白名单
- 强制执行错误码格式
