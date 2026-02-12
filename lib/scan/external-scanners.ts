import type { Finding } from "./rules";
import { runSemgrepScan } from "./adapters/semgrep";
import { runGitleaksScan } from "./adapters/gitleaks";
import type { ScannerErrorCode } from "./scan-types";

export interface ExternalScannerDeps {
  runSemgrep: typeof runSemgrepScan;
  runGitleaks: typeof runGitleaksScan;
}

/**
 * V0.2.3.4: Updated to use stable domain error codes
 */
export interface ExternalScannerStatus {
  scanner: "semgrep" | "gitleaks";
  status: "ok" | "failed" | "skipped";
  findings: number;
  errorCode?: ScannerErrorCode;
  message?: string;
}

export interface ExternalScannerResult {
  findings: Finding[];
  scanners: ExternalScannerStatus[];
}

/**
 * Map raw scanner error to stable domain error code (v0.2.3.4)
 */
function mapScannerError(error: string): ScannerErrorCode {
  const errorLower = error.toLowerCase();

  // V0.2.3.4: Fix mapping to match adapter error format (underscore-separated)
  if (errorLower.includes('not_available') || errorLower.includes('not available') ||
      errorLower.includes('not_found') || errorLower.includes('not found') ||
      errorLower.includes('enoent')) {
    return 'scanner_not_available';
  } else if (errorLower.includes('timeout') || errorLower.includes('abort')) {
    return 'scanner_timeout';
  } else if (errorLower.includes('network') || errorLower.includes('dns') ||
             errorLower.includes('connection') || errorLower.includes('econnrefused') ||
             errorLower.includes('econnreset')) {
    return 'scanner_network_error';
  } else if (errorLower.includes('parse') || errorLower.includes('invalid') ||
             errorLower.includes('malformed') || errorLower.includes('json')) {
    return 'scanner_invalid_output';
  }

  return 'scanner_exec_failed';
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
        errorCode: semgrepResult.error ? mapScannerError(semgrepResult.error) : undefined,
        message: semgrepResult.error ? semgrepResult.error.substring(0, 200) : undefined,
      },
      {
        scanner: "gitleaks",
        status: gitleaksResult.error ? "failed" : "ok",
        findings: gitleaksResult.findings.length,
        errorCode: gitleaksResult.error ? mapScannerError(gitleaksResult.error) : undefined,
        message: gitleaksResult.error ? gitleaksResult.error.substring(0, 200) : undefined,
      },
    ],
  };
}
