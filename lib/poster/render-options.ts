/**
 * Poster Render Options
 *
 * Grade config loading, render option resolution, and shared utility helpers.
 * V0.2.4.0 Core Render Engine
 */

import fs from "node:fs";
import path from "node:path";
import type {
  Grade,
  GradeConfig,
  GradeConfigEntry,
  PosterRenderModel,
  RenderOptions,
} from "./poster-types";

export type {
  Grade,
  GradeConfig,
  GradeConfigEntry,
  PosterRenderModel,
  RenderOptions,
} from "./poster-types";

type BeatsRange = { min: number; max: number };

const BEATS_RATIO_RANGE_BY_GRADE: Record<Grade, BeatsRange> = {
  A: { min: 85, max: 99 },
  B: { min: 65, max: 84 },
  C: { min: 35, max: 64 },
  D: { min: 5, max: 34 },
};

const DEFAULT_GRADE_CONFIG: GradeConfig = {
  version: "1.0",
  grades: [
    { grade: "A", min: 80, max: 100, color: "#7dffb1" },
    { grade: "B", min: 60, max: 79, color: "#ffdd7d" },
    { grade: "C", min: 40, max: 59, color: "#ffa57d" },
    { grade: "D", min: 0, max: 39, color: "#ff7d7d" },
  ],
};

let cachedGradeConfig: GradeConfig | null = null;

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

function isValidGradeConfig(value: unknown): value is GradeConfig {
  if (!value || typeof value !== "object") return false;

  const config = value as Record<string, unknown>;

  if (typeof config.version !== "string") return false;
  if (!Array.isArray(config.grades)) return false;

  const grades = config.grades as unknown[];
  if (grades.length === 0) return false;

  for (const entry of grades) {
    if (!entry || typeof entry !== "object") return false;
    const g = entry as Record<string, unknown>;
    if (!["A", "B", "C", "D"].includes(g.grade as string)) return false;
    if (typeof g.min !== "number" || typeof g.max !== "number") return false;
    if (g.min > g.max) return false;
    if (typeof g.color !== "string" || !isValidHexColor(g.color)) return false;
  }

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

function isValidHexColor(color: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(color);
}

export function getGradeForScore(score: number, config?: GradeConfig): Grade {
  const gradeConfig = config ?? loadGradeConfig();
  const clampedScore = clamp(score, 0, 100);

  for (const entry of gradeConfig.grades) {
    if (clampedScore >= entry.min && clampedScore <= entry.max) {
      return entry.grade;
    }
  }

  return "D";
}

export function getColorForGrade(grade: Grade, config?: GradeConfig): string {
  const gradeConfig = config ?? loadGradeConfig();

  for (const entry of gradeConfig.grades) {
    if (entry.grade === grade) {
      return entry.color;
    }
  }

  return "#ff7d7d";
}

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

export function normalizeMultilineText(value: string): string {
  return value.replaceAll("\\n", "\n");
}

export function normalizeHexColor(hex?: string): string | undefined {
  if (!hex) return undefined;

  const value = hex.trim();

  if (/^#[0-9a-fA-F]{6}$/.test(value)) return value;

  if (/^#[0-9a-fA-F]{8}$/.test(value)) {
    const r = parseInt(value.slice(1, 3), 16);
    const g = parseInt(value.slice(3, 5), 16);
    const b = parseInt(value.slice(5, 7), 16);
    const a = parseInt(value.slice(7, 9), 16) / 255;
    return `rgba(${r}, ${g}, ${b}, ${a.toFixed(3)})`;
  }

  return value;
}

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

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function hashToUint32(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function deriveDeterministicBeatsRatio(
  scanId: string,
  score: number,
  grade: Grade
): string {
  const range = BEATS_RATIO_RANGE_BY_GRADE[grade] ?? BEATS_RATIO_RANGE_BY_GRADE.D;
  const span = range.max - range.min + 1;
  const seed = `${scanId}:${Math.round(score)}:${grade}`;
  const value = range.min + (hashToUint32(seed) % span);
  return `${value}%`;
}

export function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
    .replaceAll("\n", "<br/>");
}

export function mapFontFamily(family?: string): string {
  if (!family) return "VT323";
  if (family === "IBM Plex Sans Condensed") return "IBM Plex Sans Condensed";
  if (family === "Press Start 2P") return "Press Start 2P";
  if (family === "VT323") return "VT323";
  return family;
}

export function mapFontWeight(weight?: string | number): number {
  if (typeof weight === "number") return weight;
  if (weight === "normal" || !weight) return 400;
  const parsed = Number(weight);
  return Number.isFinite(parsed) ? parsed : 400;
}

export function getAlignX(value?: string): string {
  if (value === "center") return "center";
  if (value === "right") return "flex-end";
  return "flex-start";
}

export function getAlignY(value?: string): string {
  if (value === "middle") return "center";
  if (value === "bottom") return "flex-end";
  return "flex-start";
}
