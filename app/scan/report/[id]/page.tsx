import Link from "next/link";
import { notFound } from "next/navigation";
import type { ScanReport, Finding } from "@/lib/validation";
import { getStoredReport } from "@/lib/store";
import { ReportShareActions } from "./report-share-actions";
import styles from "./report.module.css";

function severityColor(severity: Finding["severity"]) {
  if (severity === "critical") return "#dc2626";
  if (severity === "high") return "#ea580c";
  if (severity === "medium") return "#f59e0b";
  return "#3b82f6";
}

function statusTag(status: ScanReport["status"]) {
  if (status === "safe") return { text: "PASS", bg: "#dcfce7", fg: "#166534" };
  if (status === "needs_review") return { text: "REVIEW", bg: "#fef3c7", fg: "#92400e" };
  return { text: "RISK", bg: "#fee2e2", fg: "#991b1b" };
}

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const report = await getStoredReport(id);

  if (!report) {
    notFound();
  }

  const status = statusTag(report.status);
  const pi1Hits = report.findings.filter((finding) => finding.ruleId === "PI-1-INSTRUCTION-OVERRIDE").length;
  const pi2Hits = report.findings.filter((finding) => finding.ruleId === "PI-2-PROMPT-SECRET-EXFIL").length;
  const piTotalHits = pi1Hits + pi2Hits;

  return (
    <div className={styles.container}>
      <header className={styles.topBar}>
        <Link href="/scan" className={styles.topLinkPrimary}>
          ← New Scan
        </Link>
        <div className={styles.topActions}>
          <Link href="/" className={styles.topLink}>
            Home
          </Link>
          <Link href={`/scan/poster/${id}`} className={styles.topLink}>
            Poster
          </Link>
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.scoreCard}>
          <div className={styles.scoreHeader}>
            <div className={styles.scoreMain}>
              <div className={styles.gradeBadge}>{report.grade}</div>
              <div className={styles.scoreValue}>{report.score}</div>
            </div>
            <div className={styles.statusBadge} style={{ backgroundColor: status.bg, color: status.fg }}>
              {status.text}
            </div>
          </div>
          <div className={styles.repoInfo}>
            <p className={styles.repoUrl}>{report.repoUrl.replace(/^https?:\/\//, "")}</p>
            <p className={styles.scanTime}>{new Date(report.scannedAt).toLocaleString()}</p>
          </div>
        </div>
      </section>

      <section className={styles.summary}>
        <h2 className={styles.sectionTitle}>Findings Summary</h2>
        <div className={styles.summaryGrid}>
          <div className={styles.summaryItem}>
            <div className={styles.summaryCount} style={{ color: "#dc2626" }}>
              {report.summary.critical}
            </div>
            <div className={styles.summaryLabel}>Critical</div>
          </div>
          <div className={styles.summaryItem}>
            <div className={styles.summaryCount} style={{ color: "#ea580c" }}>
              {report.summary.high}
            </div>
            <div className={styles.summaryLabel}>High</div>
          </div>
          <div className={styles.summaryItem}>
            <div className={styles.summaryCount} style={{ color: "#f59e0b" }}>
              {report.summary.medium}
            </div>
            <div className={styles.summaryLabel}>Medium</div>
          </div>
          <div className={styles.summaryItem}>
            <div className={styles.summaryCount} style={{ color: "#3b82f6" }}>
              {report.summary.low}
            </div>
            <div className={styles.summaryLabel}>Low</div>
          </div>
        </div>
      </section>

      <section className={styles.piScan}>
        <div className={styles.piHeader}>
          <h2 className={styles.sectionTitle}>Prompt Injection Scan</h2>
          <span className={styles.piEnabledBadge}>Enabled</span>
        </div>
        <p className={styles.piDescription}>
          Prompt-injection checks are executed in engine v0.2.3+ for PI-1 (instruction override) and PI-2
          (prompt/secret exfiltration).
        </p>
        <div className={styles.piGrid}>
          <div className={styles.piItem}>
            <div className={styles.piCount}>{piTotalHits}</div>
            <div className={styles.piLabel}>PI Findings</div>
          </div>
          <div className={styles.piItem}>
            <div className={styles.piCount}>{pi1Hits}</div>
            <div className={styles.piLabel}>PI-1 Hits</div>
          </div>
          <div className={styles.piItem}>
            <div className={styles.piCount}>{pi2Hits}</div>
            <div className={styles.piLabel}>PI-2 Hits</div>
          </div>
        </div>
      </section>

      {report.findings.length > 0 ? (
        <section className={styles.findings}>
          <h2 className={styles.sectionTitle}>Detected Risks</h2>
          <div className={styles.findingsList}>
            {report.findings.map((finding, index) => (
              <article key={`${finding.ruleId}-${index}`} className={styles.findingCard}>
                <div className={styles.findingHeader}>
                  <span className={styles.severityBadge} style={{ backgroundColor: severityColor(finding.severity) }}>
                    {finding.severity.toUpperCase()}
                  </span>
                  <h3 className={styles.findingTitle}>{finding.title}</h3>
                </div>
                <div className={styles.findingLocation}>
                  {finding.file}:{finding.line}
                </div>
                <pre className={styles.snippet}>
                  <code>{finding.snippet}</code>
                </pre>
                <p className={styles.recommendationText}>{finding.recommendation}</p>
              </article>
            ))}
          </div>
        </section>
      ) : (
        <section className={styles.safeMessage}>
          <div className={styles.safeIcon}>✓</div>
          <h3 className={styles.safeTitle}>No high-risk findings detected</h3>
          <p className={styles.safeText}>This lightweight scan did not detect obvious risky patterns.</p>
        </section>
      )}

      <section className={styles.disclaimer}>
        <div className={styles.disclaimerIcon}>⚠</div>
        <h3 className={styles.disclaimerTitle}>Disclaimer</h3>
        <p className={styles.disclaimerText}>
          This report is based on static analysis and signature-based pattern matching.
        </p>
        <p className={styles.disclaimerText} style={{ marginTop: "0.75rem" }}>
          It is not a full security audit and does not execute repository code.
        </p>
        <p className={styles.engineVersion}>Engine: {report.engineVersion}</p>
      </section>

      <ReportShareActions id={id} />
    </div>
  );
}
