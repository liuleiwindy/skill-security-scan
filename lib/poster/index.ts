/**
 * Poster Render Module
 *
 * V0.2.4.0 Core Render Engine
 * V0.2.4.1 Data and API Integration
 */

// Types
export type {
  Grade,
  ScanStatus,
  ScanReport,
  PosterRenderModel,
  RenderOptions,
  GradeConfig,
  GradeConfigEntry,
  PenNode,
  PenDoc,
  PenFill,
  PenEffect,
  ProgressNodes,
  TextOverrides,
} from "./poster-types.js";

// Render options utilities
export {
  type ResolvedRenderOptions,
  loadGradeConfig,
  getGradeForScore,
  getColorForGrade,
  deriveDeterministicBeatsRatio,
  parseScorePercent,
  normalizeMultilineText,
  normalizeHexColor,
  resolveRenderOptions,
  clamp,
  escapeHtml,
  mapFontFamily,
  mapFontWeight,
  getAlignX,
  getAlignY,
} from "./render-options.js";

// Report -> model mapping
export {
  DEFAULT_POSTER_MODEL,
  createPosterModelFromScanReport,
} from "./model-mapper.js";

// Core renderer
export {
  renderPoster,
  renderPosterToFile,
  type RenderResult,
  type RendererConfig,
} from "./render-poster.js";

// Query parser (V0.2.4.1)
export {
  parsePosterQueryOverrides,
  generateRequestId,
  createPosterApiError,
  type ImageQueryOverrides,
  type PosterApiError,
  type ParseResult,
} from "./query-parser.js";
