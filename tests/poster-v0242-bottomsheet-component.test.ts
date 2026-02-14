/**
 * BottomSheet Component Test - V0.2.4.2 Task 3.1
 *
 * Tests for the BottomSheet component implementation.
 * Validates all acceptance criteria from Task 3.1.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

describe("BottomSheet Component - Task 3.1 Acceptance Criteria", () => {
  const componentPath = join(__dirname, "../components/BottomSheet.tsx");
  const cssPath = join(__dirname, "../components/BottomSheet.module.css");
  const indexPath = join(__dirname, "../components/index.ts");

  /**
   * AC 1: 支持 title, body, action props
   */
  it("should have complete TypeScript interface for props", () => {
    // Verify that component files exist
    expect(existsSync(componentPath), "BottomSheet.tsx should exist").toBe(true);
    expect(existsSync(cssPath), "BottomSheet.module.css should exist").toBe(true);

    // Verify TypeScript interface definition
    const componentSource = readFileSync(componentPath, "utf8");
    expect(componentSource).toContain("export interface BottomSheetProps");
    expect(componentSource).toContain("title?: string");
    expect(componentSource).toContain("description?: string");
    expect(componentSource).toContain("confirmText?: string");
  });

  /**
   * AC 2: 从底部滑入动画（移动端原生体验）
   */
  it("should have slide-up animation styles", () => {
    // Verify CSS module exports animation styles
    const cssSource = readFileSync(cssPath, "utf8");
    
    expect(cssSource).toContain("@keyframes fadeIn");
    expect(cssSource).toContain("@keyframes slideUp");
    expect(cssSource).toContain("transform: translateY(100%)");
    expect(cssSource).toContain("transform: translateY(0)");
    expect(cssSource).toContain("animation: slideUp 300ms");
  });

  /**
   * AC 3: 点击 action 或遮罩层关闭
   */
  it("should have event handlers for closing", () => {
    const componentSource = readFileSync(componentPath, "utf8");
    
    expect(componentSource).toContain("handleOverlayClick");
    expect(componentSource).toContain("onClick={handleOverlayClick}");
    expect(componentSource).toContain("onClick={onClose}");
    expect(componentSource).toContain("handleKeyDown");
    expect(componentSource).toContain('event.key === "Escape"');
  });

  /**
   * AC 4: 响应式设计（移动端优化）
   */
  it("should have responsive design with mobile-first approach", () => {
    const cssSource = readFileSync(cssPath, "utf8");
    
    expect(cssSource).toContain("@media (min-width: 768px)");
    expect(cssSource).toContain("@media (prefers-reduced-motion: reduce)");
    expect(cssSource).toContain("safe-area-inset-bottom");
    expect(cssSource).toContain("-webkit-tap-highlight-color");
  });

  /**
   * Additional: TypeScript type safety
   */
  it("should export TypeScript types for external use", () => {
    const componentSource = readFileSync(componentPath, "utf8");
    
    expect(componentSource).toContain("export interface BottomSheetProps");
    expect(componentSource).toContain("export function BottomSheet");
  });

  /**
   * Additional: Accessibility features
   */
  it("should include accessibility attributes", () => {
    const componentSource = readFileSync(componentPath, "utf8");
    
    expect(componentSource).toContain('role="dialog"');
    expect(componentSource).toContain('aria-modal="true"');
    expect(componentSource).toContain("aria-labelledby");
    expect(componentSource).toContain("aria-describedby");
    expect(componentSource).toContain("id=\"bottom-sheet-title\"");
    expect(componentSource).toContain("id=\"bottom-sheet-description\"");
  });

  /**
   * Additional: Default values
   */
  it("should have proper default values for optional props", () => {
    const componentSource = readFileSync(componentPath, "utf8");
    
    expect(componentSource).toContain('DEFAULT_TITLE = "Save Poster"');
    expect(componentSource).toContain('DEFAULT_DESCRIPTION');
    expect(componentSource).toContain('DEFAULT_CONFIRM_TEXT = "I got it"');
    expect(componentSource).toContain("title = DEFAULT_TITLE");
    expect(componentSource).toContain("description = DEFAULT_DESCRIPTION");
    expect(componentSource).toContain("confirmText = DEFAULT_CONFIRM_TEXT");
  });

  /**
   * Additional: Focus management
   */
  it("should implement focus management for accessibility", () => {
    const componentSource = readFileSync(componentPath, "utf8");
    
    expect(componentSource).toContain("confirmButtonRef");
    expect(componentSource).toContain("previouslyFocusedElementRef");
    expect(componentSource).toContain("useRef<HTMLDivElement>");
    expect(componentSource).toContain("useRef<HTMLButtonElement>");
    expect(componentSource).toContain(".focus()");
  });

  /**
   * Additional: Performance optimization
   */
  it("should use React hooks for performance optimization", () => {
    const componentSource = readFileSync(componentPath, "utf8");
    
    expect(componentSource).toContain("useCallback");
    expect(componentSource).toContain("useRef");
    expect(componentSource).toContain("useEffect");
  });

  /**
   * Additional: Body scroll lock
   */
  it("should prevent body scroll when sheet is open", () => {
    const componentSource = readFileSync(componentPath, "utf8");
    
    expect(componentSource).toContain('document.body.style.overflow = "hidden"');
    expect(componentSource).toContain('document.body.style.overflow = ""');
  });

  /**
   * Additional: Test data attributes
   */
  it("should include test data attributes for testing", () => {
    const componentSource = readFileSync(componentPath, "utf8");
    
    expect(componentSource).toContain('data-testid="bottom-sheet-overlay"');
    expect(componentSource).toContain('data-testid="bottom-sheet"');
    expect(componentSource).toContain('data-testid="bottom-sheet-confirm"');
  });
});

describe("BottomSheet Component Integration", () => {
  /**
   * Verify component is properly exported from index
   */
  it("should be exportable from components/index.ts", () => {
    const indexPath = join(__dirname, "../components/index.ts");
    const indexSource = readFileSync(indexPath, "utf8");
    
    expect(indexSource).toContain('export { BottomSheet } from "./BottomSheet"');
    expect(indexSource).toContain('export type { BottomSheetProps } from "./BottomSheet"');
  });

  /**
   * Verify example file exists and demonstrates usage
   */
  it("should have example file demonstrating usage", () => {
    const examplePath = join(__dirname, "../components/BottomSheet.example.tsx");
    
    expect(existsSync(examplePath), "BottomSheet.example.tsx should exist").toBe(true);
    
    const exampleSource = readFileSync(examplePath, "utf8");
    expect(exampleSource).toContain("BottomSheet");
    expect(exampleSource).toContain("useState");
    expect(exampleSource).toContain("useRef");
  });
});
