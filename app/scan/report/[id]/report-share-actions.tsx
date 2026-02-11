"use client";

import Link from "next/link";
import styles from "./report.module.css";

export function ReportShareActions({ id }: { id: string }) {
  return (
    <section className={styles.shareActions}>
      <h2 className={styles.sectionTitle}>Share</h2>
      <div className={styles.shareButtons}>
        <button
          className={styles.shareButton}
          onClick={() => {
            const shareUrl = window.location.href;
            navigator.clipboard.writeText(shareUrl).catch(() => undefined);
          }}
        >
          Copy Report Link
        </button>
        <Link href={`/scan/poster/${id}`} className={styles.shareButton}>
          Open Poster
        </Link>
      </div>
    </section>
  );
}
