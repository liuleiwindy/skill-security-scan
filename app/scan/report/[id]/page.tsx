import type { Finding, ScanReport } from "@/lib/validation";
import { getStoredReport } from "@/lib/store";
import { notFound } from "next/navigation";
import { JetBrains_Mono, Orbitron, Rajdhani } from "next/font/google";
import { ReportInstrumentation } from "./report-instrumentation";
import styles from "./report.module.css";
import { ReportShareActions } from "./report-share-actions";
import { ReportTopNav } from "./report-top-nav";

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

function severityClass(severity: Finding["severity"], css: Record<string, string>) {
  if (severity === "critical") return css.severityCritical;
  if (severity === "high") return css.severityHigh;
  if (severity === "medium") return css.severityMedium;
  return css.severityLow;
}

function statusMetricClass(status: ScanReport["status"], css: Record<string, string>) {
  if (status === "safe") return css.metricStatusPass;
  if (status === "needs_review") return css.metricStatusReview;
  return css.metricStatusRisk;
}

function dotClassForGrade(grade: ScanReport["grade"], css: Record<string, string>) {
  if (grade === "A") return css.dotGradeA;
  if (grade === "B") return css.dotGradeB;
  return css.dotGradeC;
}

function deriveStatusByRule(report: ScanReport): ScanReport["status"] {
  if (report.summary.critical > 0 || report.score < 70) return "risky";
  if (report.summary.critical === 0 && report.score >= 85 && report.summary.high <= 2) return "safe";
  return "needs_review";
}

function statusLabel(status: ScanReport["status"]) {
  if (status === "safe") return "PASS";
  if (status === "needs_review") return "REVIEW";
  return "RISK";
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

  const pi1Hits = report.findings.filter((finding) => finding.ruleId === "PI-1-INSTRUCTION-OVERRIDE").length;
  const pi2Hits = report.findings.filter((finding) => finding.ruleId === "PI-2-PROMPT-SECRET-EXFIL").length;
  const piTotalHits = pi1Hits + pi2Hits;
  const statusByRule = deriveStatusByRule(report);
  const statusMismatch = statusByRule !== report.status;
  const statusRules = [
    {
      key: "PASS",
      text: "critical = 0 and score >= 85 and high <= 2",
      active: statusByRule === "safe",
    },
    {
      key: "REVIEW",
      text: "critical = 0 and (score 70-84 or high > 2)",
      active: statusByRule === "needs_review",
    },
    {
      key: "RISK",
      text: "critical > 0 or score < 70",
      active: statusByRule === "risky",
    },
  ];

  return (
    <div className={`${styles.container} ${orbitron.variable} ${rajdhani.variable} ${jetBrainsMono.variable}`}>
      <ReportInstrumentation scanId={id} />
      <main className={styles.page}>
        <ReportTopNav />

        <section className={`${styles.panel} ${styles.hero}`}>
          <div className={styles.eyebrow}>
            <span className={`${styles.dot} ${dotClassForGrade(report.grade, styles)}`}></span>
            SECURITY SCAN
          </div>
          <h1 className={styles.heroTitle}>
            <span className={styles.lineNeon}>SECURITY REPORT</span>
            <br />
            <span className={styles.lineWhite}>FOR SKILL REPO</span>
          </h1>
          <p className={styles.subtitle}>
            {report.repoUrl.replace(/^https?:\/\//, "")} · scanned at {new Date(report.scannedAt).toISOString().replace('T', ' ').replace(/\.\d+Z$/, '')} UTC
          </p>

          <div className={styles.heroMeta}>
            <div className={`${styles.metric} ${styles.metricGrade}`}>
              <div className={styles.metricNum}>{report.grade}</div>
              <div className={styles.metricLabel}>Grade</div>
            </div>
            <div className={styles.metric}>
              <div className={styles.metricNum}>{report.score}</div>
              <div className={styles.metricLabel}>Score</div>
            </div>
            <div className={styles.metric}>
              <div className={`${styles.metricNum} ${statusMetricClass(statusByRule, styles)}`}>
                {statusLabel(statusByRule)}
              </div>
              <div className={styles.metricLabel}>Status</div>
            </div>
            <div className={styles.metric}>
              <div className={styles.metricNum}>{report.findings.length}</div>
              <div className={styles.metricLabel}>Findings</div>
            </div>
          </div>
          <ReportShareActions id={id} inline />
        </section>

        <section className={styles.contentGrid}>
          <section className={styles.summaryPanel}>
            <h2 className={styles.sectionTitle}>Security Summary</h2>
            <div className={styles.summaryGrid}>
              <div className={styles.summaryItem}>
                <div className={`${styles.summaryCount} ${styles.summaryCritical}`}>{report.summary.critical}</div>
                <div className={styles.summaryLabel}>Critical Risk</div>
              </div>
              <div className={styles.summaryItem}>
                <div className={`${styles.summaryCount} ${styles.summaryHigh}`}>{report.summary.high}</div>
                <div className={styles.summaryLabel}>High Risk</div>
              </div>
              <div className={styles.summaryItem}>
                <div className={`${styles.summaryCount} ${styles.summaryMedium}`}>{report.summary.medium}</div>
                <div className={styles.summaryLabel}>Medium Risk</div>
              </div>
              <div className={styles.summaryItem}>
                <div className={`${styles.summaryCount} ${styles.summaryLow}`}>{report.summary.low}</div>
                <div className={styles.summaryLabel}>Low Risk</div>
              </div>
            </div>

            <div className={styles.sectionBlock}>
              <h2 className={styles.sectionTitle}>Prompt Injection Scan</h2>
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
            </div>

            <div className={styles.sectionBlock}>
              <h2 className={styles.sectionTitle}>Status Rule</h2>
              <div className={styles.statusRulePlain}>
                {statusRules.map((rule) => (
                  <p key={rule.key} className={styles.statusRuleLine}>
                    <span className={styles.statusRuleLineKey}>{rule.key}:</span> {rule.text}
                  </p>
                ))}
              </div>
            </div>

            <div className={styles.sectionBlock}>
              <h2 className={styles.sectionTitle}>Disclaimer</h2>
              <p className={styles.disclaimerText}>
                This report is based on static analysis and signature-based pattern matching.
              </p>
              <p className={styles.disclaimerText}>It is not a full security audit and does not execute repository code.</p>
              {statusMismatch ? (
                <p className={styles.statusRuleWarning}>
                  Status mismatch: report status is {statusLabel(report.status)}, but rule output is{" "}
                  {statusLabel(statusByRule)}.
                </p>
              ) : null}
            </div>
          </section>

          {report.findings.length > 0 ? (
            <section className={styles.findingsPanel}>
              <h2 className={styles.sectionTitle}>Detected Risks</h2>
              <div className={styles.findingsList}>
                {report.findings.map((finding, index) => (
                  <article key={`${finding.ruleId}-${index}`} className={styles.findingCard}>
                    <div className={styles.findingHeader}>
                      <span className={`${styles.severityBadge} ${severityClass(finding.severity, styles)}`}>
                        {finding.severity.toUpperCase()}
                      </span>
                      <h3 className={styles.findingTitle}>{finding.title}</h3>
                    </div>
                    <div className={styles.findingLocation}>
                      {finding.file}:{finding.line}
                    </div>
                    <div className={styles.ruleMeta}>
                      <span className={styles.ruleKey}>Rule ID</span>
                      <span className={styles.ruleValue}>{finding.ruleId || "UNSPECIFIED"}</span>
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
        </section>

      </main>
    </div>
  );
}
