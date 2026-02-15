"use client";

import React from "react";
import Link from "next/link";
import { useCallback, useEffect } from "react";
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
  }, []);

  /**
   * Handle poster load error
   */
  const handlePosterError = useCallback((_type: string) => {
    // Poster load failed
  }, []);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.brand}>MYSKILLS_PROTOCOL</div>
      </header>

      <main className={styles.main}>
        <div className={styles.posterSection}>
          <div className={styles.posterContainer}>
            <PosterImage
              scanId={scanId}
              onLoad={handlePosterLoad}
              onError={handlePosterError}
            />
          </div>
        </div>

        <div className={styles.actionsSection}>
          <div className={styles.saveButtonWrap}>
            <SaveButton
              scanId={scanId}
              onSaveStart={handleSaveStart}
              onSaveComplete={handleSaveComplete}
            />
          </div>

          <Link
            href={`/scan/report/${scanId}`}
            className={styles.backToReportLink}
            aria-label={`View full report for scan ${scanId}`}
          >
            OPEN REPORT
          </Link>
        </div>
      </main>
    </div>
  );
}
