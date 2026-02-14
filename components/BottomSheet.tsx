"use client";

import { useEffect, useRef, useCallback } from "react";
import styles from "./BottomSheet.module.css";

/**
 * BottomSheet Component Props
 * 
 * @interface BottomSheetProps
 */
export interface BottomSheetProps {
  /** Controls the visibility of the bottom sheet */
  open: boolean;
  /** Callback function when the sheet is closed */
  onClose: () => void;
  /** Title displayed in the header. Defaults to "Save Poster" */
  title?: string;
  /** Description/body text displayed in the content area. Defaults to long-press guidance */
  description?: string;
  /** Text for the confirm button. Defaults to "I got it" */
  confirmText?: string;
  /** Optional ref to the trigger element for focus management */
  triggerRef?: React.RefObject<HTMLElement | null>;
}

/**
 * Default values for optional props
 */
const DEFAULT_TITLE = "Save Poster";
const DEFAULT_DESCRIPTION =
  'Long press the poster image, then choose "Save Image".';
const DEFAULT_CONFIRM_TEXT = "I got it";

/**
 * BottomSheet Component
 * 
 * A mobile-optimized bottom sheet component that slides up from the bottom of the screen.
 * Designed for displaying guidance content, particularly for long-press interactions.
 * 
 * Features:
 * - Smooth slide-up animation from bottom
 * - Fade-in overlay
 * - Click overlay to close
 * - ESC key to close (desktop)
 * - Focus management for accessibility
 * - Responsive design (mobile-first)
 * 
 * @example
 * ```tsx
 * const [isOpen, setIsOpen] = useState(false);
 * const triggerRef = useRef<HTMLButtonElement>(null);
 * 
 * return (
 *   <>
 *     <button ref={triggerRef} onClick={() => setIsOpen(true)}>
 *       Open Sheet
 *     </button>
 *     <BottomSheet
 *       open={isOpen}
 *       onClose={() => setIsOpen(false)}
 *       title="Save Poster"
 *       description="Long press the poster image, then choose 'Save Image'."
 *       confirmText="I got it"
 *       triggerRef={triggerRef}
 *     />
 *   </>
 * );
 * ```
 */
export function BottomSheet({
  open,
  onClose,
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  confirmText = DEFAULT_CONFIRM_TEXT,
  triggerRef,
}: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);

  /**
   * Handle overlay click to close the sheet
   */
  const handleOverlayClick = useCallback(() => {
    onClose();
  }, [onClose]);

  /**
   * Handle ESC key press to close the sheet
   */
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  /**
   * Focus management: when sheet opens, focus the confirm button
   * When sheet closes, return focus to the trigger element
   */
  useEffect(() => {
    if (open) {
      // Store the currently focused element
      previouslyFocusedElementRef.current = document.activeElement as HTMLElement;

      // Focus the confirm button after a short delay to allow animation to start
      const timeoutId = setTimeout(() => {
        confirmButtonRef.current?.focus();
      }, 100);

      // Prevent body scroll when sheet is open
      document.body.style.overflow = "hidden";

      return () => {
        clearTimeout(timeoutId);
        document.body.style.overflow = "";
      };
    } else {
      // Return focus to the trigger element when sheet closes
      if (previouslyFocusedElementRef.current) {
        previouslyFocusedElementRef.current.focus();
      }
    }
  }, [open, triggerRef]);

  // Don't render if not open
  if (!open) {
    return null;
  }

  return (
    <div
      className={styles.overlay}
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDown}
      role="presentation"
      data-testid="bottom-sheet-overlay"
    >
      <div
        ref={sheetRef}
        className={styles.sheet}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bottom-sheet-title"
        aria-describedby="bottom-sheet-description"
        data-testid="bottom-sheet"
      >
        {/* Header */}
        <div className={styles.header}>
          <h2
            id="bottom-sheet-title"
            className={styles.title}
          >
            {title}
          </h2>
        </div>

        {/* Body */}
        <div className={styles.body}>
          <p
            id="bottom-sheet-description"
            className={styles.description}
          >
            {description}
          </p>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button
            ref={confirmButtonRef}
            onClick={onClose}
            className={styles.confirmButton}
            type="button"
            data-testid="bottom-sheet-confirm"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
