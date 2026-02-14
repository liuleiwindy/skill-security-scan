"use client";

import React from "react";
import Link from "next/link";
import { useState, useCallback } from "react";
import { PosterImage } from "@/components/PosterImage";
import { SaveButton } from "@/components/SaveButton";
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
 *
 * @param scanId - The scan ID passed from the server component
 * @returns The poster page content component
 */
export function PosterPageContent({ scanId }: { scanId: string }) {
  // State management for save operations
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(false);

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
