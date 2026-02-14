import type { ScanReport } from "./scan/engine";
import { fetchGitHubRepoFiles } from "./scan/github";
import { fetchNpmPackageFiles, resolveSkillsAddGitHubTarget } from "./scan/npm";
import { runSemgrepScan } from "./scan/adapters/semgrep";
import { runGitleaksScan } from "./scan/adapters/gitleaks";
import { runIntakeFromInput, type IntakeDeps } from "./scan/intake";
import { runFullScan } from "./scan/pipeline";
import { requirePostgresForProduction, saveReport, loadReport } from "./report-repository";
import { abuseGuard } from "./scan/abuse-guard";
import { RepoFetchError } from "./scan/github";

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

/**
 * 包装超时边界
 * @param fn 要执行的异步函数
 * @param timeoutMs 超时时间（毫秒）
 * @throws RepoFetchError with code='scan_timeout' when timeout
 */
async function withTimeout<T>(fn: () => Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new RepoFetchError('scan_timeout', `Scan timed out after ${timeoutMs}ms (hard timeout)`));
    }, timeoutMs);

    fn()
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

export async function createAndStoreReport(repoUrl: string): Promise<ScanReport> {
  requirePostgresForProduction();

  // 获取硬超时配置
  const timeoutMs = abuseGuard.getHardTimeoutMs();

  const { intake, effectiveRepoUrl } = await runIntakeFromInput(repoUrl, getIntakeDeps());

  const scanTask = async () => {
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
  };

  // V0.2.3.5: 包装超时边界
  // NOTE: timeout 不会中断底层任务；scanTask 会在完成后自行 cleanup，避免提前清理工作目录。
  return withTimeout(
    () =>
      scanTask(),
    timeoutMs,
  );
}

export async function getStoredReport(id: string): Promise<ScanReport | null> {
  return loadReport(id);
}
