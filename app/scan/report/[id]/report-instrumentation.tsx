'use client';

/**
 * Report Page Instrumentation Component
 *
 * Handles analytics tracking for the report page:
 * - Fires report_page_view event on page load
 * - Fires poster_qr_visit event when src=poster_qr is present (first visit only)
 *
 * This component is a client-side wrapper that doesn't render any UI.
 * It only handles analytics tracking logic.
 */

import { useEffect } from 'react';
import { track } from '@/lib/analytics/track';

interface ReportInstrumentationProps {
  /** The scan ID to track */
  scanId: string;
}

export function ReportInstrumentation({ scanId }: ReportInstrumentationProps) {
  useEffect(() => {
    // Always fire report_page_view event on page load
    track('report_page_view', { scan_id: scanId });

    // Check if this is a QR-attributed visit (src=poster_qr parameter)
    const urlParams = new URLSearchParams(window.location.search);
    const srcParam = urlParams.get('src');

    if (srcParam === 'poster_qr') {
      // Use sessionStorage to prevent duplicate tracking
      const storageKey = `qr_visit_${scanId}`;
      const alreadyTracked = sessionStorage.getItem(storageKey);

      if (!alreadyTracked) {
        // First visit with QR attribution - fire event
        track('poster_qr_visit', {
          scan_id: scanId,
          src: 'poster_qr',
          ua_basic: navigator.userAgent || 'unknown',
        });

        // Mark as tracked to prevent duplicate fires
        sessionStorage.setItem(storageKey, 'true');
      }
    }
    // Empty dependency array ensures this runs only once on mount
  }, [scanId]);

  // This component doesn't render any UI
  return null;
}
