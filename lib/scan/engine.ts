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
import { ExternalPIOrchestrator, ExternalPIResult, externalResultToFinding } from './external-pi-adapter';
import { PromptfooDetector } from './external-pi-detectors/promptfoo-detector';

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
  };
}

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
 * Default scan options for V0.1 demo.
 */
export const DEFAULT_SCAN_OPTIONS: ScanOptions = {
  maxFiles: 100, // Reasonable limit for demo
  includeExtensions: [
    '.txt',
    '.md',
    '.markdown',
    '.js',
    '.ts',
    '.jsx',
    '.tsx',
    '.py',
    '.rb',
    '.go',
    '.java',
    '.sh',
    '.bash',
    '.yml',
    '.yaml',
    '.json',
    '.env',
    '.env.example',
    '.config',
    '.conf',
  ],
  excludeDirs: [
    'node_modules',
    'vendor',
    '.git',
    'dist',
    'build',
    'coverage',
    '.next',
    '.nuxt',
    'target',
    'bin',
    'obj',
  ],
  enableExternalPI: true, // V0.2.3: External PI detection enabled by default
  fallbackToLocal: true, // V0.2.3: Local fallback enabled by default
};

/**
 * Mock file system interface.
 *
 * In V0.1, this is a simplified interface.
 * Production would integrate with actual git clone and file system access.
 */
export interface MockFile {
  path: string;
  content: string;
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

  // Initialize external PI orchestrator with available detectors
  const piOrchestrator = new ExternalPIOrchestrator({
    enableExternal: opts.enableExternalPI ?? true,
    fallbackToLocal: opts.fallbackToLocal ?? true,
    detectors: [new PromptfooDetector()], // Register available detector(s)
  });

  const allFindings: Finding[] = [];

  for (const file of filesToScan) {
    let externalResult: ExternalPIResult = {
      detected: false,
      method: 'local',
    };

    // External PI detection must never block baseline local scanning.
    try {
      externalResult = await piOrchestrator.detect(file.content, file.path);
      const externalFinding = externalResultToFinding(externalResult, file.path);
      if (externalFinding) {
        allFindings.push(externalFinding);
      }
    } catch (error) {
      console.warn(`Failed to run external PI detection on ${file.path}, falling back to local rules:`, error);
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
