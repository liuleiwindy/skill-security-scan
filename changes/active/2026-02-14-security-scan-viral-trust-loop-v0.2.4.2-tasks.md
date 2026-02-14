# V0.2.4.2 开发任务分解清单
# Security Scan Viral Trust Loop - Poster Page + Save Flow

**总览**：
- 预计总任务数：24 个
- 依赖 V0.2.4.1（已完成）
- 目标版本：v0.2.4.2
- 目标环境：Vercel Preview + Mobile 4G

---

## Phase 1: 页面基础设施（优先级：P0）

### Task 1.1: 创建 `/scan/poster/[id]` 路由结构

**文件**：`app/scan/poster/[id]/page.tsx`

**验收标准**：
- [ ] 页面路由可访问 `/scan/poster/test-id`
- [ ] 服务端渲染返回基础 HTML shell
- [ ] 页面包含基本的 SEO metadata（title, description）
- [ ] 响应式布局适配 mobile/desktop

**依赖**：无
**预计时间**：1h

---

### Task 1.2: 创建 PosterImage 组件（LQIP + 主图）

**文件**：`components/PosterImage.tsx`

**验收标准**：
- [ ] 组件接收 `scanId` 作为 props
- [ ] 初始渲染显示 placeholder（687:1024 aspect ratio）
- [ ] Placeholder 应用 8px blur 效果
- [ ] 从 `/api/scan/:scanId/poster/image` 加载高清图
- [ ] 高清图加载成功后替换 placeholder（无 layout shift）
- [ ] 支持 `onLoad` 和 `onError` 回调

**依赖**：无
**预计时间**：2h

---

### Task 1.3: 实现图片加载错误状态

**文件**：`components/PosterImage.tsx` + `components/ErrorState.tsx`

**验收标准**：
- [ ] 图片加载失败时显示 fallback messaging
- [ ] 提供 "Retry Loading Poster" 按钮
- [ ] Retry 点击重新请求图片 endpoint
- [ ] 失败状态保持 placeholder 可见

**错误场景覆盖**：
- [ ] 404: 显示 "Poster not found" + "Back to Scan" 链接
- [ ] 500/502/503/504: 显示 "Poster generation is temporarily unavailable"
- [ ] network timeout/failure: 显示 "Network issue while loading poster"

**依赖**：Task 1.2
**预计时间**：1.5h

---

### Task 1.4: 实现超时检测机制

**文件**：`components/PosterImage.tsx`

**验收标准**：
- [ ] 图片请求启动 8s 超时检测
- [ ] 超时后显示 retry CTA（保持 placeholder）
- [ ] 开发环境 console.log 超时事件
- [ ] Production 错误上报预留（v0.2.4.4）

**依赖**：Task 1.3
**预计时间**：1h

---

## Phase 2: 保存交互 - 桌面端（优先级：P0）

### Task 2.1: 创建 SaveButton 组件基础结构

**文件**：`components/SaveButton.tsx`

**验收标准**：
- [ ] 组件接收 `scanId` 和 `onSaveSuccess/onSaveFailure` callbacks
- [ ] 支持三种状态：`idle | saving | saved`
- [ ] 按钮文本对应状态：
  - idle: "Save Poster"
  - saving: "Saving..."
  - saved: "Saved" (1.2s 后恢复 idle)

**依赖**：无
**预计时间**：1h

---

### Task 2.2: 实现桌面端 blob 下载逻辑

**文件**：`components/SaveButton.tsx` + `utils/download.ts`

**验收标准**：
- [ ] 检测桌面环境（基于 User Agent 或 feature detection）
- [ ] 从 `/api/scan/:scanId/poster/image` 获取图片 blob
- [ ] 文件名格式化：
  - lowercase
  - 非字母数字替换为 `-`
  - 最大 32 字符
  - 格式：`scan-{id}-poster.png`
- [ ] 创建 `<a>` 元素触发下载（download attribute）
- [ ] 成功后触发 `onSaveSuccess` 回调

**测试用例**：
- [ ] 输入："Test-Scan_ID_123" → 输出："test-scan-id-123-poster.png"
- [ ] 输入："Special!@#Chars" → 输出："special-chars-poster.png"
- [ ] 输入（>32 字符）："a".repeat(40) → 输出（32 字符限制）

**依赖**：Task 2.1
**预计时间**：2h

---

### Task 2.3: 实现桌面端保存失败处理

**文件**：`components/SaveButton.tsx`

**验收标准**：
- [ ] 保存失败显示错误信息："Save failed. Try again, or long press image to save."
- [ ] 失败后保持按钮可用（允许重试）
- [ ] 触发 `onSaveFailure` 回调
- [ ] 开发环境 console.log 错误详情

**失败场景**：
- [ ] 网络请求失败
- [ ] Blob 转换失败
- [ ] 浏览器不支持 blob 下载（edge case）

**依赖**：Task 2.2
**预计时间**：1h

---

### Task 2.4: 浏览器兼容性验证

**文件**：`components/SaveButton.tsx` + `utils/browser-detect.ts`

**验收标准**：
- [ ] 支持最新 2 个主版本的 Chrome
- [ ] 支持最新 2 个主版本的 Safari
- [ ] 支持最新 2 个主版本的 Firefox
- [ ] 支持最新 2 个主版本的 Edge
- [ ] 不支持的浏览器显示降级提示或禁用按钮

**测试环境**：
- [ ] Chrome 120+ (Latest 2 major)
- [ ] Safari 17+ (Latest 2 major)
- [ ] Firefox 121+ (Latest 2 major)
- [ ] Edge 120+ (Latest 2 major)

**依赖**：Task 2.3
**预计时间**：1.5h

---

## Phase 3: 保存交互 - 移动端（优先级：P0）

### Task 3.1: 创建 BottomSheet 组件

**文件**：`components/BottomSheet.tsx`

**验收标准**：
- [ ] 支持 title, body, action props
- [ ] 从底部滑入动画（移动端原生体验）
- [ ] 点击 action 或遮罩层关闭
- [ ] 响应式设计（移动端优化）

**依赖**：无
**预计时间**：2h

---

### Task 3.2: 实现 Web Share API 集成

**文件**：`components/SaveButton.tsx` + `utils/mobile-share.ts`

**验收标准**：
- [ ] 检测 `navigator.share` 可用性（包括 file support）
- [ ] 获取图片 blob 并创建 File 对象
- [ ] 调用 `navigator.share({ files: [file] })`
- [ ] 成功后触发 `onSaveSuccess` 回调
- [ ] 支持 Android Chrome 和 iOS Safari（如支持）

**错误处理**：
- [ ] `AbortError`（用户取消）：静默关闭，不显示错误 UI
- [ ] `NotAllowedError` / `TypeError` / unknown：显示 fallback bottom-sheet

**依赖**：Task 2.1
**预计时间**：2h

---

### Task 3.3: 实现移动端 Fallback BottomSheet

**文件**：`components/SaveButton.tsx` + 使用 Task 3.1 的 BottomSheet

**验收标准**：
- [ ] Web Share 失败后显示 bottom-sheet
- [ ] Title: "Save Poster"
- [ ] Body: "Long press the poster image, then choose 'Save Image'."
- [ ] Action: "I got it"
- [ ] 点击 action 关闭 sheet

**兼容性策略**：
- [ ] iOS Safari：检测到 Web Share file 不可用时直接显示 fallback
- [ ] Android Chrome：尝试 Web Share，失败后显示 fallback

**依赖**：Task 3.1, Task 3.2
**预计时间**：1.5h

---

### Task 3.4: 移动端保存失败处理

**文件**：`components/SaveButton.tsx`

**验收标准**：
- [ ] 保存失败显示错误信息："Save failed. Try again, or long press image to save."
- [ ] 显示 fallback bottom-sheet 提供长按指导
- [ ] 失败后保持按钮可用（允许重试）
- [ ] 触发 `onSaveFailure` 回调
- [ ] 开发环境 console.log 错误详情

**依赖**：Task 3.3
**预计时间**：1h

---

## Phase 4: 页面集成（优先级：P0）

### Task 4.1: 集成 PosterImage 到页面

**文件**：`app/scan/poster/[id]/page.tsx`

**验收标准**：
- [ ] 页面渲染 PosterImage 组件（传入 scanId）
- [ ] 页面布局适配移动端（竖屏优化）
- [ ] 页面布局适配桌面端（居中显示，最大宽度限制）
- [ ] 添加 "Open Report" 返回按钮（链接到 `/scan/report/[id]`）

**依赖**：Task 1.4
**预计时间**：1h

---

### Task 4.2: 集成 SaveButton 到页面

**文件**：`app/scan/poster/[id]/page.tsx`

**验收标准**：
- [ ] 页面渲染 SaveButton 组件（传入 scanId）
- [ ] 桌面端：按钮显示在海报操作区域（与 "Open Report" 同级）
- [ ] 移动端：按钮固定在底部或优化触控区域
- [ ] 按钮位置不影响海报图片的可见性

**依赖**：Task 2.4, Task 3.4
**预计时间**：1.5h

---

### Task 4.3: QR 交接验证

**文件**：验证任务（代码实现已在 V0.2.4.1 完成）

**验收标准**：
- [ ] 确认海报图片中的 QR 码解码为 `/scan/report/[id]`
- [ ] QR 不指向海报页面（避免死循环）
- [ ] 使用测试 fixtures 验证 QR 解码正确性

**验证方法**：
- [ ] 使用 `scan_fixture_v0240_b69` 生成海报
- [ ] 扫描 QR 确认跳转到 `/scan/report/scan_fixture_v0240_b69`
- [ ] 重复验证其他 fixtures

**依赖**：Task 4.2
**预计时间**：0.5h

---

## Phase 5: 测试和验证（优先级：P0）

### Task 5.1: 准备测试 Fixtures

**文件**：`tests/fixtures/poster-fixtures.ts` 或类似

**验收标准**：
- [ ] 定义以下测试 IDs：
  - `scan_fixture_v0240_b69`（B grade baseline）
  - `scan_fixture_v0240_a90`（A grade high score）
  - `scan_edge_d0`（D grade edge）
  - `scan_not_found_case`（404 case）
- [ ] 确认每个 fixture ID 对应的 scan 数据存在
- [ ] 编写 fixture 验证脚本（检查 QR 解码、图片加载）

**依赖**：无（但需要后端数据支持）
**预计时间**：1h

---

### Task 5.2: 编写页面集成测试

**文件**：`app/scan/poster/__tests__/page-integration.test.tsx`

**验收标准**：
- [ ] 测试 `/scan/poster/[id]` 显示 placeholder
- [ ] 测试 placeholder 后显示完整海报图片
- [ ] 测试无效 `id` 处理（404 场景）
- [ ] 测试网络错误处理（5xx 场景）
- [ ] 测试超时行为（8s timeout）

**依赖**：Task 4.3
**预计时间**：2h

---

### Task 5.3: 编写保存流程测试

**文件**：`components/__tests__/SaveButton.test.tsx`

**验收标准**：
- [ ] 测试桌面端 blob 下载成功路径
- [ ] 测试桌面端下载失败路径
- [ ] 测试移动端 Web Share 成功路径
- [ ] 测试移动端 Web Share 失败 + fallback 路径
- [ ] 测试按钮状态转换（idle → saving → saved）
- [ ] 测试错误类型处理（AbortError, NotAllowedError, TypeError）

**依赖**：Task 3.4
**预计时间**：2.5h

---

### Task 5.4: 编写 Placeholder 和超时测试

**文件**：`components/__tests__/PosterImage.test.tsx`

**验收标准**：
- [ ] 测试 placeholder 尺寸（687:1024）
- [ ] 测试 placeholder blur 效果（8px）
- [ ] 测试高清图加载成功后无 layout shift
- [ ] 测试超时后显示 retry CTA
- [ ] 测试 retry 后重新加载图片

**依赖**：Task 1.4
**预计时间**：1.5h

---

### Task 5.5: 执行手动测试 Checklist

**文件**：`docs/manual-test-checklist.md`

**验收标准**：
- [ ] Mobile iOS Safari 测试
  - [ ] 打开 `/scan/poster/[id]`，验证 placeholder 首屏
  - [ ] 点击 "Save Poster"，验证分享可用或长按引导
- [ ] Mobile Android Chrome 测试
  - [ ] 验证 Web Share 路径
  - [ ] 验证 fallback 路径
- [ ] Desktop 浏览器测试
  - [ ] Chrome: 验证下载文件名和文件完整性
  - [ ] Safari: 验证下载文件名和文件完整性
  - [ ] Firefox: 验证下载文件名和文件完整性
  - [ ] Edge: 验证下载文件名和文件完整性
- [ ] 错误路径测试
  - [ ] 模拟 404：验证错误信息和返回链接
  - [ ] 模拟 500：验证错误信息和 retry CTA
  - [ ] 模拟离线：验证错误信息和 retry CTA
- [ ] QR 交接测试
  - [ ] 扫描海报 QR，确认 landing page 是 `/scan/report/[id]`

**依赖**：Task 5.4
**预计时间**：2h（人工测试）

---

### Task 5.6: 性能预算验证

**文件**：`tests/performance/poster-page-perf.test.ts` + Lighthouse CI

**验收标准**：
- [ ] Vercel Preview 环境部署
- [ ] 使用 4G throttling 模拟移动网络
- [ ] P50 图片加载时间 < 3.0s
- [ ] P95 图片加载时间 < 5.0s
- [ ] P75 FCP < 1.8s（placeholder/shell 可见）
- [ ] Placeholder 在 300ms 内出现
- [ ] 8s 超时后显示 retry CTA（如未加载完成）

**工具**：
- [ ] Lighthouse CI
- [ ] WebPageTest
- [ ] 或 Chrome DevTools Performance

**依赖**：Task 4.3
**预计时间**：2h

---

### Task 5.7: 回归测试

**文件**：`tests/regression/v0242-regression.test.ts`

**验收标准**：
- [ ] 海报页面链接回 `/scan/report/[id]`
- [ ] 海报页面路由不接受 query override 参数
- [ ] QR 解码目标始终是 `/scan/report/[id]`（非海报页面）
- [ ] V0.2.4.1 API 端点未被破坏

**依赖**：Task 5.6
**预计时间**：1h

---

## Phase 6: 部署和发布准备（优先级：P1）

### Task 6.1: Preview 环境验证

**文件**：Vercel Preview Deployment

**验收标准**：
- [ ] V0.2.4.2 代码部署到 Preview 环境
- [ ] 访问 `/scan/poster/scan_fixture_v0240_b69` 成功加载海报
- [ ] 执行 Task 5.5 手动测试 checklist（Preview 环境）
- [ ] 执行 Task 5.6 性能预算验证（Preview 环境）
- [ ] 所有测试通过

**依赖**：Task 5.7
**预计时间**：1.5h

---

### Task 6.2: 文档更新

**文件**：`CHANGELOG.md`, `README.md`（如需要）

**验收标准**：
- [ ] 更新 CHANGELOG 记录 V0.2.4.2 变更
- [ ] 文档说明新的 `/scan/poster/[id]` 路由
- [ ] 文档说明保存功能的使用方法
- [ ] 文档说明已知的浏览器兼容性限制

**依赖**：Task 6.1
**预计时间**：0.5h

---

### Task 6.3: 代码审查和修复

**文件**：所有 Phase 1-5 代码

**验收标准**：
- [ ] 代码审查完成（至少 1 reviewer）
- [ ] 审查意见修复完成
- [ ] Lint 检查通过（`npm run lint`）
- [ ] 类型检查通过（TypeScript）
- [ ] 所有测试通过（`npm test`）
- [ ] 构建成功（`npm run build`）

**依赖**：Task 6.2
**预计时间**：2h（包括修复时间）

---

## 任务依赖图

```
Phase 1: 页面基础设施
├─ Task 1.1 (page route)
├─ Task 1.2 (PosterImage) ──┐
├─ Task 1.3 (ErrorState) ───┤
└─ Task 1.4 (Timeout) ──────┴──> Task 4.1 (page integration)

Phase 2: 桌面端保存
├─ Task 2.1 (SaveButton base)
├─ Task 2.2 (blob download) ──┐
├─ Task 2.3 (desktop failure) ─┤
└─ Task 2.4 (browser compat) ──┴──> Task 4.2 (SaveButton integration)

Phase 3: 移动端保存
├─ Task 3.1 (BottomSheet) ──┐
├─ Task 3.2 (Web Share) ─────┤
├─ Task 3.3 (mobile fallback) ┼──> Task 4.2 (SaveButton integration)
└─ Task 3.4 (mobile failure) ─┘

Phase 4: 页面集成
├─ Task 4.1 (PosterImage integration)
├─ Task 4.2 (SaveButton integration)
└─ Task 4.3 (QR handoff verification)

Phase 5: 测试和验证
├─ Task 5.1 (fixtures) ──┐
├─ Task 5.2 (page integration tests)
├─ Task 5.3 (save flow tests)
├─ Task 5.4 (placeholder tests)
├─ Task 5.5 (manual checklist)
├─ Task 5.6 (performance validation)
└─ Task 5.7 (regression tests)

Phase 6: 部署和发布
├─ Task 6.1 (preview validation)
├─ Task 6.2 (documentation)
└─ Task 6.3 (code review & fixes)
```

---

## 总时间估算

| Phase | 任务数 | 预计时间 |
|-------|--------|----------|
| Phase 1: 页面基础设施 | 4 | 5.5h |
| Phase 2: 桌面端保存 | 4 | 5.5h |
| Phase 3: 移动端保存 | 4 | 6.5h |
| Phase 4: 页面集成 | 3 | 3h |
| Phase 5: 测试和验证 | 7 | 11.5h |
| Phase 6: 部署和发布 | 3 | 4h |
| **总计** | **25** | **36h** |

**注**：
- 时间估算基于熟练开发人员
- 实际时间可能因调试、意外问题而增加 20-40%
- 建议预留 40-50h 的开发时间

---

## 并行开发建议

可以并行开发的任务组：

### **并行组 1**（无相互依赖）
- Task 1.1 (page route)
- Task 2.1 (SaveButton base)
- Task 3.1 (BottomSheet)
- Task 5.1 (fixtures)

### **并行组 2**（依赖组 1）
- Task 1.2 (PosterImage)
- Task 3.2 (Web Share)

### **并行组 3**（依赖组 2）
- Task 1.3 (ErrorState) + Task 1.4 (Timeout)
- Task 2.2 (blob download)
- Task 3.3 (mobile fallback)

### **并行组 4**（依赖组 3）
- Task 5.2 (page integration tests)
- Task 5.4 (placeholder tests)

---

## 风险和缓解措施

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| Web Share API 兼容性问题 | 移动端保存失败 | 提前在多个设备测试，准备好 fallback |
| Placeholder layout shift | 用户体验差 | 严格 aspect ratio 控制，layout test 验证 |
| 性能预算未达标 | 发布延期 | 提前测试，准备图片优化方案 |
| 测试 fixtures 数据缺失 | 测试阻塞 | 与后端确认 fixtures 准备时间 |
| 浏览器兼容性问题 | 部分用户无法使用 | 逐步降级策略，兼容性检测提示 |

---

## 完成标准

V0.2.4.2 完成的标准：

1. ✅ 所有 P0 任务完成（Phase 1-5）
2. ✅ 所有自动化测试通过（`npm test`）
3. ✅ 构建成功（`npm run build`）
4. ✅ Preview 环境验证通过（Task 6.1）
5. ✅ 手动测试 checklist 全部通过（Task 5.5）
6. ✅ 性能预算全部达标（Task 5.6）
7. ✅ 代码审查通过（Task 6.3）

**满足以上条件后，可以进入 V0.2.4.3 或发布流程。**
