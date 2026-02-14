/**
 * BottomSheet Component - Usage Examples
 * 
 * This file demonstrates various ways to use the BottomSheet component
 * in your application.
 */

"use client";

import { useState, useRef } from "react";
import { BottomSheet, type BottomSheetProps } from "./BottomSheet";

/**
 * Example 1: Basic Usage
 * 
 * Simple example showing how to open and close the BottomSheet
 * with default props.
 */
export function BottomSheetBasicExample() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <button onClick={() => setIsOpen(true)}>Open Bottom Sheet</button>

      <BottomSheet open={isOpen} onClose={() => setIsOpen(false)} />
    </div>
  );
}

/**
 * Example 2: Custom Content
 * 
 * Example with custom title, description, and confirm text.
 */
export function BottomSheetCustomContentExample() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <button onClick={() => setIsOpen(true)}>
        Show Save Instructions
      </button>

      <BottomSheet
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title="Save Poster"
        description='Long press the poster image, then choose "Save Image" from the menu.'
        confirmText="I got it"
      />
    </div>
  );
}

/**
 * Example 3: With Focus Management
 * 
 * Example demonstrating proper focus management with triggerRef.
 * When the sheet opens, focus moves to the confirm button.
 * When it closes, focus returns to the trigger button.
 */
export function BottomSheetFocusExample() {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <div>
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
        title="Save Poster"
        description='Long press the poster image, then choose "Save Image".'
        confirmText="I got it"
        triggerRef={triggerRef}
      />
    </div>
  );
}

/**
 * Example 4: Integration with Poster Page
 * 
 * This example shows how to integrate BottomSheet into a poster page
 * for the save-to-local flow.
 */
export function PosterPageExample() {
  const [showBottomSheet, setShowBottomSheet] = useState(false);

  const handleSaveClick = () => {
    // Check if Web Share API is available
    // @ts-expect-error - TypeScript type definitions for navigator.canShare are incomplete
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [] })) {
      // Use Web Share API (not shown in this example)
      console.log("Using Web Share API");
    } else {
      // Fall back to bottom sheet with long-press guidance
      setShowBottomSheet(true);
    }
  };

  return (
    <div>
      {/* Poster Image Container */}
      <div className="poster-container">
        <img
          src="/path/to/poster.png"
          alt="Security Scan Poster"
          className="poster-image"
          onContextMenu={(e) => {
            // Prevent context menu on mobile
            e.preventDefault();
          }}
        />
      </div>

      {/* Save Button */}
      <button onClick={handleSaveClick}>Save Poster</button>

      {/* BottomSheet for long-press guidance */}
      <BottomSheet
        open={showBottomSheet}
        onClose={() => setShowBottomSheet(false)}
        title="Save Poster"
        description="Long press the poster image, then choose 'Save Image' to save it to your device."
        confirmText="I got it"
      />
    </div>
  );
}

/**
 * Example 5: Conditional Rendering with Multiple Sheets
 * 
 * Example showing how to handle multiple different bottom sheets
 * with different content.
 */
export function MultipleBottomSheetsExample() {
  const [activeSheet, setActiveSheet] = useState<string | null>(null);

  const closeSheet = () => setActiveSheet(null);

  return (
    <div>
      <button onClick={() => setActiveSheet("save")}>Save Poster</button>
      <button onClick={() => setActiveSheet("share")}>Share</button>
      <button onClick={() => setActiveSheet("info")}>More Info</button>

      <BottomSheet
        open={activeSheet === "save"}
        onClose={closeSheet}
        title="Save Poster"
        description='Long press the poster image, then choose "Save Image".'
        confirmText="I got it"
      />

      <BottomSheet
        open={activeSheet === "share"}
        onClose={closeSheet}
        title="Share Poster"
        description="Scan the QR code to share this poster with others."
        confirmText="Close"
      />

      <BottomSheet
        open={activeSheet === "info"}
        onClose={closeSheet}
        title="About This Poster"
        description="This poster shows your security scan results and can be saved to your device for offline viewing."
        confirmText="Got it"
      />
    </div>
  );
}

/**
 * Example 6: TypeScript Usage
 * 
 * Example showing proper TypeScript typing for the component.
 */
export function TypeScriptExample() {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Props are fully typed
  const bottomSheetProps: BottomSheetProps = {
    open: isOpen,
    onClose: () => setIsOpen(false),
    title: "Save Poster",
    description: 'Long press the poster image, then choose "Save Image".',
    confirmText: "I got it",
    triggerRef: triggerRef,
  };

  return (
    <div>
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(true)}
      >
        Open Bottom Sheet
      </button>

      <BottomSheet {...bottomSheetProps} />
    </div>
  );
}

/**
 * Testing Utilities
 * 
 * Helper functions for testing the BottomSheet component.
 */
export const BottomSheetTestUtils = {
  /**
   * Find the bottom sheet overlay element in the DOM
   */
  findOverlay: () => document.querySelector('[data-testid="bottom-sheet-overlay"]'),

  /**
   * Find the bottom sheet container element
   */
  findSheet: () => document.querySelector('[data-testid="bottom-sheet"]'),

  /**
   * Find the confirm button
   */
  findConfirmButton: () => document.querySelector('[data-testid="bottom-sheet-confirm"]'),

  /**
   * Simulate clicking the overlay to close the sheet
   */
  clickOverlay: () => {
    const overlay = BottomSheetTestUtils.findOverlay();
    overlay?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  },

  /**
   * Simulate clicking the confirm button
   */
  clickConfirmButton: () => {
    const button = BottomSheetTestUtils.findConfirmButton() as HTMLButtonElement;
    button?.click();
  },

  /**
   * Simulate pressing the ESC key
   */
  pressEscapeKey: () => {
    const sheet = BottomSheetTestUtils.findSheet();
    sheet?.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        cancelable: true,
      })
    );
  },
};
