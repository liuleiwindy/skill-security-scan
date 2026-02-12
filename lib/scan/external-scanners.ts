import type { Finding } from "./rules";
import { runSemgrepScan } from "./adapters/semgrep";
import { runGitleaksScan } from "./adapters/gitleaks";

export interface ExternalScannerDeps {
  runSemgrep: typeof runSemgrepScan;
  runGitleaks: typeof runGitleaksScan;
}

export interface ExternalScannerStatus {
  scanner: "semgrep" | "gitleaks";
  status: "ok" | "failed";
  findings: number;
  error?: string;
}

export interface ExternalScannerResult {
  findings: Finding[];
  scanners: ExternalScannerStatus[];
}

export async function runExternalScanners(
  workspaceDir: string,
  deps: ExternalScannerDeps,
): Promise<ExternalScannerResult> {
  const [semgrepResult, gitleaksResult] = await Promise.all([
    deps.runSemgrep(workspaceDir).catch((error: unknown) => ({
      findings: [],
      error: error instanceof Error ? error.message : "semgrep_failed",
    })),
    deps.runGitleaks(workspaceDir).catch((error: unknown) => ({
      findings: [],
      error: error instanceof Error ? error.message : "gitleaks_failed",
    })),
  ]);

  return {
    findings: [...semgrepResult.findings, ...gitleaksResult.findings],
    scanners: [
      {
        scanner: "semgrep",
        status: semgrepResult.error ? "failed" : "ok",
        findings: semgrepResult.findings.length,
        error: semgrepResult.error,
      },
      {
        scanner: "gitleaks",
        status: gitleaksResult.error ? "failed" : "ok",
        findings: gitleaksResult.findings.length,
        error: gitleaksResult.error,
      },
    ],
  };
}
