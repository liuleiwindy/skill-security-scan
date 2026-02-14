export type Grade = "A" | "B" | "C" | "D";
export type ScanStatus = "safe" | "needs_review" | "risky";

export interface ScanReport {
  id: string;
  repoUrl: string;
  score: number;
  grade?: Grade;
  status?: ScanStatus;
  summary: { critical: number; high: number; medium: number; low: number };
  engineVersion: string;
  scannedAt: string;
  scanMeta?: {
    source?: string;
    packageName?: string;
    packageVersion?: string;
  };
}

export interface PosterRenderModel {
  id: string;
  header: string;
  proof: string;
  repoLabel: string;
  repoValue: string;
  grade: Grade;
  scoreText: string;
  beatsText: string;
  beatsRatio: string;
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
  textOverrides?: Record<string, string>;
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
