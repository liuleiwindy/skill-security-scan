/**
 * Poster Render Options
 *
 * Type definitions, option parsing, and grade config loading for poster rendering.
 * V0.2.4.0 Core Render Engine
 */

import fs from "node:fs";
import path from "node:path";

// ============================================================================
// Type Definitions
// ============================================================================

export type Grade = "A" | "B" | "C" | "D";
export type ScanStatus = "safe" | "needs_review" | "risky";

export interface ScanReport {
  id: string;
  repoUrl: string;
  score: number;
  grade: Grade;
  status: ScanStatus;
  summary: { critical: number; high: number; medium: number; low: number };
  engineVersion: string;
  scannedAt: string;
}

export interface PosterRenderModel {
  id: string;
  header: string;
  proof: string;
  repoLabel: string;
  repoValue: string;
  grade: Grade;
  scoreText: string; // e.g. "SCORE\n90/100"
  beatsText: string; // e.g. "BEATS\nOF REPOS"
  beatsRatio: string; // e.g. "78%"
  criticalLabel: string;
  criticalNumber: string;
  highLabel: string;
  highNumber: string;
  mediumLabel: string;
  mediumNumber: string;
  lowLabel: string;
  lowNumber: string;
  cta: string;
  short: string;
  qrUrl: string;
}

export interface RenderOptions {
  ringPercent?: number;
  progressTrackColor?: string;
  progressBackgroundColor?: string;
  progressBarColor?: string;
  scoreThemeColor?: string;
  baseImagePath?: string;
  textOverrides?: Record<string, string>; // by node id or name
}

export interface GradeConfigEntry {
  grade: Grade;
  min: number;
  max: number;
  color: string;
}

export interface GradeConfig {
  version: string;
  grades: GradeConfigEntry[];
}

// ============================================================================
// .pen Template Types
// ============================================================================

export type PenFill =
  | string
  | { type: "image"; enabled?: boolean; url: string; mode?: string };

export type PenEffect = {
  type: "shadow";
  color?: string;
  offset?: { x?: number; y?: number };
  blur?: number;
};

export interface PenNode {
  type: "frame" | "rectangle" | "text" | "image" | "ellipse" | string;
  id: string;
  name?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fill?: PenFill;
  opacity?: number;
  stroke?: { align?: string; thickness?: number; color?: string };
  effect?: PenEffect;
  content?: string;
  textAlign?: "left" | "center" | "right";
  textAlignVertical?: "top" | "middle" | "bottom";
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string | number;
  letterSpacing?: number;
  enabled?: boolean;
  innerRadius?: number;
  startAngle?: number;
  sweepAngle?: number;
  rotation?: number;
  children?: PenNode[];
}

export interface PenDoc {
  version: string;
  children: PenNode[];
}

export interface ProgressNodes {
  track?: PenNode;
  background?: PenNode;
  bar?: PenNode;
}

export type TextOverrides = Record<string, string>;

// ============================================================================
// Grade Config Management
// ============================================================================

const DEFAULT_GRADE_CONFIG: GradeConfig = {
  version: "1.0",
  grades: [
    { grade: "A", min: 80, max: 100, color: "#7dffb1" },
    { grade: "B", min: 60, max: 79, color: "#b8ff7d" },
    { grade: "C", min: 40, max: 59, color: "#ffdd7d" },
    { grade: "D", min: 0, max: 39, color: "#ff7d7d" },
  ],
};

let cachedGradeConfig: GradeConfig | null = null;

/**
 * Load and validate grade config from file
 */
export function loadGradeConfig(configPath?: string): GradeConfig {
  if (cachedGradeConfig) {
    return cachedGradeConfig;
  }

  const resolvedPath =
    configPath ??
    path.join(process.cwd(), "config/risk-grade.config.json");

  try {
    if (!fs.existsSync(resolvedPath)) {
      console.warn(
        `[poster] Grade config not found at ${resolvedPath}, using defaults`
      );
      cachedGradeConfig = DEFAULT_GRADE_CONFIG;
      return cachedGradeConfig;
    }

    const raw = fs.readFileSync(resolvedPath, "utf-8");
    const config = JSON.parse(raw) as unknown;

    if (!isValidGradeConfig(config)) {
      console.error(
        `[poster] Invalid grade config at ${resolvedPath}, using defaults`
      );
      cachedGradeConfig = DEFAULT_GRADE_CONFIG;
      return cachedGradeConfig;
    }

    cachedGradeConfig = config;
    return cachedGradeConfig;
  } catch (error) {
    console.error("[poster] Failed to load grade config:", error);
    cachedGradeConfig = DEFAULT_GRADE_CONFIG;
    return cachedGradeConfig;
  }
}

/**
 * Validate grade config structure
 */
function isValidGradeConfig(value: unknown): value is GradeConfig {
  if (!value || typeof value !== "object") return false;

  const config = value as Record<string, unknown>;

  if (typeof config.version !== "string") return false;
  if (!Array.isArray(config.grades)) return false;

  const grades = config.grades as unknown[];
  if (grades.length === 0) return false;

  // Check each grade entry
  for (const entry of grades) {
    if (!entry || typeof entry !== "object") return false;
    const g = entry as Record<string, unknown>;
    if (!["A", "B", "C", "D"].includes(g.grade as string)) return false;
    if (typeof g.min !== "number" || typeof g.max !== "number") return false;
    if (g.min > g.max) return false;
    if (typeof g.color !== "string" || !isValidHexColor(g.color)) return false;
  }

  // Check for full coverage (0-100) with no gaps
  const sortedGrades = [...grades]
    .map((g) => g as GradeConfigEntry)
    .sort((a, b) => a.min - b.min);

  if (sortedGrades[0].min !== 0) return false;
  if (sortedGrades[sortedGrades.length - 1].max !== 100) return false;

  for (let i = 1; i < sortedGrades.length; i++) {
    if (sortedGrades[i].min !== sortedGrades[i - 1].max + 1) return false;
  }

  return true;
}

/**
 * Validate hex color format
 */
function isValidHexColor(color: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(color);
}

/**
 * Get grade for a given score
 */
export function getGradeForScore(score: number, config?: GradeConfig): Grade {
  const gradeConfig = config ?? loadGradeConfig();
  const clampedScore = clamp(score, 0, 100);

  for (const entry of gradeConfig.grades) {
    if (clampedScore >= entry.min && clampedScore <= entry.max) {
      return entry.grade;
    }
  }

  return "D"; // fallback
}

/**
 * Get color for a given grade
 */
export function getColorForGrade(grade: Grade, config?: GradeConfig): string {
  const gradeConfig = config ?? loadGradeConfig();

  for (const entry of gradeConfig.grades) {
    if (entry.grade === grade) {
      return entry.color;
    }
  }

  return "#ff7d7d"; // fallback to D color
}

// ============================================================================
// Option Parsing
// ============================================================================

/**
 * Parse score text like "SCORE\n69/100" to extract percentage
 */
export function parseScorePercent(scoreText: string): number | undefined {
  const match = scoreText.match(/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/);
  if (!match) return undefined;

  const numerator = Number(match[1]);
  const denominator = Number(match[2]);

  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
    return undefined;
  }

  return clamp((numerator / denominator) * 100, 0, 100);
}

/**
 * Normalize multiline text (handle \\n escape sequences)
 */
export function normalizeMultilineText(value: string): string {
  return value.replaceAll("\\n", "\n");
}

/**
 * Normalize hex color (handle 8-digit hex with alpha)
 */
export function normalizeHexColor(hex?: string): string | undefined {
  if (!hex) return undefined;

  const value = hex.trim();

  // Standard 6-digit hex
  if (/^#[0-9a-fA-F]{6}$/.test(value)) return value;

  // 8-digit hex with alpha - convert to rgba
  if (/^#[0-9a-fA-F]{8}$/.test(value)) {
    const r = parseInt(value.slice(1, 3), 16);
    const g = parseInt(value.slice(3, 5), 16);
    const b = parseInt(value.slice(5, 7), 16);
    const a = parseInt(value.slice(7, 9), 16) / 255;
    return `rgba(${r}, ${g}, ${b}, ${a.toFixed(3)})`;
  }

  return value;
}

/**
 * Merge render options with defaults
 */
export interface ResolvedRenderOptions {
  ringPercent: number;
  progressTrackColor: string | undefined;
  progressBackgroundColor: string | undefined;
  progressBarColor: string;
  scoreThemeColor: string;
  baseImagePath: string | undefined;
  textOverrides: Record<string, string>;
}

export function resolveRenderOptions(
  model: PosterRenderModel,
  options: RenderOptions = {}
): ResolvedRenderOptions {
  const gradeConfig = loadGradeConfig();
  const defaultThemeColor = getColorForGrade(model.grade, gradeConfig);

  // Resolve ringPercent: explicit option > parse from scoreText > undefined
  const ringPercent =
    options.ringPercent ?? parseScorePercent(model.scoreText);

  return {
    ringPercent: ringPercent ?? 0,
    progressTrackColor: options.progressTrackColor ?? undefined,
    progressBackgroundColor: options.progressBackgroundColor ?? undefined,
    progressBarColor: options.progressBarColor ?? defaultThemeColor,
    scoreThemeColor: options.scoreThemeColor ?? defaultThemeColor,
    baseImagePath: options.baseImagePath ?? undefined,
    textOverrides: options.textOverrides ?? {},
  };
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Clamp value to range
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Escape HTML special characters
 */
export function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
    .replaceAll("\n", "<br/>");
}

/**
 * Map font family to valid CSS font name
 */
export function mapFontFamily(family?: string): string {
  if (!family) return "VT323";
  if (family === "IBM Plex Sans Condensed") return "IBM Plex Sans Condensed";
  if (family === "Press Start 2P") return "Press Start 2P";
  if (family === "VT323") return "VT323";
  return family;
}

/**
 * Map font weight to numeric value
 */
export function mapFontWeight(weight?: string | number): number {
  if (typeof weight === "number") return weight;
  if (weight === "normal" || !weight) return 400;
  const parsed = Number(weight);
  return Number.isFinite(parsed) ? parsed : 400;
}

/**
 * Get CSS align-x value
 */
export function getAlignX(value?: string): string {
  if (value === "center") return "center";
  if (value === "right") return "flex-end";
  return "flex-start";
}

/**
 * Get CSS align-y value
 */
export function getAlignY(value?: string): string {
  if (value === "middle") return "center";
  if (value === "bottom") return "flex-end";
  return "flex-start"; // default to top alignment
}

// ============================================================================
// Poster Model Defaults
// ============================================================================

export const DEFAULT_POSTER_MODEL: PosterRenderModel = {
  id: "scan_default",
  header: "SYSTEM INTEGRITY CHECK // REPORT",
  proof: "PROOF ID: X9K2 · 2026-02-14 14:32 UTC",
  repoLabel: "REPO:",
  repoValue: "example/repo",
  grade: "B",
  scoreText: "SCORE\\n69/100",
  beatsText: "BEATS\\nOF REPOS",
  beatsRatio: "78%",
  criticalLabel: "CRITICAL",
  criticalNumber: "[ 0 ]",
  highLabel: "HIGH",
  highNumber: "[ 0 ]",
  mediumLabel: "MEDIUM",
  mediumNumber: "[ 0 ]",
  lowLabel: "LOW",
  lowNumber: "[ 0 ]",
  cta: "> SCAN TO VERIFY REPORT DETAILS <",
  short: "POWERED BY MYSKILL.AI",
  qrUrl: "https://secscan.dev/r/default",
};

/**
 * Create PosterRenderModel from ScanReport
 */
export function createPosterModelFromScanReport(report: ScanReport): PosterRenderModel {
  const gradeConfig = loadGradeConfig();
  const grade = report.grade ?? getGradeForScore(report.score, gradeConfig);

  return {
    id: report.id,
    header: "SYSTEM INTEGRITY CHECK // REPORT",
    proof: `PROOF ID: ${report.id.toUpperCase().slice(0, 4)} · ${report.scannedAt}`,
    repoLabel: "REPO:",
    repoValue: report.repoUrl.replace(/^https?:\/\/github\.com\//, ""),
    grade,
    scoreText: `SCORE\\n${report.score}/100`,
    beatsText: "BEATS\\nOF REPOS",
    beatsRatio: `${report.score}%`,
    criticalLabel: "CRITICAL",
    criticalNumber: `[ ${report.summary.critical} ]`,
    highLabel: "HIGH",
    highNumber: `[ ${report.summary.high} ]`,
    mediumLabel: "MEDIUM",
    mediumNumber: `[ ${report.summary.medium} ]`,
    lowLabel: "LOW",
    lowNumber: `[ ${report.summary.low} ]`,
    cta: "> SCAN TO VERIFY REPORT DETAILS <",
    short: "POWERED BY MYSKILL.AI",
    qrUrl: `https://secscan.dev/r/${report.id}`,
  };
}
