import type { ScanReport } from "./scan/engine";
import { runScan } from "./scan/engine";
import { calculateScoreResult } from "./scan/scoring";
import { fetchGitHubRepoFiles } from "./scan/github";
import { classifyScanInput, fetchNpmPackageFiles, resolveSkillsAddGitHubTarget } from "./scan/npm";
import type { NpmFetchResult } from "./scan/npm";
import { runSemgrepScan } from "./scan/adapters/semgrep";
import { runGitleaksScan } from "./scan/adapters/gitleaks";
import { dedupeAndSortFindings } from "./scan/adapters/normalize";
import { SKILLS_ADD_GITHUB_TIMEOUT_MS, SKILLS_ADD_MAX_ROOTS, prioritizeSkillRoots } from "./scan/scan-policy";
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


export async function createAndStoreReport(repoUrl: string): Promise<ScanReport> {
  requirePostgresForProduction();
  const inputKind = classifyScanInput(repoUrl);
  const skillsGitHubTarget =
    inputKind === "npm_command"
      ? await runtimeDeps.resolveSkillsAddGitHub(repoUrl).catch(() => null)
      : null;
  const prioritizedSkillRoots = skillsGitHubTarget
    ? prioritizeSkillRoots(skillsGitHubTarget.skillRoots, SKILLS_ADD_MAX_ROOTS)
    : [];
  const effectiveKind = skillsGitHubTarget ? "github_url" : inputKind;
  const intake =
    effectiveKind === "npm_command"
      ? await runtimeDeps.fetchNpmFiles(repoUrl)
      : await runtimeDeps.fetchRepoFiles(
          skillsGitHubTarget?.repoUrl || repoUrl,
          skillsGitHubTarget
            ? {
                timeoutMs: SKILLS_ADD_GITHUB_TIMEOUT_MS,
                ...(prioritizedSkillRoots.length > 0 ? { subPaths: prioritizedSkillRoots } : {}),
              }
            : undefined,
        );
  const npmIntake: NpmFetchResult | null = effectiveKind === "npm_command" ? (intake as NpmFetchResult) : null;
  try {
    const internalReport = await runScan(skillsGitHubTarget?.repoUrl || repoUrl, intake.files);
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
        source: effectiveKind === "npm_command" ? "npm_registry" : "github_api",
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
