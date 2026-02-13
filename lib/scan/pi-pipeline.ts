/**
 * Prompt Injection Pipeline Helper
 *
 * V0.2.3.4: Extracts PI execution wiring into dedicated module.
 * Provides narrow helper API for pipeline.ts to run external PI detection
 * with fallback handling and normalized output structure.
 */

import { ExternalPIOrchestrator, ExternalPIDetector, ExternalPIResult } from './external-pi-adapter';
import { PromptfooDetector } from './external-pi-detectors/promptfoo-detector';
import type { ScannerErrorCode, ScannerExecutionStatus } from './scan-types';

/**
 * PI execution status (v0.2.3.4) - alias for backward compatibility
 */
export type PIExecutionStatus = ScannerExecutionStatus;

/**
 * Normalized PI execution result (v0.2.3.4)
 * Returns a pipeline-consumable structure with method/status/error-domain fields.
 */
export interface PIExecutionResult {
  status: PIExecutionStatus;
  method: "external" | "local";
  findings: number;
  ruleId?: "PI-1-INSTRUCTION-OVERRIDE" | "PI-2-PROMPT-SECRET-EXFIL";
  snippet?: string;
  line?: number;
  errorCode?: ScannerErrorCode;
  message?: string;
}

/**
 * PI Pipeline configuration (v0.2.3.4)
 */
export interface PIPipelineConfig {
  enableExternal: boolean;
  fallbackToLocal: boolean;
  detectors?: ExternalPIDetector[];
}

/**
 * Create PI pipeline orchestrator with default configuration.
 */
export function createPIOrchestrator(config?: Partial<PIPipelineConfig>): ExternalPIOrchestrator {
  return new ExternalPIOrchestrator({
    enableExternal: config?.enableExternal ?? true,
    fallbackToLocal: config?.fallbackToLocal ?? true,
    detectors: config?.detectors ?? [new PromptfooDetector()],
  });
}

/**
 * Map external PI result to normalized execution result (v0.2.3.4).
 *
 * Converts ExternalPIResult to PIExecutionResult with stable error codes.
 * Handles different error scenarios and maps them to appropriate domain codes.
 *
 * Order of checks matters: fallback > error > success > skipped
 */
function mapToExecutionResult(externalResult: ExternalPIResult, fallbackOccurred: boolean): PIExecutionResult {
  const findings = externalResult.detected ? 1 : 0;

  // V0.2.3.4: Check fallback FIRST before error handling
  // This ensures "external failed + local fallback" is marked as 'fallback', not 'failed'
  if (fallbackOccurred && externalResult.method === 'local') {
    return {
      status: 'fallback',
      method: 'local',
      findings,
      ruleId: externalResult.ruleId,
      snippet: externalResult.snippet,
      line: externalResult.line,
      message: externalResult.error?.substring(0, 200) || 'External detectors unavailable, fell back to local rules',
    };
  }

  // Handle error cases (non-fallback failures)
  if (externalResult.error) {
    const errorLower = externalResult.error.toLowerCase();

    // Map raw errors to stable domain codes (per spec section 7)
    let errorCode: ScannerErrorCode | undefined;
    if (errorLower.includes('not available') || errorLower.includes('not configured')) {
      errorCode = 'scanner_not_available';
    } else if (errorLower.includes('timeout')) {
      errorCode = 'scanner_timeout';
    } else if (errorLower.includes('network') || errorLower.includes('dns') || errorLower.includes('connection')) {
      errorCode = 'scanner_network_error';
    } else if (errorLower.includes('parse') || errorLower.includes('invalid') || errorLower.includes('malformed')) {
      errorCode = 'scanner_invalid_output';
    } else {
      errorCode = 'scanner_exec_failed';
    }

    return {
      status: 'failed',
      method: externalResult.method === 'external' ? 'external' : 'local',
      findings,
      ruleId: externalResult.ruleId,
      snippet: externalResult.snippet,
      line: externalResult.line,
      errorCode,
      message: externalResult.error.substring(0, 200), // Sanitize to short text
    };
  }

  // Handle successful cases
  if (externalResult.method === 'external') {
    return {
      status: 'ok',
      method: 'external',
      findings,
      ruleId: externalResult.ruleId,
      snippet: externalResult.snippet,
      line: externalResult.line,
    };
  }

  // Skipped case (no detectors configured and fallback disabled)
  return {
    status: 'skipped',
    method: 'local',
    findings,
    ruleId: externalResult.ruleId,
    snippet: externalResult.snippet,
    line: externalResult.line,
  };
}

/**
 * Run external PI detection with fallback handling (v0.2.3.4).
 *
 * This is the required API from spec section 5.1. It provides a narrow helper
 * interface for pipeline.ts to run PI detection without depending on detector
 * registration details.
 *
 * @param content - File content to scan
 * @param filePath - File path for reporting
 * @param options - Optional configuration
 * @returns Promise<PIExecutionResult> with normalized result
 */
export async function runExternalPIDetection(
  content: string,
  filePath: string,
  options?: { fallbackToLocal?: boolean; enableExternal?: boolean },
): Promise<PIExecutionResult> {
  // Create orchestrator with provided options
  const orchestrator = createPIOrchestrator({
    enableExternal: options?.enableExternal,
    fallbackToLocal: options?.fallbackToLocal,
  });

  // Track if fallback occurred
  let fallbackOccurred = false;

  try {
    // Run detection via orchestrator
    const result = await orchestrator.detect(content, filePath);

    // Determine if fallback occurred
    fallbackOccurred = Boolean(
      result.method === 'local' &&
      (result.error?.includes('unavailable') || result.error?.includes('failed'))
    );

    return mapToExecutionResult(result, fallbackOccurred);
  } catch (error) {
    // Catch-all error handling - map to stable domain code
    const errorMessage = error instanceof Error ? error.message : String(error);

    return {
      status: 'failed',
      method: 'local',
      findings: 0,
      ruleId: undefined,
      snippet: undefined,
      line: undefined,
      errorCode: 'scanner_exec_failed',
      message: `PI detection error: ${errorMessage}`.substring(0, 200),
    };
  }
}
