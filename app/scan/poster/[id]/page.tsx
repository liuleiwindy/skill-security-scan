import Link from "next/link";
import { notFound } from "next/navigation";
import styles from "./poster.module.css";
import { generateQRCode, getReportUrl } from "@/lib/qr";
import { getStoredReport } from "@/lib/store";

function statusLabel(status: "safe" | "needs_review" | "risky") {
  if (status === "safe") return "PASS";
  if (status === "needs_review") return "REVIEW";
  return "RISK";
}

export default async function PosterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const report = await getStoredReport(id);

  if (!report) {
    notFound();
  }

  const qrCode = await generateQRCode(getReportUrl(id), { size: 140, margin: 1 });
  const totalIssues = report.summary.critical + report.summary.high + report.summary.medium + report.summary.low;

  return (
    <main className={styles.posterContainer}>
      <nav className={styles.posterNav}>
        <Link href={`/scan/report/${id}`} className={styles.navLinkPrimary}>
          ← Back to Report
        </Link>
        <Link href="/scan" className={styles.navLink}>
          New Scan
        </Link>
      </nav>

      <article className={styles.posterCard}>
        <header className={styles.header}>
          <p className={styles.brand}>Skill Security Scan</p>
          <p className={styles.date}>{new Date(report.scannedAt).toLocaleDateString()}</p>
        </header>

        <section className={styles.hero}>
          <p className={styles.grade}>{report.grade}</p>
          <p className={styles.score}>{report.score}</p>
          <p className={styles.status}>{statusLabel(report.status)}</p>
        </section>

        <section className={styles.summary}>
          <p className={styles.repo}>{report.repoUrl.replace(/^https?:\/\//, "")}</p>
          <p className={styles.summaryLine}>Issues: {totalIssues} · Engine {report.engineVersion}</p>
        </section>

        <footer className={styles.footer}>
          <img src={qrCode} alt="Report QR" className={styles.qr} />
          <p className={styles.cta}>Scan to open full report</p>
          <div className={styles.footerActions}>
            <Link href={`/scan/report/${id}`} className={styles.footerLink}>
              Open Report
            </Link>
            <Link href="/scan" className={styles.footerLink}>
              Scan Another Repo
            </Link>
          </div>
          <p className={styles.brandHint}>BRAND_TBD</p>
        </footer>
      </article>
    </main>
  );
}
