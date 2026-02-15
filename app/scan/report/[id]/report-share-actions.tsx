"use client";

import Link from "next/link";
import styles from "./report.module.css";

export function ReportShareActions({ id, inline = false }: { id: string; inline?: boolean }) {
  const content = (
    <div className={inline ? styles.heroActions : styles.shareButtons}>
      <Link href={`/scan/poster/${id}`} className={`${styles.shareButton} ${styles.shareButtonPrimary}`}>
        OPEN POSTER
      </Link>
      <button
        className={styles.shareButton}
        onClick={() => {
          const shareUrl = window.location.href;
          navigator.clipboard.writeText(shareUrl).catch(() => undefined);
        }}
      >
        COPY REPORT LINK
      </button>
    </div>
  );

  if (inline) return content;

  return (
    <section className={styles.shareActions}>
      <h2 className={styles.sectionTitle}>Share</h2>
      {content}
    </section>
  );
}
