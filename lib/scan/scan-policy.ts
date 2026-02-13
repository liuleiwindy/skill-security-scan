import type { ScanOptions } from "./scan-types";

/**
 * Centralized scan policy defaults and limits.
 *
 * V0.2.3.1: this file only consolidates existing constants.
 * Behavior must remain identical to previous scattered definitions.
 */

/**
 * Default scan options previously defined in engine.ts
 */
export const DEFAULT_SCAN_OPTIONS: ScanOptions = {
  maxFiles: 100, // Reasonable limit for demo
  includeExtensions: [
    ".txt",
    ".md",
    ".markdown",
    ".js",
    ".ts",
    ".jsx",
    ".tsx",
    ".py",
    ".rb",
    ".go",
    ".java",
    ".sh",
    ".bash",
    ".yml",
    ".yaml",
    ".json",
    ".env",
    ".env.example",
    ".config",
    ".conf",
  ],
  excludeDirs: [
    "node_modules",
    "vendor",
    ".git",
    "dist",
    "build",
    "coverage",
    ".next",
    ".nuxt",
    "target",
    "bin",
    "obj",
  ],
  enableExternalPI: true, // V0.2.3: External PI detection enabled by default
  fallbackToLocal: true, // V0.2.3: Local fallback enabled by default
};

/**
 * GitHub intake defaults previously defined in github.ts
 */
export const GITHUB_DEFAULT_TIMEOUT_MS = 25_000;
export const GITHUB_DEFAULT_MAX_FILE_BYTES = 300 * 1024;

/**
 * NPM intake defaults previously defined in npm.ts
 */
export const NPM_DEFAULT_TIMEOUT_MS = 25_000;
export const NPM_DEFAULT_MAX_TARBALL_BYTES = 10 * 1024 * 1024;
export const NPM_DEFAULT_MAX_EXTRACTED_FILES = 300;
export const NPM_DEFAULT_MAX_FILE_BYTES = 300 * 1024;

/**
 * skills add GitHub dynamic scope controls
 * previously defined in store.ts
 */
export const SKILLS_ADD_GITHUB_TIMEOUT_MS = 45_000;
export const SKILLS_ADD_MAX_ROOTS = 20;

export function prioritizeSkillRoots(skillRoots: string[], maxRoots: number): string[] {
  const unique = [...new Set(skillRoots.map((root) => root.trim()).filter(Boolean))];
  // Prefer shallower roots first to maximize coverage under timeout constraints.
  unique.sort((a, b) => {
    const depthDiff = a.split("/").length - b.split("/").length;
    if (depthDiff !== 0) return depthDiff;
    return a.localeCompare(b);
  });
  return unique.slice(0, maxRoots);
}

