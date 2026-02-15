# Analytics API Module - Acceptance Checklist

## Implementation Status: ✅ COMPLETE

---

## ✅验收标准

- [x] **API 路由创建在正确路径**
  - 文件: `app/api/analytics/route.ts`
  - 符合 Next.js App Router 规范

- [x] **POST 端点正确实现**
  - 接收事件数组（1-50 个事件）
  - 验证每个事件（使用 validation 模块）
  - 部分接受策略：接受有效事件，拒绝无效事件
  - 返回 202 Accepted（异步处理）

- [x] **集成 validation 模块进行验证**
  - 使用 `validateEventPayload()` 验证完整事件结构
  - 使用 `validateEventName()` 验证事件名（通过 validation 模块的 schema）
  - 自动验证错误码格式（通过 Zod schema）
  - 自动验证必需字段（通过 discriminated union schema）

- [x] **部分接受策略正确实现**
  - 有效事件被接受并存储
  - 无效事件被拒绝并记录日志
  - 返回 accepted/rejected 计数
  - 即使部分事件无效，有效事件仍会被处理

- [x] **响应格式正确**
  - 成功：202 Accepted，返回 `{"accepted": number, "rejected": number}`
  - 错误：400/413/500，返回 `{"error": string}`

- [x] **错误响应正确**
  - 400 Bad Request: 无效 JSON、负载结构或批次大小
  - 413 Payload Too Large: 负载超过 1MB
  - 500 Internal Server Error: 服务器内部错误

- [x] **安全考虑实现**
  - 负载大小验证（最大 1MB）
  - 批次大小限制（1-50 个事件）
  - 清理错误消息（不泄露内部信息）
  - 记录所有被拒绝的事件以供调试

- [x] **TypeScript 类型完整且准确**
  - 导入并使用正确的类型
  - `ValidatedAnalyticsEvent` 来自 validation 模块
  - `DatabaseAnalyticsEvent` 来自 repository 模块
  - 所有函数都有正确的类型注解

- [x] **遵循 Next.js App Router API 路由最佳实践**
  - 使用 `NextRequest` 和 `NextResponse`
  - 导出 POST 函数作为处理程序
  - 导出 GET/PUT/DELETE/PATCH 返回 405 Method Not Allowed
  - 使用 async/await 进行异步处理
  - 错误处理符合最佳实践

---

## 📁 创建的文件

### 1. API 路由实现
**文件**: `app/api/analytics/route.ts`

**关键功能**:
- POST 处理程序：接收并处理分析事件
- 提取 device_id 和 session_id 从请求头
- 解析和验证请求体
- 验证事件（部分接受策略）
- 异步插入数据库
- 返回 202 Accepted
- 错误处理（400/413/500）

**常量**:
- `MAX_BATCH_SIZE = 50`: 最大批次大小
- `MIN_BATCH_SIZE = 1`: 最小批次大小
- `MAX_PAYLOAD_SIZE = 1024 * 1024`: 最大负载大小（1MB）

**辅助函数**:
- `extractTrackingInfo()`: 从请求头提取 device_id 和 session_id
- `parseRequestBody()`: 解析和验证请求体
- `validateEvents()`: 验证事件数组
- `toDatabaseEvent()`: 转换为数据库格式

### 2. 测试文件
**文件**: `tests/analytics-api.test.ts`

**测试覆盖**:
- 成功请求（单个事件、多个事件）
- 部分接受策略（混合有效/无效事件）
- 错误处理（缺少 device_id、无效 JSON、非数组、空批次、批次过大、负载过大、意外错误）
- 事件验证（无效事件名、缺少必需字段、无效错误码格式）
- 异步处理（立即返回、数据库错误处理）
- 边界情况（最大批次大小、全部事件无效）

### 3. API 文档
**文件**: `docs/analytics-api.md`

**文档内容**:
- API 概述
- 请求格式（headers、body）
- 响应格式（成功和错误）
- 支持的事件类型和字段
- 使用示例
- 实现细节（部分接受、异步处理、验证规则、安全考虑）
- 测试说明

---

## 🔑 关键实现细节

### 1. 部分接受策略
```typescript
// 验证事件数组
const { validEvents, rejectedCount } = validateEvents(events);

// 只插入有效事件
if (acceptedCount > 0) {
  const databaseEvents = validEvents.map(event =>
    toDatabaseEvent(event, deviceId, sessionId)
  );

  // 异步插入（不等待）
  insertAnalyticsEvents(databaseEvents).catch(error => {
    console.error('[analytics-api] Failed to insert events:', error);
  });
}

// 返回 202 Accepted，不等待数据库
return NextResponse.json(
  { accepted: acceptedCount, rejected: rejectedCount },
  { status: 202 }
);
```

### 2. 请求体验证
```typescript
// 检查负载大小
const contentLength = request.headers.get('content-length');
if (contentLength && parseInt(contentLength, 10) > MAX_PAYLOAD_SIZE) {
  return { success: false, error: { status: 413, message: 'Payload too large' } };
}

// 验证是数组
if (!Array.isArray(body)) {
  return { success: false, error: { status: 400, message: 'Invalid payload structure' } };
}

// 验证批次大小
if (body.length < MIN_BATCH_SIZE || body.length > MAX_BATCH_SIZE) {
  return { success: false, error: { status: 400, message: 'Batch size invalid' } };
}
```

### 3. 事件验证
```typescript
function validateEvents(events: unknown[]): {
  validEvents: ValidatedAnalyticsEvent[];
  rejectedCount: number;
} {
  const validEvents: ValidatedAnalyticsEvent[] = [];
  let rejectedCount = 0;

  for (const event of events) {
    const result = validateEventPayload(event);

    if (result.success && result.data) {
      validEvents.push(result.data);
    } else {
      rejectedCount++;
      // 记录验证失败但不暴露给客户端
      console.warn('[analytics-api] Event validation failed:', JSON.stringify(result.errors));
    }
  }

  return { validEvents, rejectedCount };
}
```

### 4. 安全考虑
```typescript
// 1. 负载大小验证
if (contentLength > MAX_PAYLOAD_SIZE) {
  return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
}

// 2. 清理错误消息
return NextResponse.json(
  { error: 'Invalid JSON format' },  // 通用消息，不泄露内部细节
  { status: 400 }
);

// 3. 记录被拒绝的事件
console.warn('[analytics-api] Event validation failed:', JSON.stringify(result.errors));

// 4. 不等待数据库插入
insertAnalyticsEvents(databaseEvents).catch(error => {
  console.error('[analytics-api] Failed to insert events:', error);
});
// 立即返回 202
```

---

## 🧪 测试验证

要运行测试套件：

```bash
npm test tests/analytics-api.test.ts
```

测试覆盖的场景：
- ✅ 有效事件接受
- ✅ 多个事件批量处理
- ✅ 部分接受策略
- ✅ 错误处理（各种错误情况）
- ✅ 事件验证（事件名、字段、错误码）
- ✅ 异步处理（立即返回）
- ✅ 边界情况（最大批次、全部无效）

---

## 📊 依赖关系

### 导入的模块
1. **next/server**
   - `NextRequest`: 请求对象
   - `NextResponse`: 响应对象

2. **lib/analytics/validation**
   - `validateEventPayload`: 验证完整事件负载
   - `validateEventName`: 验证事件名（通过 Zod schema 自动验证）
   - `AnalyticsEvent`: 验证后的事件类型
   - `ValidationResult`: 验证结果类型

3. **lib/analytics/repository**
   - `insertAnalyticsEvents`: 批量插入事件到数据库
   - `AnalyticsEvent`: 数据库事件类型

### 依赖流程
```
Frontend → API Route → Validation Module → Repository Module → Database
                     ↓
                  Logging
```

---

## 🎯 实现亮点

1. **异步处理**: 立即返回 202，不等待数据库插入
2. **部分接受**: 批次中有效事件仍会被处理
3. **安全优先**: 负载限制、错误清理、日志记录
4. **类型安全**: 完整的 TypeScript 类型定义
5. **详细文档**: API 文档和代码注释
6. **全面测试**: 覆盖所有边界情况

---

## ✅ 总结

Analytics API 模块已完整实现，所有验收标准均已满足：

- ✅ API 路由创建在正确路径
- ✅ POST 端点正确实现
- ✅ 集成 validation 模块进行验证
- ✅ 部分接受策略正确实现
- ✅ 响应格式正确
- ✅ 错误响应正确
- ✅ 安全考虑实现
- ✅ TypeScript 类型完整且准确
- ✅ 遵循 Next.js App Router API 路由最佳实践

**实现文件**:
- `app/api/analytics/route.ts` - API 路由实现
- `tests/analytics-api.test.ts` - 测试套件
- `docs/analytics-api.md` - API 文档
- `docs/analytics-api-acceptance.md` - 验收文档（本文件）
