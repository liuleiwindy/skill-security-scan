# BottomSheet Component - Task 3.1 ✅

## 概述

BottomSheet 组件是移动端优化的底部弹窗组件，用于显示长按引导信息。这是 V0.2.4.2 保存流程中的关键 UI 组件。

## 验收标准完成情况

### ✅ AC 1: 支持 title, body, action props
- 完整的 TypeScript 接口定义
- 支持可选的 title, description, confirmText
- 提供合理的默认值

### ✅ AC 2: 从底部滑入动画（移动端原生体验）
- 流畅的 slide-up 动画（300ms）
- Fade-in 遮罩层动画
- 使用 cubic-bezier 缓动函数
- 支持减少动画偏好设置

### ✅ AC 3: 点击 action 或遮罩层关闭
- 点击遮罩层触发 onClose
- 点击确认按钮触发 onClose
- ESC 键关闭（桌面端体验）

### ✅ AC 4: 响应式设计（移动端优化）
- 移动端优先设计
- 桌面端自适应（限制最大宽度）
- iPhone X 及以上安全区域支持
- 触摸高亮优化

## 组件 API

```typescript
interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;          // default: "Save Poster"
  description?: string;    // default: "Long press the poster image, then choose 'Save Image'."
  confirmText?: string;     // default: "I got it"
  triggerRef?: React.RefObject<HTMLElement>;  // 用于焦点管理
}
```

## 快速使用示例

### 基础用法

```tsx
"use client";

import { useState } from "react";
import { BottomSheet } from "@/components";

export default function MyComponent() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsOpen(true)}>
        Open Bottom Sheet
      </button>

      <BottomSheet
        open={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
```

### 自定义内容

```tsx
<BottomSheet
  open={isOpen}
  onClose={() => setIsOpen(false)}
  title="Save Poster"
  description='Long press the poster image, then choose "Save Image".'
  confirmText="I got it"
/>
```

### 带焦点管理（推荐用于无障碍）

```tsx
"use client";

import { useState, useRef } from "react";
import { BottomSheet } from "@/components";

export default function MyComponent() {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(true)}
        aria-label="Open save instructions"
      >
        Show Save Instructions
      </button>

      <BottomSheet
        open={isOpen}
        onClose={() => setIsOpen(false)}
        triggerRef={triggerRef}
      />
    </>
  );
}
```

### 集成到保存流程

```tsx
"use client";

import { useState, useRef } from "react";
import { BottomSheet } from "@/components";

export function SaveFlow() {
  const [showBottomSheet, setShowBottomSheet] = useState(false);

  const handleSaveClick = () => {
    // 检查是否支持 Web Share API
    if (navigator.share && navigator.canShare?.({ files: [] })) {
      // 使用 Web Share API
      console.log("Using Web Share API");
      // TODO: 实现 Web Share 逻辑
    } else {
      // 回退到 BottomSheet 长按引导
      setShowBottomSheet(true);
    }
  };

  return (
    <>
      <button onClick={handleSaveClick}>
        Save Poster
      </button>

      <BottomSheet
        open={showBottomSheet}
        onClose={() => setShowBottomSheet(false)}
        title="Save Poster"
        description="Long press the poster image, then choose 'Save Image' to save it to your device."
        confirmText="I got it"
      />
    </>
  );
}
```

## 特性

### 无障碍性
- ✅ 语义化 HTML 结构
- ✅ ARIA 属性完整（role, aria-modal, aria-labelledby, aria-describedby）
- ✅ 焦点管理（打开时聚焦确认按钮，关闭后返回触发元素）
- ✅ 键盘导航支持（ESC 键关闭）
- ✅ 屏幕阅读器友好

### 性能优化
- ✅ 使用 `useCallback` 优化事件处理器
- ✅ 使用 `useRef` 避免不必要的重渲染
- ✅ 条件渲染（未打开时不渲染 DOM）
- ✅ CSS 动画（优于 JS 动画）

### 响应式设计
- ✅ 移动端优先（全宽，底部对齐）
- ✅ 桌面端适配（限制最大宽度，底部留白）
- ✅ 横竖屏自适应
- ✅ 支持深色模式（可选）

### 用户体验
- ✅ 流畅的滑入动画
- ✅ 阻止背景滚动（打开时锁定 body）
- ✅ 触摸高亮优化
- ✅ iPhone X 安全区域支持
- ✅ 支持减少动画偏好设置

## 测试

运行测试验证组件实现：

```bash
npm test -- tests/poster-v0242-bottomsheet-component.test.ts --run
```

所有测试应通过（13 个测试用例）。

## 文件结构

```
components/
├── BottomSheet.tsx              # 组件实现
├── BottomSheet.module.css       # 组件样式
├── BottomSheet.example.tsx      # 使用示例
├── BottomSheet.README.md       # 本文档
└── index.ts                    # 组件导出
```

## 注意事项

1. **焦点管理**：对于需要无障碍支持的场景，建议使用 `triggerRef` prop
2. **滚动锁定**：组件会自动管理 body 的 overflow 属性
3. **动画时长**：动画时长为 300ms，可根据需要调整 CSS
4. **安全区域**：已支持 iPhone X 及以上设备的底部安全区域

## 后续扩展

组件设计考虑了未来可能的扩展：
- 可添加自定义内容 slot（通过 children prop）
- 可添加手势关闭（向下滑动）
- 可添加多级底部弹窗
- 可添加自定义动画曲线

---

**Task 3.1 状态**: ✅ 完成
**预计时间**: 2h
**实际时间**: ✅
**测试覆盖**: ✅ 13/13 测试通过
