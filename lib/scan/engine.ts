/**
 * Security Scan Engine
 *
 * Main orchestrator for running static analysis scans.
 *
 * V0.1 Scope:
 * - Lightweight static analysis only
 * - Deterministic rule execution
 * - Report generation per spec contract
 */

import { runAllRules, Finding } from './rules';
import { calculateScoreResult } from './scoring';
import { externalResultToFinding } from './external-pi-adapter';
import { DEFAULT_SCAN_OPTIONS } from './scan-policy';
import type { MockFile, ScanOptions } from './scan-types';
import { runExternalPIDetection } from './pi-pipeline';
export type { MockFile } from './scan-types';

export interface ScanReport {
  id: string;
  repoUrl: string;
  score: number;
  grade: 'A' | 'B' | 'C';
  status: 'safe' | 'needs_review' | 'risky';
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  findings: Finding[];
  engineVersion: string;
  scannedAt: string; // ISO8601
  scanMeta?: {
    source?: string;
    filesScanned?: number;
    filesSkipped?: number;
    timeoutMs?: number;
    packageName?: string;
    packageVersion?: string;
    /** V0.2.3.4: Additive scanner execution metadata */
    scanners?: Array<{
      name: "semgrep" | "gitleaks" | "pi-external" | "pi-local";
      status: "ok" | "failed" | "skipped" | "fallback";
      findings: number;
      errorCode?: "scanner_not_available" | "scanner_timeout" | "scanner_exec_failed" | "scanner_invalid_output" | "scanner_network_error";
      message?: string;
    }>;
  };
}

/**
 * Generate unique scan ID.
 */
export function generateScanId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `scan_${timestamp}_${random}`;
}

/**
 * Determine if a file should be included in scan.
 */
function shouldIncludeFile(
  filePath: string,
  options: ScanOptions
): boolean {
  const includeExts = options.includeExtensions || DEFAULT_SCAN_OPTIONS.includeExtensions!;
  const excludeDirs = options.excludeDirs || DEFAULT_SCAN_OPTIONS.excludeDirs!;

  // Check if file is in excluded directory
  const pathParts = filePath.split('/');
  for (const part of pathParts) {
    if (excludeDirs.includes(part)) {
      return false;
    }
  }

  // Check file extension
  const hasValidExtension = includeExts.some(ext => filePath.endsWith(ext));
  return hasValidExtension;
}

const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };

export function sortFindings(findings: Finding[]): Finding[] {
  return findings.sort((a, b) => {
    if (severityOrder[a.severity] !== severityOrder[b.severity]) {
      return severityOrder[a.severity] - severityOrder[b.severity];
    }
    if (a.file !== b.file) {
      return a.file.localeCompare(b.file);
    }
    return a.line - b.line;
  });
}

/**
 * Run scan on mock file system.
 *
 * For V0.1 demo, this accepts a list of mock files.
 * Production would clone the repo and scan real files.
 *
 * @param repoUrl - Repository URL being scanned
 * @param files - Mock file system (array of file objects)
 * @param options - Scan configuration options
 * @returns Complete scan report
 */
export async function runScan(
  repoUrl: string,
  files: MockFile[],
  options: ScanOptions = {}
): Promise<ScanReport> {
  const opts = { ...DEFAULT_SCAN_OPTIONS, ...options };
  const scanId = generateScanId();
  const scannedAt = new Date().toISOString();

  // Filter and limit files
  const filesToScan = files
    .filter(f => shouldIncludeFile(f.path, opts))
    .slice(0, opts.maxFiles || DEFAULT_SCAN_OPTIONS.maxFiles!);

  // V0.2.3.4: Use pi-pipeline helper instead of direct detector registration
  // Track scanner metadata across all files (accumulate findings, merge status by priority)
  // V0.2.3.4: Aggregate PI findings across all files
  let totalPIFindings = 0;
  // Status priority (risk-first): failed > fallback > ok > skipped
  const statusPriority: Record<string, number> = { failed: 4, fallback: 3, ok: 2, skipped: 1 };
  let highestPriorityStatus: "ok" | "failed" | "fallback" | "skipped" | null = null;
  let firstNonOkError: { errorCode?: string; message?: string } | null = null;

  const allFindings: Finding[] = [];

  for (const file of filesToScan) {
    // V0.2.3.4: Use pi-pipeline helper for external PI detection
    // Temporary interface for compatibility
    let externalResult: {
      detected: boolean;
      method: 'external' | 'local';
      ruleId?: 'PI-1-INSTRUCTION-OVERRIDE' | 'PI-2-PROMPT-SECRET-EXFIL';
      snippet?: string;
      line?: number;
      error?: string;
    } = {
      detected: false,
      method: 'local',
    };

    // External PI detection must never block baseline local scanning.
    try {
      const piResult = await runExternalPIDetection(file.content, file.path, {
        enableExternal: opts.enableExternalPI,
        fallbackToLocal: opts.fallbackToLocal,
      });

      // V0.2.3.4: Accumulate PI findings across all files
      totalPIFindings += piResult.findings;

      // V0.2.3.4: Track highest priority status across all files
      if (!highestPriorityStatus || statusPriority[piResult.status] > statusPriority[highestPriorityStatus]) {
        highestPriorityStatus = piResult.status;
      }

      // Track first non-ok error for diagnostic context
      if (piResult.status !== 'ok' && !firstNonOkError) {
        firstNonOkError = {
          errorCode: piResult.errorCode,
          message: piResult.message,
        };
      }

      // Convert PI pipeline result to external result format for compatibility
      externalResult = {
        detected: piResult.findings > 0,
        method: piResult.method,
        ruleId: piResult.ruleId,
        snippet: piResult.snippet,
        line: piResult.line,
        error: piResult.message,
      };

      // Convert to finding if detected
      const externalFinding = externalResultToFinding(externalResult, file.path);
      if (externalFinding) {
        allFindings.push(externalFinding);
      }
    } catch (error) {
      console.warn(`Failed to run external PI detection on ${file.path}, falling back to local rules:`, error);

      // Track failed status for error case
      if (!highestPriorityStatus || statusPriority.failed > statusPriority[highestPriorityStatus]) {
        highestPriorityStatus = 'failed';
      }
      if (!firstNonOkError) {
        firstNonOkError = {
          errorCode: 'scanner_exec_failed',
          message: error instanceof Error ? error.message.substring(0, 200) : 'Unknown error',
        };
      }
    }

    try {
      // Only skip local PI rules when external path really executed.
      const skipPIRules =
        externalResult.method === 'external'
          ? ['PI-1-INSTRUCTION-OVERRIDE', 'PI-2-PROMPT-SECRET-EXFIL']
          : undefined;
      const findings = runAllRules(file.content, file.path, skipPIRules);
      allFindings.push(...findings);
    } catch (error) {
      // Log but don't fail entire scan
      console.warn(`Failed to scan file ${file.path}:`, error);
    }
  }

  // Sort findings by severity (critical first) then by file path
  sortFindings(allFindings);

  // Calculate score
  const scoreResult = calculateScoreResult(allFindings);

  // V0.2.3.4: Build aggregated PI scanner metadata
  const scannersMetadata = [];
  if (highestPriorityStatus) {
    // Determine scanner name based on status
    // - If status is 'ok', we used external method
    // - If status is 'fallback', we fell back to local
    // - If status is 'failed', could be either (use 'pi-local' as safe default)
    const scannerName: "pi-external" | "pi-local" = highestPriorityStatus === 'ok' ? 'pi-external' : 'pi-local';

    scannersMetadata.push({
      name: scannerName,
      status: highestPriorityStatus,
      findings: totalPIFindings,
      errorCode: firstNonOkError?.errorCode as ("scanner_not_available" | "scanner_timeout" | "scanner_exec_failed" | "scanner_invalid_output" | "scanner_network_error" | undefined),
      message: firstNonOkError?.message,
    });
  }

  // Build report
  const report: ScanReport = {
    id: scanId,
    repoUrl,
    score: scoreResult.score,
    grade: scoreResult.grade,
    status: scoreResult.status,
    summary: scoreResult.summary,
    findings: allFindings,
    engineVersion: 'v0.2.3', // Updated version
    scannedAt,
    scanMeta: {
      // V0.2.3.4: Additive scanner metadata with aggregated PI status
      scanners: scannersMetadata.length > 0 ? scannersMetadata : undefined,
    },
  };

  return report;
}

/**
 * Run scan on a single file content.
 *
 * Useful for testing individual files or API-based scanning.
 */
export function runScanOnFile(
  repoUrl: string,
  filePath: string,
  content: string
): ScanReport {
  const scanId = generateScanId();
  const scannedAt = new Date().toISOString();

  const findings = runAllRules(content, filePath);
  const scoreResult = calculateScoreResult(findings);

  // Sort findings
  sortFindings(findings);

  return {
    id: scanId,
    repoUrl,
    score: scoreResult.score,
    grade: scoreResult.grade,
    status: scoreResult.status,
    summary: scoreResult.summary,
    findings,
    engineVersion: 'v0.2.3',
    scannedAt,
  };
}

/**
 * Validate scan report structure.
 *
 * Ensures report matches the spec contract.
 */
export function validateReport(report: ScanReport): boolean {
  // Required fields
  const requiredFields = [
    'id',
    'repoUrl',
    'score',
    'grade',
    'status',
    'summary',
    'findings',
    'engineVersion',
    'scannedAt',
  ];

  for (const field of requiredFields) {
    if (!(field in report)) {
      return false;
    }
  }

  // Score range
  if (report.score < 0 || report.score > 100) {
    return false;
  }

  // Grade values
  if (!['A', 'B', 'C'].includes(report.grade)) {
    return false;
  }

  // Status values
  if (!['safe', 'needs_review', 'risky'].includes(report.status)) {
    return false;
  }

  // Summary structure
  const summaryFields: Array<keyof ScanReport["summary"]> = ['critical', 'high', 'medium', 'low'];
  for (const field of summaryFields) {
    if (typeof report.summary[field] !== 'number') {
      return false;
    }
  }

  // Findings array
  if (!Array.isArray(report.findings)) {
    return false;
  }

  // Validate each finding
  for (const finding of report.findings) {
    const requiredFindingFields = [
      'ruleId',
      'severity',
      'title',
      'file',
      'line',
      'snippet',
      'recommendation',
    ];

    for (const field of requiredFindingFields) {
      if (!(field in finding)) {
        return false;
      }
    }

    if (!['critical', 'high', 'medium', 'low'].includes(finding.severity)) {
      return false;
    }
  }

  // Engine version
  if (!/^v0\.\d+(\.\d+)?$/.test(report.engineVersion)) {
    return false;
  }

  // ISO8601 timestamp (basic check)
  if (!report.scannedAt.match(/^\d{4}-\d{2}-\d{2}T/)) {
    return false;
  }

  return true;
}
