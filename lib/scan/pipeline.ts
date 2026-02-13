import type { ScanReport } from "./engine";
import { runScan } from "./engine";
import { calculateScoreResult } from "./scoring";
import { dedupeAndSortFindings } from "./adapters/normalize";
import { runExternalScanners } from "./external-scanners";
import { runSemgrepScan } from "./adapters/semgrep";
import { runGitleaksScan } from "./adapters/gitleaks";
import type { IntakeResult } from "./intake";
import type { ScannerErrorCode } from "./scan-types";

/**
 * V0.2.3.4: Scanner metadata entry for scanMeta.scanners
 */
export type ScannerMetadata = {
  name: "semgrep" | "gitleaks" | "pi-external" | "pi-local";
  status: "ok" | "failed" | "skipped" | "fallback";
  findings: number;
  errorCode?: ScannerErrorCode;
  message?: string;
};

type PipelineDeps = {
  runInternalScan: typeof runScan;
  runExternalScanners: typeof runExternalScanners;
  runDedupe: typeof dedupeAndSortFindings;
  runScore: typeof calculateScoreResult;
  runSemgrep: typeof runSemgrepScan;
  runGitleaks: typeof runGitleaksScan;
};

const defaultDeps: PipelineDeps = {
  runInternalScan: runScan,
  runExternalScanners,
  runDedupe: dedupeAndSortFindings,
  runScore: calculateScoreResult,
  runSemgrep: runSemgrepScan,
  runGitleaks: runGitleaksScan,
};

export async function runFullScan(
  effectiveRepoUrl: string,
  intake: IntakeResult,
  overrides: Partial<PipelineDeps> = {},
): Promise<ScanReport> {
  const deps: PipelineDeps = { ...defaultDeps, ...overrides };

  const internalReport = await deps.runInternalScan(effectiveRepoUrl, intake.files);
  const externalResult = await deps.runExternalScanners(intake.workspaceDir, {
    runSemgrep: deps.runSemgrep,
    runGitleaks: deps.runGitleaks,
  });

  const mergedFindings = deps.runDedupe([...internalReport.findings, ...externalResult.findings]);
  const scoreResult = deps.runScore(mergedFindings);

  // V0.2.3.4: Collect and merge scanner metadata from both internal (PI) and external scanners
  const scannersMetadata: ScannerMetadata[] = [
    // Include PI scanner status from internal report (pi-external or pi-local)
    ...(internalReport.scanMeta?.scanners ?? []),
    // Include external scanners status (semgrep, gitleaks)
    ...externalResult.scanners.map((s) => ({
      name: s.scanner,
      status: s.status, // Preserve original status (ok, failed, skipped)
      findings: s.findings,
      errorCode: s.errorCode,
      message: s.message,
    })),
  ];

  return {
    ...internalReport,
    repoUrl: effectiveRepoUrl,
    findings: mergedFindings,
    score: scoreResult.score,
    grade: scoreResult.grade,
    status: scoreResult.status,
    summary: scoreResult.summary,
    engineVersion: "v0.2.3",
    scanMeta: {
      ...internalReport.scanMeta,
      source: intake.kind === "npm_command" ? "npm_registry" : "github_api",
      filesScanned: intake.files.length,
      filesSkipped: intake.filesSkipped,
      packageName: intake.kind === "npm_command" ? intake.packageName : undefined,
      packageVersion: intake.kind === "npm_command" ? intake.packageVersion : undefined,
      // V0.2.3.4: Merge PI and external scanner metadata
      scanners: scannersMetadata,
    },
  };
}
