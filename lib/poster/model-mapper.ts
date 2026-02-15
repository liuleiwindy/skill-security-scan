import {
  deriveDeterministicBeatsRatio,
  getGradeForScore,
  loadGradeConfig,
} from "./render-options";
import type { PosterRenderModel, ScanReport } from "./poster-types";

export const DEFAULT_POSTER_MODEL: PosterRenderModel = {
  id: "scan_default",
  header: "SYSTEM INTEGRITY CHECK // REPORT",
  proof: "PROOF ID: X9K2 · 2026-02-14 14:32 UTC",
  repoLabel: "REPO:",
  repoValue: "example/repo",
  grade: "B",
  scoreText: "SCORE\\n69/100",
  beatsText: "BEATS\\nOF REPOS",
  beatsRatio: "78%",
  criticalLabel: "CRITICAL",
  criticalNumber: "[ 0 ]",
  highLabel: "HIGH",
  highNumber: "[ 0 ]",
  mediumLabel: "MEDIUM",
  mediumNumber: "[ 0 ]",
  lowLabel: "LOW",
  lowNumber: "[ 0 ]",
  cta: "> SCAN TO VERIFY REPORT DETAILS <",
  short: "POWERED BY MYSKILL.INFO",
  qrUrl: "/scan/report/scan_default",
};

function hashToUint32(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function deriveProofId(scanId: string): string {
  const compact = scanId.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (compact.length >= 4) {
    if (compact.startsWith("SCAN") && compact.length > 4) {
      return compact.slice(-4);
    }
    return compact.slice(0, 4);
  }
  return hashToUint32(scanId).toString(36).toUpperCase().slice(0, 4).padStart(4, "0");
}

function formatUtcProofTime(scannedAt: string): string {
  let parsed = new Date(scannedAt);
  if (!Number.isFinite(parsed.getTime()) && scannedAt.endsWith(" UTC")) {
    parsed = new Date(scannedAt.replace(" UTC", "Z"));
  }
  if (!Number.isFinite(parsed.getTime())) {
    return scannedAt;
  }

  const yyyy = parsed.getUTCFullYear();
  const mm = String(parsed.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(parsed.getUTCDate()).padStart(2, "0");
  const hh = String(parsed.getUTCHours()).padStart(2, "0");
  const min = String(parsed.getUTCMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${min} UTC`;
}

function normalizeGitHubRepo(repoUrl: string): string | undefined {
  const trimmed = repoUrl.trim();
  const sshMatch = trimmed.match(/^git@github\.com:([^/]+)\/([^/.]+)(?:\.git)?$/i);
  if (sshMatch) {
    return `${sshMatch[1]}/${sshMatch[2]}`;
  }

  const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(normalized);
    if (url.hostname.toLowerCase() !== "github.com") {
      return undefined;
    }
    const segments = url.pathname.split("/").filter(Boolean);
    if (segments.length >= 2) {
      return `${segments[0]}/${segments[1].replace(/\.git$/i, "")}`;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function deriveRepoValue(report: ScanReport): string {
  const packageName = report.scanMeta?.packageName?.trim();
  const packageVersion = report.scanMeta?.packageVersion?.trim();
  if (packageName) {
    return packageVersion ? `${packageName}@${packageVersion}` : packageName;
  }

  const githubRepo = normalizeGitHubRepo(report.repoUrl);
  if (githubRepo) {
    return githubRepo;
  }

  return report.repoUrl.replace(/^https?:\/\//, "");
}

export function createPosterModelFromScanReport(report: ScanReport): PosterRenderModel {
  const gradeConfig = loadGradeConfig();
  const grade = getGradeForScore(report.score, gradeConfig);
  const beatsRatio = deriveDeterministicBeatsRatio(report.id, report.score, grade);
  const proofTime = formatUtcProofTime(report.scannedAt);
  const repoValue = deriveRepoValue(report);

  return {
    id: report.id,
    header: "SYSTEM INTEGRITY CHECK // REPORT",
    proof: `PROOF ID: ${deriveProofId(report.id)} · ${proofTime}`,
    repoLabel: "REPO:",
    repoValue,
    grade,
    scoreText: `SCORE\\n${report.score}/100`,
    beatsText: "BEATS\\nOF REPOS",
    beatsRatio,
    criticalLabel: "CRITICAL",
    criticalNumber: `[ ${report.summary.critical} ]`,
    highLabel: "HIGH",
    highNumber: `[ ${report.summary.high} ]`,
    mediumLabel: "MEDIUM",
    mediumNumber: `[ ${report.summary.medium} ]`,
    lowLabel: "LOW",
    lowNumber: `[ ${report.summary.low} ]`,
    cta: "> SCAN TO VERIFY REPORT DETAILS <",
    short: "POWERED BY MYSKILL.INFO",
    qrUrl: `/scan/report/${report.id}`,
  };
}
