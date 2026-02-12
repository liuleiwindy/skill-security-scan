import type { ScanReport } from "./scan/engine";
import { fetchGitHubRepoFiles } from "./scan/github";
import { fetchNpmPackageFiles, resolveSkillsAddGitHubTarget } from "./scan/npm";
import { runSemgrepScan } from "./scan/adapters/semgrep";
import { runGitleaksScan } from "./scan/adapters/gitleaks";
import { runIntakeFromInput, type IntakeDeps } from "./scan/intake";
import { runFullScan } from "./scan/pipeline";
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
  const { intake, effectiveRepoUrl } = await runIntakeFromInput(repoUrl, getIntakeDeps());

  try {
    const report = await runFullScan(effectiveRepoUrl, intake, {
      runSemgrep: runtimeDeps.runSemgrep,
      runGitleaks: runtimeDeps.runGitleaks,
    });

    await saveReport(report);
    return report;
  } finally {
    await intake.cleanup();
  }
}

export async function getStoredReport(id: string): Promise<ScanReport | null> {
  return loadReport(id);
}
