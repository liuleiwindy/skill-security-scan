"use client";

import React from "react";
import { useState, useRef } from "react";
import {
  canShareFiles,
  shareFile,
  getErrorType,
  isMobileDevice,
  isIOSSafari,
} from "@/lib/mobile-share";
import {
  fetchImageAsFile,
  sanitizeFileName,
  isDesktopEnvironment,
  getBrowserInfo,
  downloadPosterForDesktop
} from "@/lib/download";
import { BottomSheet } from "./BottomSheet";
import styles from "./SaveButton.module.css";

/**
 * Button state type for SaveButton component
 * 
 * @remarks
 * Exported for use in parent components that need to track save state
 */
export type ButtonState = 'idle' | 'saving' | 'saved' | 'failed';

/**
 * Props interface for SaveButton component
 * 
 * @param scanId - The scan ID associated with poster being saved
 * @param imageUrl - Optional direct URL to poster image
 * @param onSaveSuccess - Optional callback invoked when save operation succeeds
 * @param onSaveFailure - Optional callback invoked when save operation fails
 * @param onFallbackShow - Optional callback invoked when fallback UI should be shown (for backward compatibility)
 */
export interface SaveButtonProps {
  scanId: string;
  imageUrl?: string;
  onSaveSuccess?: () => void;
  onSaveFailure?: () => void;
  onFallbackShow?: () => void;
}

/**
 * Button text mapping based on state
 * 
 * @param state - Current button state
 * @returns Text to display on the button
 */
const getButtonText = (state: ButtonState): string => {
  switch (state) {
    case 'idle':
      return 'Save Poster';
    case 'saving':
      return 'Saving...';
    case 'saved':
      return 'Saved';
    case 'failed':
      return 'Save Poster';
    default:
      return 'Save Poster';
  }
};

/**
 * SaveButton Component
 * 
 * A button component that manages save operation state for saving poster images.
 * 
 * @remarks
 * This component implements Task 3.2 and 3.3: Web Share API integration + BottomSheet fallback. It handles:
 * - State management (idle | saving | saved | failed)
 * - Mobile-first save experience with Web Share API
 * - Platform detection (iOS Safari, Android Chrome, Desktop)
 * - Error handling with proper fallback triggering
 * - Internal BottomSheet for fallback UI
 * - State transitions with timing (saved state reverts to idle after 1.2s)
 * 
 * Save flow behavior:
 * 1. Mobile devices with Web Share API support:
 *    - Fetch image as blob and convert to File
 *    - Use navigator.share({ files: [file] })
 *    - Handle AbortError (user cancel) silently
 *    - Handle NotAllowedError/TypeError by showing fallback BottomSheet
 * 2. iOS Safari without Web Share file support:
 *    - Immediately trigger fallback BottomSheet (long-press guidance)
 * 3. Android Chrome:
 *    - Try Web Share API, fallback to BottomSheet on error
 * 4. Desktop:
 *    - Use blob download with sanitized filename
 * 
 * @example
 * ```tsx
 * <SaveButton
 *   scanId="abc123"
 *   imageUrl="/api/scan/abc123/poster/image"
 *   onSaveSuccess={() => console.log('Saved successfully')}
 *   onSaveFailure={() => console.log('Save failed')}
 * />
 * ```
 */
export function SaveButton({ 
  scanId,
  imageUrl,
  onSaveSuccess, 
  onSaveFailure,
  onFallbackShow,
}: SaveButtonProps) {
  const [state, setState] = useState<ButtonState>('idle');
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const browserInfo = getBrowserInfo();

  /**
   * Handle button click
   * 
   * Initiates save operation with platform-specific behavior:
   * - Detects mobile/desktop environment
   * - Attempts Web Share API on supported devices
   * - Handles errors appropriately (silent on cancel, fallback on failure)
   * - Triggers success/failure callbacks
   * - Manages state transitions
   */
  const handleClick = async () => {
    // Prevent clicks during saving or saved state
    if (state === 'saving' || state === 'saved') return;

    // If failed, reset to idle and allow retry
    if (state === 'failed') {
      setState('idle');
      return;
    }

    // Start save operation
    setState('saving');

    // Determine poster URL and file name
    const posterUrl = imageUrl || `/api/scan/${scanId}/poster/image`;
    const fileName = sanitizeFileName(scanId);

    // Platform detection
    const isMobile = isMobileDevice();
    const isIOS = isIOSSafari();
    const supportsShare = canShareFiles();

    try {
      // iOS Safari: Web Share file support limited, use fallback
      if (isIOS && !supportsShare) {
        console.log('iOS Safari without Web Share file support, showing fallback');
        setState('idle');
        showFallback();
        return;
      }

      // Mobile with Web Share API support
      if (isMobile && supportsShare) {
        console.log('Mobile with Web Share API, attempting share');
        const file = await fetchImageAsFile(posterUrl, fileName);
        await shareFile({
          file,
          title: 'Security Scan Poster',
          text: 'Check out my security scan poster!',
        });
        console.log('Share successful');
      } 
      // Desktop with browser support
      else if (isDesktopEnvironment() && browserInfo.isSupported) {
        console.log('Desktop environment, triggering blob download');
        await downloadPosterForDesktop(scanId, posterUrl);
        console.log('Download successful');
      }
      // Unsupported browser or platform
      else {
        console.log('Unsupported browser or platform');
        throw new Error('Browser not supported for download');
      }

      // Success: update state and trigger callback
      setState('saved');
      onSaveSuccess?.();

      // Revert to idle after 1.2s
      setTimeout(() => {
        setState('idle');
      }, 1200);

    } catch (error) {
      // Handle save errors
      handleSaveError(error);
    }
  };

  /**
   * Show fallback BottomSheet
   * 
   * Displays the internal BottomSheet with long-press guidance.
   * Also triggers the external onFallbackShow callback for backward compatibility.
   */
  const showFallback = () => {
    setShowBottomSheet(true);
    onFallbackShow?.();
  };

  /**
   * Hide fallback BottomSheet
   * 
   * Closes the BottomSheet when user acknowledges the guidance.
   */
  const hideFallback = () => {
    setShowBottomSheet(false);
  };

  /**
   * Handle save errors with appropriate fallback or error UI
   * 
   * @param error - The error object from save operation
   * 
   * Error handling strategy:
   * - 'abort' (AbortError): User cancelled, silent close
   * - 'not-allowed' (NotAllowedError/SecurityError): Permission denied, show fallback
   * - 'network' (NetworkError/TypeError): Network issue, show fallback
   * - 'unknown': Other errors, show failed state
   */
  const handleSaveError = (error: unknown) => {
    console.error('Save failed:', error);
    
    const errorType = getErrorType(error);
    switch (errorType) {
      case 'abort':
        // User cancelled, silent close
        console.log('Save aborted by user');
        setState('idle');
        setShowBottomSheet(false);
        break;

      case 'not-allowed':
        // Permission denied or security error, show fallback
        console.log('Save not allowed, showing fallback');
        setState('idle');
        showFallback();
        onSaveFailure?.();
        break;

      case 'network':
        // Network or fetch error, show fallback
        console.log('Network error during save, showing fallback');
        setState('idle');
        showFallback();
        onSaveFailure?.();
        break;

      case 'unknown':
        // Unknown error, show failed state
        console.log('Unknown error during save, showing failed state');
        setState('failed');
        setShowBottomSheet(false);
        onSaveFailure?.();
        break;
    }
  };

  /**
   * Determine if button should be disabled
   */
  const isUnsupportedDesktop = isDesktopEnvironment() && !browserInfo.isSupported;
  const isDisabled = state === 'saving' || state === 'saved' || isUnsupportedDesktop;

  /**
   * Get button variant styles based on state
   */
  const getButtonStyles = (): string => {
    const baseStyles = [
      'inline-flex',
      'items-center',
      'justify-center',
      'gap-2',
      'px-6',
      'py-3',
      'rounded-lg',
      'font-semibold',
      'text-sm',
      'transition-all',
      'duration-200',
      'cursor-pointer',
      'border',
      'min-w-[120px]'
    ];

    const stateStyles = {
      idle: [
        'bg-white',
        'text-slate-900',
        'border-slate-200',
        'hover:bg-slate-50',
        'hover:border-slate-300',
        'active:bg-slate-100'
      ],
      saving: [
        'bg-slate-100',
        'text-slate-600',
        'border-slate-200',
        'cursor-not-allowed'
      ],
      saved: [
        'bg-emerald-50',
        'text-emerald-700',
        'border-emerald-200',
        'cursor-not-allowed'
      ],
      failed: [
        'bg-white',
        'text-slate-900',
        'border-slate-200',
        'hover:bg-slate-50',
        'hover:border-slate-300'
      ]
    };

    return [...baseStyles, ...stateStyles[state]].join(' ');
  };

  return (
    <>
      <button
        ref={buttonRef}
        onClick={handleClick}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        aria-label={getButtonText(state)}
        type="button"
        className={getButtonStyles()}
        data-testid="save-button"
      >
        {/* Loading spinner for saving state */}
        {state === 'saving' && (
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}

        {/* Check icon for saved state */}
        {state === 'saved' && (
          <svg
            className="h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        )}

        {/* Refresh icon for failed state */}
        {state === 'failed' && (
          <svg
            className="h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        )}

        {/* Button text */}
        <span>{getButtonText(state)}</span>
      </button>

      {/* Error message for failed state */}
      {state === 'failed' && (
        <div className={styles.saveErrorMessage} role="alert" aria-live="polite">
          Save failed. Try again, or long press image to save.
        </div>
      )}

      {/* Unsupported browser warning */}
      {!browserInfo.isSupported && (
        <div className={styles.unsupportedBrowserWarning} role="alert">
          Your browser ({browserInfo.name} {browserInfo.version}) is not supported.
          Please use the latest version of Chrome, Safari, Firefox, or Edge to save.
          <div className={styles.unsupportedBrowserHint}>
            Tip: You can also try long pressing the poster image to save it.
          </div>
        </div>
      )}

      {/* Fallback BottomSheet for mobile save failure */}
      <BottomSheet
        open={showBottomSheet}
        onClose={hideFallback}
        title="Save Poster"
        description='Long press the poster image, then choose "Save Image".'
        confirmText="I got it"
        triggerRef={buttonRef}
      />
    </>
  );
}
