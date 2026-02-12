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

