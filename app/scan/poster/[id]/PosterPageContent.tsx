"use client";

import React from "react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { JetBrains_Mono, Orbitron, Rajdhani } from "next/font/google";
import { PosterImage } from "@/components/PosterImage";
import { SaveButton } from "@/components/SaveButton";
import { track } from "@/lib/analytics/track";
import posterTaglinesConfig from "@/config/poster-taglines.config.json";
import styles from "./poster.module.css";

const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["500", "700", "800"],
  variable: "--font-orbitron",
});

const rajdhani = Rajdhani({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-rajdhani",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-jetbrains-mono",
});

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
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  /**
   * Get a random tagline from config
   * Falls back to default if config is invalid or empty
   */
  const randomTagline = React.useMemo(() => {
    const { taglines, defaultTagline } = posterTaglinesConfig;
    if (!Array.isArray(taglines) || taglines.length === 0) {
      return defaultTagline || "Share your security stance with the world.";
    }
    const randomIndex = Math.floor(Math.random() * taglines.length);
    return taglines[randomIndex] || defaultTagline;
  }, []);

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

  const handleCopyLink = useCallback(async () => {
    const fallbackUrl = `/scan/report/${scanId}`;
    try {
      const reportUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}/scan/report/${scanId}`
          : fallbackUrl;
      await navigator.clipboard.writeText(reportUrl);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }

    setTimeout(() => setCopyState("idle"), 1800);
  }, [scanId]);

  return (
    <div className={`${styles.container} ${orbitron.variable} ${rajdhani.variable} ${jetBrainsMono.variable}`}>
      <header className={styles.header}>
        <div className={styles.brandWrap}>
          <span className={styles.brandDot} aria-hidden="true" />
          <span className={styles.brand}>MYSKILLS_PROTOCOL</span>
        </div>
        <Link href={`/scan/report/${scanId}`} className={styles.backLink}>
          <span className={styles.backLinkLine}>VIEW</span>
          <span className={styles.backLinkLine}>REPORT</span>
        </Link>
      </header>

      <main className={styles.main}>
        <section className={styles.messageSection}>
          <h1 className={styles.title}>SECURITY RATING CONFIRMED</h1>
          <p className={styles.subtitle}>Save the poster and share your security stance.</p>
        </section>

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

          <button
            type="button"
            className={styles.secondaryAction}
            onClick={handleCopyLink}
            aria-label="复制报告分享链接"
          >
            {copyState === "copied" ? "LINK COPIED" : copyState === "failed" ? "COPY FAILED" : "COPY SHARE LINK"}
          </button>
        </div>

        <p className={styles.tip}>{randomTagline}</p>
      </main>
    </div>
  );
}
