import type { ScanReport } from "./engine";
import { runScan } from "./engine";
import { calculateScoreResult } from "./scoring";
import { dedupeAndSortFindings } from "./adapters/normalize";
import { runExternalScanners } from "./external-scanners";
import { runSemgrepScan } from "./adapters/semgrep";
import { runGitleaksScan } from "./adapters/gitleaks";
import type { IntakeResult } from "./intake";

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
      source: intake.kind === "npm_command" ? "npm_registry" : "github_api",
      filesScanned: intake.files.length,
      filesSkipped: intake.filesSkipped,
      packageName: intake.kind === "npm_command" ? intake.packageName : undefined,
      packageVersion: intake.kind === "npm_command" ? intake.packageVersion : undefined,
    },
  };
}
