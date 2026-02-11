"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import styles from "./report.module.css";

type Finding = {
  ruleId: string;
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  file: string;
  line: number;
  snippet: string;
  recommendation: string;
};

type ReportData = {
  id: string;
  repoUrl: string;
  score: number;
  grade: "A" | "B" | "C";
  status: "safe" | "needs_review" | "risky";
  summary: { critical: number; high: number; medium: number; low: number };
  findings: Finding[];
  engineVersion: string;
  scannedAt: string;
};

function severityColor(severity: Finding["severity"]) {
  if (severity === "critical") return "#dc2626";
  if (severity === "high") return "#ea580c";
  if (severity === "medium") return "#f59e0b";
  return "#3b82f6";
}

function statusTag(status: ReportData["status"]) {
  if (status === "safe") return { text: "PASS", bg: "#dcfce7", fg: "#166534" };
  if (status === "needs_review") return { text: "REVIEW", bg: "#fef3c7", fg: "#92400e" };
  return { text: "RISK", bg: "#fee2e2", fg: "#991b1b" };
}

export default function ReportPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [report, setReport] = useState<ReportData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    async function run() {
      try {
        const res = await fetch(`/api/scan/${id}`, { cache: "no-store" });
        if (!res.ok) {
          let errorMessage = "Failed to load report";
          try {
            const errorData = await res.json();
            errorMessage = errorData.message || errorMessage;
          } catch {
            // If JSON parsing fails, use status text
            errorMessage = res.statusText || errorMessage;
          }
          if (!cancelled) setError(errorMessage);
          return;
        }
        const text = await res.text();
        if (!text || text.trim().length === 0) {
          if (!cancelled) setError("Empty response from server");
          return;
        }
        try {
          const data = JSON.parse(text) as ReportData;
          if (!cancelled) setReport(data);
        } catch (parseError) {
          if (!cancelled) setError("Invalid response format");
        }
      } catch (error) {
        if (!cancelled) setError("Failed to load report");
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined" || !id) return "";
    return `${window.location.origin}/scan/report/${id}`;
  }, [id]);

  if (error) {
    return (
      <main className={styles.container}>
        <p>{error}</p>
        <Link href="/scan">Back to Scan</Link>
      </main>
    );
  }

  if (!report) {
    return <main className={styles.container}>Loading report...</main>;
  }

  const status = statusTag(report.status);

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
          <div className={styles.summaryItem}><div className={styles.summaryCount} style={{ color: "#dc2626" }}>{report.summary.critical}</div><div className={styles.summaryLabel}>Critical</div></div>
          <div className={styles.summaryItem}><div className={styles.summaryCount} style={{ color: "#ea580c" }}>{report.summary.high}</div><div className={styles.summaryLabel}>High</div></div>
          <div className={styles.summaryItem}><div className={styles.summaryCount} style={{ color: "#f59e0b" }}>{report.summary.medium}</div><div className={styles.summaryLabel}>Medium</div></div>
          <div className={styles.summaryItem}><div className={styles.summaryCount} style={{ color: "#3b82f6" }}>{report.summary.low}</div><div className={styles.summaryLabel}>Low</div></div>
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
                <div className={styles.findingLocation}>{finding.file}:{finding.line}</div>
                <pre className={styles.snippet}><code>{finding.snippet}</code></pre>
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
          <strong>V0.1 Demo Mode:</strong> This version uses simulated scan results based on repository URL patterns, not actual code analysis. The findings shown are for demonstration purposes only and do not reflect real security issues in the scanned repository.
        </p>
        <p className={styles.disclaimerText} style={{ marginTop: '0.75rem' }}>
          This is a lightweight static scan demonstration, not a full security audit.
        </p>
        <p className={styles.engineVersion}>Engine: {report.engineVersion} (Demo Mode)</p>
      </section>

      <section className={styles.shareActions}>
        <h2 className={styles.sectionTitle}>Share</h2>
        <div className={styles.shareButtons}>
          <button
            className={styles.shareButton}
            onClick={() => {
              if (!shareUrl) return;
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
    </div>
  );
}
