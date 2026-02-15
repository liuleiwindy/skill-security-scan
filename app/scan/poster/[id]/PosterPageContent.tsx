"use client";

import React from "react";
import Link from "next/link";
import { useState, useCallback, useEffect } from "react";
import { PosterImage } from "@/components/PosterImage";
import { SaveButton } from "@/components/SaveButton";
import { track } from "@/lib/analytics/track";
import styles from "./poster.module.css";

/**
 * PosterPageContent Component
 *
 * Client-side wrapper for the poster page that manages state and integrates components.
 * This component handles:
 * - PosterImage integration with load/error callbacks
 * - SaveButton integration with success/failure callbacks
 * - Status indicators for user feedback
 * - Responsive layout for mobile and desktop
 * - Analytics tracking for poster page events
 *
 * @param scanId - The scan ID passed from the server component
 * @returns The poster page content component
 */
export function PosterPageContent({ scanId }: { scanId: string }) {
  // State management for save operations
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(false);

  /**
   * Track poster page view on component mount
   *
   * Fires the poster_page_view event when the page first renders.
   */
  useEffect(() => {
    // Track poster page view
    track('poster_page_view', { scan_id: scanId });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  /**
   * Handle save operation start
   *
   * Fires the poster_save_clicked event when user clicks save/share button.
   * This event fires before the actual download/share operation begins.
   *
   * @param method - The method being used ('download' | 'share')
   */
  const handleSaveStart = useCallback((method: 'download' | 'share') => {
    // Track save clicked event
    track('poster_save_clicked', {
      scan_id: scanId,
      method: method,
    });
  }, [scanId]);

  /**
   * Handle save operation completion
   *
   * Fires the appropriate result event (poster_download_result or poster_share_result)
   * when the save operation completes (success or error).
   *
   * @param method - The method that was used ('download' | 'share')
   * @param status - The completion status ('success' | 'error')
   * @param durationMs - The duration of the operation in milliseconds
   * @param errorType - Optional error type if operation failed
   */
  const handleSaveComplete = useCallback((
    method: 'download' | 'share',
    status: 'success' | 'error',
    durationMs: number,
    errorType?: string
  ) => {
    // Fire the appropriate result event based on method
    if (method === 'download') {
      track('poster_download_result', {
        scan_id: scanId,
        status: status,
        duration_ms: durationMs,
        ...(errorType && { error_type: errorType }),
      });
    } else if (method === 'share') {
      track('poster_share_result', {
        scan_id: scanId,
        status: status,
        duration_ms: durationMs,
        ...(errorType && { error_type: errorType }),
      });
    }
  }, [scanId]);

  /**
   * Handle poster load success
   */
  const handlePosterLoad = useCallback(() => {
    // Poster loaded successfully
  }, [scanId]);

  /**
   * Handle poster load error
   */
  const handlePosterError = useCallback((type: string) => {
    // Poster load failed
  }, [scanId]);

  /**
   * Handle save operation success
   */
  const handleSaveSuccess = useCallback(() => {
    setSaveSuccess(true);
    setSaveError(false);
    // Poster saved successfully

    // Auto-hide success indicator after 3 seconds
    setTimeout(() => {
      setSaveSuccess(false);
    }, 3000);
  }, [scanId]);

  /**
   * Handle save operation failure
   */
  const handleSaveFailure = useCallback(() => {
    setSaveSuccess(false);
    setSaveError(true);
    // Poster save failed

    // Auto-hide error indicator after 3 seconds
    setTimeout(() => {
      setSaveError(false);
    }, 3000);
  }, [scanId]);

  return (
    <div className={styles.container}>
      {/* Header: Back Navigation */}
      <header className={styles.header}>
        <Link href="/scan" className={styles.backLink}>
          ← Back to Scan
        </Link>
      </header>

      {/* Main Content */}
      <main className={styles.main}>
        {/* Poster Image Section */}
        <div className={styles.posterSection}>
          <PosterImage
            scanId={scanId}
            onLoad={handlePosterLoad}
            onError={handlePosterError}
            className={styles.posterContainer}
          />
        </div>

        {/* Actions Section */}
        <div className={styles.actionsSection}>
          {/* Back to Report Link */}
          <Link
            href={`/scan/report/${scanId}`}
            className={styles.backToReportLink}
            aria-label={`View full report for scan ${scanId}`}
          >
            Open Report
          </Link>

          {/* Save Button */}
          <SaveButton
            scanId={scanId}
            onSaveSuccess={handleSaveSuccess}
            onSaveFailure={handleSaveFailure}
            onSaveStart={handleSaveStart}
            onSaveComplete={handleSaveComplete}
          />
        </div>

        {/* Status Indicators */}
        {saveSuccess && (
          <div
            className={`${styles.statusIndicator} ${styles.success}`}
            role="status"
            aria-live="polite"
          >
            ✓ Poster saved successfully
          </div>
        )}

        {saveError && (
          <div
            className={`${styles.statusIndicator} ${styles.error}`}
            role="status"
            aria-live="polite"
          >
            ✕ Save failed. Please try again.
          </div>
        )}
      </main>

      {/* Footer */}
      {process.env.NODE_ENV === "production" && (
        <footer className={styles.footer}>
          <p className={styles.footerText}>
            © {new Date().getFullYear()} Skill Security Scan
          </p>
        </footer>
      )}
    </div>
  );
}
