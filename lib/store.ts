import type { ScanReport } from "./scan/engine";
import { runScan } from "./scan/engine";
import { calculateScoreResult } from "./scan/scoring";
import { fetchGitHubRepoFiles } from "./scan/github";
import { fetchNpmPackageFiles, resolveSkillsAddGitHubTarget } from "./scan/npm";
import type { NpmFetchResult } from "./scan/npm";
import { runSemgrepScan } from "./scan/adapters/semgrep";
import { runGitleaksScan } from "./scan/adapters/gitleaks";
import { dedupeAndSortFindings } from "./scan/adapters/normalize";
import { runIntakeFromInput, type IntakeDeps } from "./scan/intake";
import { requirePostgresForProduction, saveReport, loadReport } from "./report-repository";

type RuntimeDeps = {
  fetchRepoFiles: typeof fetchGitHubRepoFiles;
  fetchNpmFiles: typeof fetchNpmPackageFiles;
  resolveSkillsAddGitHub: typeof resolveSkillsAddGitHubTarget;
  runSemgrep: typeof runSemgrepScan;
  runGitleaks: typeof runGitleaksScan;
};

let runtimeDeps: RuntimeDeps = {
  fetchRepoFiles: fetchGitHubRepoFiles,
  fetchNpmFiles: fetchNpmPackageFiles,
  resolveSkillsAddGitHub: resolveSkillsAddGitHubTarget,
  runSemgrep: runSemgrepScan,
  runGitleaks: runGitleaksScan,
};

export function __setScanRuntimeDepsForTest(overrides: Partial<RuntimeDeps>) {
  runtimeDeps = {
    ...runtimeDeps,
    ...overrides,
  };
}

export function __resetScanRuntimeDepsForTest() {
  runtimeDeps = {
    fetchRepoFiles: fetchGitHubRepoFiles,
    fetchNpmFiles: fetchNpmPackageFiles,
    resolveSkillsAddGitHub: resolveSkillsAddGitHubTarget,
    runSemgrep: runSemgrepScan,
    runGitleaks: runGitleaksScan,
  };
}

function getIntakeDeps(): IntakeDeps {
  return {
    fetchRepoFiles: runtimeDeps.fetchRepoFiles,
    fetchNpmFiles: runtimeDeps.fetchNpmFiles,
    resolveSkillsAddGitHub: runtimeDeps.resolveSkillsAddGitHub,
  };
}

export async function createAndStoreReport(repoUrl: string): Promise<ScanReport> {
  requirePostgresForProduction();
  const { intake, effectiveRepoUrl, npmMeta } = await runIntakeFromInput(repoUrl, getIntakeDeps());
  const npmIntake: NpmFetchResult | null = intake.kind === "npm_command" ? npmMeta : null;
  try {
    const internalReport = await runScan(effectiveRepoUrl, intake.files);
    const [semgrepResult, gitleaksResult] = await Promise.all([
      runtimeDeps.runSemgrep(intake.workspaceDir),
      runtimeDeps.runGitleaks(intake.workspaceDir),
    ]);
    const mergedFindings = dedupeAndSortFindings([
      ...internalReport.findings,
      ...semgrepResult.findings,
      ...gitleaksResult.findings,
    ]);
    const scoreResult = calculateScoreResult(mergedFindings);
    const report: ScanReport = {
      ...internalReport,
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
        packageName: npmIntake?.packageName,
        packageVersion: npmIntake?.packageVersion,
      },
    };

    await saveReport(report);
    return report;
  } finally {
    await intake.cleanup();
  }
}

export async function getStoredReport(id: string): Promise<ScanReport | null> {
  return loadReport(id);
}
