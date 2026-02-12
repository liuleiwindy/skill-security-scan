/**
 * External PI Detection Adapter Interface
 *
 * V0.2.3: Supports external tooling (e.g., promptfoo) as primary detector
 * with local deterministic rules as fallback.
 *
 * This allows the system to:
 * 1. Use external AI/API tools for more accurate detection
 * 2. Fall back to local rules when external tools are unavailable
 * 3. Maintain detection priority order: external > local
 */

export interface ExternalPIDetector {
  /**
   * Unique identifier for this detector
   */
  id: string;

  /**
   * Human-readable name
   */
  name: string;

  /**
   * Priority order (lower number = higher priority)
   * External tools should have priority < local rules
   */
  priority: number;

  /**
   * Check if this detector is available (configured credentials, network access)
   */
  isAvailable(): Promise<boolean>;

  /**
   * Run external PI detection
   * @param content - File content to scan
   * @param filePath - File path for reporting
   * @returns Promise<ExternalPIResult>
   */
  detect(content: string, filePath: string): Promise<ExternalPIResult>;
}

export interface ExternalPIResult {
  /**
   * Whether prompt-injection was detected
   */
  detected: boolean;

  /**
   * Confidence score (0-1) from external tool
   */
  confidence?: number;

  /**
   * Rule classification (PI-1 or PI-2)
   */
  ruleId?: 'PI-1-INSTRUCTION-OVERRIDE' | 'PI-2-PROMPT-SECRET-EXFIL';

  /**
   * Evidence snippet (max 200 chars per spec)
   */
  snippet?: string;

  /**
   * Line number where detection occurred
   */
  line?: number;

  /**
   * Error message if detection failed
   */
  error?: string;

  /**
   * Detector ID that made the detection
   */
  detector?: string;

  /**
   * Detection method: 'external' or 'local' or 'none'
   */
  method?: 'external' | 'local' | 'none';
}

/**
 * Configuration for external PI detectors
 */
export interface ExternalPIConfig {
  /**
   * Array of detectors in priority order
   */
  detectors: ExternalPIDetector[];

  /**
   * Enable/disable external tooling
   */
  enableExternal: boolean;

  /**
   * Fallback to local rules when external fails
   */
  fallbackToLocal: boolean;
}

/**
 * External PI detection orchestrator
 * Manages multiple detectors and runs them in priority order
 */
export class ExternalPIOrchestrator {
  private config: ExternalPIConfig;

  constructor(config: ExternalPIConfig) {
    this.config = {
      enableExternal: config.enableExternal ?? true,
      fallbackToLocal: config.fallbackToLocal ?? true,
      detectors: config.detectors ?? [],
    };
  }

  /**
   * Run all detectors in priority order
   * Stops at first successful detection
   * Returns fallback to local detection if all fail
   */
  async detect(
    content: string,
    filePath: string
  ): Promise<ExternalPIResult> {
    // Sort detectors by priority (lower number = higher priority)
    const sortedDetectors = [...this.config.detectors].sort((a, b) => a.priority - b.priority);

    // Try external detectors first (if enabled)
    if (this.config.enableExternal) {
      for (const detector of sortedDetectors) {
        if (await detector.isAvailable()) {
          const result = await detector.detect(content, filePath);
          // Return first successful detection
          if (result.detected) {
            return {
              ...result,
              detector: detector.id,
              method: 'external',
            };
          }
        }
      }
    }

    // Fallback to local detection if enabled and all externals failed
    if (this.config.fallbackToLocal) {
      return {
        detected: false,
        method: 'local',
        error: 'External detectors unavailable or failed',
      };
    }

    // No fallback available
    return {
      detected: false,
      method: 'none',
      error: 'No detectors configured and local fallback disabled',
    };
  }

  /**
   * Get detector by ID
   */
  getDetector(id: string): ExternalPIDetector | undefined {
    return this.config.detectors.find((d) => d.id === id);
  }
}

/**
 * Convert external PI result to Finding format
 */
export function externalResultToFinding(
  result: ExternalPIResult,
  filePath: string
): import('./rules').Finding | null {
  if (!result.detected || !result.ruleId || !result.snippet) {
    return null;
  }

  return {
    ruleId: result.ruleId,
    severity: 'high',
    title:
      result.ruleId === 'PI-1-INSTRUCTION-OVERRIDE'
        ? 'Prompt injection: instruction override pattern'
        : 'Prompt injection: prompt/secret exfiltration pattern',
    file: filePath,
    line: result.line ?? 1,
    snippet: result.snippet!.substring(0, 200), // Enforce 200 char limit
    recommendation:
      result.ruleId === 'PI-1-INSTRUCTION-OVERRIDE'
        ? 'Do not allow instruction-priority override requests. Enforce system/developer policy precedence.'
        : 'Do not reveal system prompts, internal policies, or sensitive configuration in responses.',
  };
}
