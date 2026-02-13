/**
 * Shared scan-related types.
 *
 * V0.2.3.1: extracted from engine.ts to avoid circular dependencies
 * between scan-policy and engine.
 */

export interface ScanOptions {
  /**
   * Maximum number of files to scan (for demo V0.1).
   * Prevents scanning massive repos in demo phase.
   */
  maxFiles?: number;

  /**
   * File extensions to include in scan.
   */
  includeExtensions?: string[];

  /**
   * Directories to exclude from scan.
   */
  excludeDirs?: string[];

  /**
   * Enable external PI detection tools (V0.2.3).
   * Default: true
   */
  enableExternalPI?: boolean;

  /**
   * Fallback to local PI rules when external tools fail.
   * Default: true
   */
  fallbackToLocal?: boolean;
}

/**
 * Mock file system interface.
 *
 * In V0.1, this was defined in engine.ts.
 * V0.2.3.2: moved here so that both engine and intake/adapters
 * can depend on a shared type without creating cycles.
 */
export interface MockFile {
  path: string;
  content: string;
}

/**
 * Stable domain error codes for scanner failures (v0.2.3.4)
 * Public-safe codes that don't leak provider-specific internal errors.
 */
export type ScannerErrorCode =
  | "scanner_not_available"
  | "scanner_timeout"
  | "scanner_exec_failed"
  | "scanner_invalid_output"
  | "scanner_network_error";

/**
 * Scanner execution status (v0.2.3.4)
 */
export type ScannerExecutionStatus = "ok" | "failed" | "skipped" | "fallback";

/**
 * Scanner metadata entry in scanMeta (v0.2.3.4)
 * Additive field providing runtime observability for each scanner.
 */
export interface ScannerExecution {
  name: "semgrep" | "gitleaks" | "pi-external" | "pi-local";
  status: ScannerExecutionStatus;
  findings: number;
  errorCode?: ScannerErrorCode;
  message?: string;
}
