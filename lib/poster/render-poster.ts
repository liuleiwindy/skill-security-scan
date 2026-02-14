/**
 * Poster Render Core
 *
 * Core rendering engine for generating poster PNG images from .pen templates.
 * V0.2.4.0 Core Render Engine
 *
 * Dual launch strategy:
 * - Local development (macOS/Linux): playwright-core + local Chrome
 * - Vercel serverless: playwright-core + @sparticuz/chromium
 */

import fs from "node:fs/promises";
import path from "node:path";
import { chromium, type Browser } from "playwright-core";
import QRCode from "qrcode";
import {
  type PosterRenderModel,
  type RenderOptions,
  type GradeConfig,
  type PenNode,
  type PenDoc,
  type ProgressNodes,
  type TextOverrides,
  loadGradeConfig,
  resolveRenderOptions,
  normalizeHexColor,
  normalizeMultilineText,
  escapeHtml,
  mapFontFamily,
  mapFontWeight,
  getAlignX,
  getAlignY,
  clamp,
} from "./render-options.js";

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_TEMPLATE_PATH = "assets/poster/template/scan-poster.pen";
const DEFAULT_BASE_IMAGE_NAME = "base-clean-v1.jpg";

// Chrome executable paths for local development (macOS/Linux)
const LOCAL_CHROME_PATHS = [
  // macOS
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  // Linux
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  // Windows (via WSL or similar)
  "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe",
];

// Environment detection
const IS_VERCEL = Boolean(
  process.env.VERCEL || process.env.VERCEL_ENV || process.env.AWS_LAMBDA_FUNCTION_NAME
);

// ============================================================================
// Types
// ============================================================================

export interface RenderResult {
  success: boolean;
  buffer?: Buffer;
  error?: string;
  dimensions?: { width: number; height: number };
}

export interface RendererConfig {
  templatePath?: string;
  baseImagePath?: string;
  chromeExecutablePath?: string;
  headless?: boolean;
}

// ============================================================================
// Template Parsing
// ============================================================================

/**
 * Load and parse .pen template file
 */
async function loadTemplate(templatePath: string): Promise<PenDoc> {
  const raw = await fs.readFile(templatePath, "utf-8");
  return JSON.parse(raw) as PenDoc;
}

/**
 * Find the main frame in template
 */
function findMainFrame(doc: PenDoc): PenNode | undefined {
  return doc.children.find((node) => node.type === "frame");
}

/**
 * Find base image rectangle in template
 */
function findBaseRect(frame: PenNode): PenNode | undefined {
  return frame.children?.find(
    (node) =>
      node.type === "rectangle" &&
      typeof node.fill === "object" &&
      node.fill?.type === "image" &&
      node.enabled !== false
  );
}

/**
 * Find QR code rectangle in template
 */
function findQrRect(frame: PenNode): PenNode | undefined {
  return frame.children?.find(
    (node) => node.type === "rectangle" && node.id === "2VtpU"
  );
}

/**
 * Find progress nodes by name prefix
 */
function findProgressNodes(frame: PenNode): ProgressNodes {
  return frame.children?.reduce<ProgressNodes>((acc, node) => {
    const name = (node.name ?? "").toLowerCase();
    if (name.startsWith("progress-track")) acc.track = node;
    if (name.startsWith("progress-background")) acc.background = node;
    if (name.startsWith("progress-bar")) acc.bar = node;
    return acc;
  }, {}) ?? {};
}

/**
 * Get all text nodes from template (frame children + root level)
 */
function getAllTextNodes(doc: PenDoc, frame: PenNode): PenNode[] {
  const frameTexts = frame.children?.filter((n) => n.type === "text") ?? [];
  const rootTexts = doc.children.filter((n) => n.type === "text");
  return [...frameTexts, ...rootTexts];
}

// ============================================================================
// Content Resolution
// ============================================================================

/**
 * Node ID to model field mapping (spec 4.2.1)
 */
const NODE_ID_MAPPING: Record<string, keyof PosterRenderModel> = {
  ECJzv: "header",
  pWzXq: "proof",
  "0xiLo": "repoLabel",
  TCqtL: "repoValue",
  MnBcS: "grade",
  QmvPl: "scoreText",
  ANZlB: "beatsText",
  nrEJR: "beatsRatio",
  oFXT6: "criticalLabel",
  ei9oQ: "criticalNumber",
  Dq11K: "highLabel",
  srQLh: "highNumber",
  J8PGm: "mediumLabel",
  SyUkn: "mediumNumber",
  hNP49: "lowLabel",
  F8674: "lowNumber",
  aYAuH: "cta",
  A56m7: "short",
};

/**
 * Resolve content for a text node
 */
function resolveContent(
  node: PenNode,
  model: PosterRenderModel,
  overrides: TextOverrides
): string {
  // Check overrides first (by id or name)
  if (overrides[node.id] !== undefined) {
    return normalizeMultilineText(overrides[node.id]);
  }
  if (node.name && overrides[node.name] !== undefined) {
    return normalizeMultilineText(overrides[node.name]);
  }

  // Check mapping
  const field = NODE_ID_MAPPING[node.id];
  if (field) {
    return normalizeMultilineText(model[field] ?? "");
  }

  // Fallback to node content
  return normalizeMultilineText(node.content ?? "");
}

// ============================================================================
// Layer Building
// ============================================================================

/**
 * Build SVG ellipse layer for progress rings
 */
function buildEllipseLayer(
  node: PenNode,
  options?: {
    forceSweepDeg?: number;
    colorOverride?: string;
    glowId?: string;
    glowStrength?: number;
    startOffsetDeg?: number;
  }
): string {
  const x = node.x ?? 0;
  const y = node.y ?? 0;
  const w = node.width ?? 0;
  const h = node.height ?? 0;
  if (!w || !h) return "";

  const outerRadius = Math.min(w, h) / 2;
  const innerRatio = clamp(node.innerRadius ?? 0, 0, 0.999);
  const innerRadius = outerRadius * innerRatio;
  const strokeWidth = Math.max(1, outerRadius - innerRadius);
  const midRadius = outerRadius - strokeWidth / 2;
  const fillColor =
    normalizeHexColor(
      options?.colorOverride ??
        (typeof node.fill === "string" ? node.fill : "#ffffff")
    ) ?? "#ffffff";

  const hasArc =
    typeof node.sweepAngle === "number" && typeof node.startAngle === "number";
  const sweep =
    options?.forceSweepDeg ??
    (hasArc ? clamp(Math.abs(node.sweepAngle ?? 0), 0, 360) : 360);
  const start =
    (hasArc ? node.startAngle ?? 0 : 0) + (options?.startOffsetDeg ?? 0);
  const circumference = 2 * Math.PI * midRadius;
  const dash = (circumference * sweep) / 360;
  const gap = Math.max(0, circumference - dash);
  const cx = w / 2;
  const cy = h / 2;
  const rotate = Number.isFinite(node.rotation) ? (node.rotation ?? 0) : 0;
  const glowId = options?.glowId ?? "ellipseGlow";
  const glowStrength = options?.glowStrength ?? 2.2;

  return `<svg style="
      position:absolute;
      left:${Math.round(x)}px;
      top:${Math.round(y)}px;
      width:${Math.round(w)}px;
      height:${Math.round(h)}px;
      overflow:visible;
      pointer-events:none;
      transform: rotate(${rotate}deg);
    " viewBox="0 0 ${w} ${h}">
      <defs>
        <filter id="${glowId}" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="${glowStrength}" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <ellipse
        cx="${cx}"
        cy="${cy}"
        rx="${midRadius}"
        ry="${midRadius}"
        fill="none"
        stroke="${fillColor}"
        stroke-width="${strokeWidth}"
        stroke-linecap="butt"
        transform="rotate(${start} ${cx} ${cy})"
        ${
          hasArc || options?.forceSweepDeg !== undefined
            ? `stroke-dasharray="${dash} ${gap}"`
            : ""
        }
        filter="url(#${glowId})"
      />
    </svg>`;
}

/**
 * Build text layers HTML
 */
function buildTextLayers(
  textNodes: PenNode[],
  model: PosterRenderModel,
  overrides: TextOverrides,
  scoreThemeColor?: string
): string {
  return textNodes
    .map((node) => {
      const x = Math.round(node.x ?? 0);
      const y = Math.round(node.y ?? 0);
      const w = Math.round(node.width ?? 0);
      const h = Math.round(node.height ?? 0);
      const baseColor =
        normalizeHexColor(
          typeof node.fill === "string" ? node.fill : "#ffffff"
        ) ?? "#ffffff";

      // Apply theme color to grade and score nodes
      const color =
        node.id === "MnBcS" || node.id === "QmvPl"
          ? scoreThemeColor ?? baseColor
          : baseColor;

      const content = resolveContent(node, model, overrides);
      const family = mapFontFamily(node.fontFamily);
      const fontSize = node.fontSize ?? 16;
      const fontWeight = mapFontWeight(node.fontWeight);
      const letterSpacing = node.letterSpacing ?? 0;

      const shadow =
        node.effect?.type === "shadow"
          ? `${node.effect.offset?.x ?? 0}px ${node.effect.offset?.y ?? 0}px ${
              node.effect.blur ?? 0
            }px ${normalizeHexColor(node.effect.color) ?? "rgba(0,0,0,.25)"}`
          : "";

      return `<div style="
        position:absolute;
        left:${x}px;
        top:${y}px;
        width:${w}px;
        height:${h}px;
        display:flex;
        align-items:${getAlignY(node.textAlignVertical)};
        justify-content:${getAlignX(node.textAlign)};
        text-align:${node.textAlign ?? "left"};
        white-space:pre-line;
        font-family:'${family}';
        font-size:${fontSize}px;
        font-weight:${fontWeight};
        letter-spacing:${letterSpacing}px;
        color:${color};
        line-height:1;
        ${shadow ? `text-shadow:${shadow};` : ""}
        filter: drop-shadow(0 0 2px rgba(180,255,210,0.2));
      ">${escapeHtml(content)}</div>`;
    })
    .join("\n");
}

/**
 * Build QR code layer
 */
async function buildQrLayer(
  qrRect: PenNode | undefined,
  qrUrl: string
): Promise<string> {
  if (!qrRect || !qrRect.width || !qrRect.height) {
    return "";
  }

  const qrDataUrl = await QRCode.toDataURL(qrUrl, {
    width: Math.round(qrRect.width),
    margin: 1,
    errorCorrectionLevel: "H",
    color: { dark: "#215c3f", light: "#f3fff6" },
  });

  const x = Math.round(qrRect.x ?? 0);
  const y = Math.round(qrRect.y ?? 0);
  const w = Math.round(qrRect.width);
  const h = Math.round(qrRect.height);

  return `<div style="
          position:absolute;
          left:${x}px;
          top:${y}px;
          width:${w}px;
          height:${h}px;
          background:${
            normalizeHexColor(
              typeof qrRect.fill === "string" ? qrRect.fill : "#d9d9d9ff"
            ) ?? "#d9d9d9"
          };
          opacity:${qrRect.opacity ?? 1};
          border:${qrRect.stroke?.thickness ?? 0}px solid rgba(255,255,255,0.25);
        "></div>
        <img src="${qrDataUrl}" style="
          position:absolute;
          left:${x}px;
          top:${y}px;
          width:${w}px;
          height:${h}px;
          filter: drop-shadow(0 0 6px rgba(142,252,188,0.42));
        "/>`;
}

/**
 * Build progress ring layers from named nodes
 */
function buildProgressLayers(
  progressNodes: ProgressNodes,
  ringPercent: number,
  options: {
    progressTrackColor?: string;
    progressBackgroundColor?: string;
    progressBarColor?: string;
  }
): string {
  const { track, background, bar } = progressNodes;
  if (!track && !background && !bar) return "";

  const parts: string[] = [];
  const progressBarStartOffsetDeg = 180;

  if (track) {
    parts.push(
      buildEllipseLayer(track, {
        colorOverride: options.progressTrackColor,
        glowId: "progressTrackGlow",
        glowStrength: 1.8,
      })
    );
  }

  if (background) {
    parts.push(
      buildEllipseLayer(background, {
        colorOverride: options.progressBackgroundColor,
        glowId: "progressBgGlow",
        glowStrength: 2.2,
      })
    );
  }

  if (bar) {
    const barAnchor = track ?? bar;
    const barLayerNode: PenNode = {
      ...bar,
      x: barAnchor.x,
      y: barAnchor.y,
      width: barAnchor.width,
      height: barAnchor.height,
    };
    parts.push(
      buildEllipseLayer(barLayerNode, {
        forceSweepDeg: (ringPercent / 100) * 360,
        colorOverride: options.progressBarColor,
        glowId: "progressBarGlow",
        glowStrength: 2.6,
        startOffsetDeg: progressBarStartOffsetDeg,
      })
    );
  }

  return parts.join("\n");
}

// ============================================================================
// Font Loading
// ============================================================================

async function loadFonts(): Promise<{
  pressStart: Buffer;
  vt323: Buffer;
  ibmCondensed: Buffer;
}> {
  const root = process.cwd();

  const [pressStart, vt323, ibmCondensed] = await Promise.all([
    fs.readFile(
      path.join(
        root,
        "node_modules/@fontsource/press-start-2p/files/press-start-2p-latin-400-normal.woff"
      )
    ),
    fs.readFile(
      path.join(
        root,
        "node_modules/@fontsource/vt323/files/vt323-latin-400-normal.woff"
      )
    ),
    fs.readFile(
      path.join(
        root,
        "node_modules/@fontsource/ibm-plex-sans-condensed/files/ibm-plex-sans-condensed-latin-600-normal.woff"
      )
    ),
  ]);

  return { pressStart, vt323, ibmCondensed };
}

// ============================================================================
// HTML Document Building
// ============================================================================

function buildHtmlDocument(
  frameWidth: number,
  frameHeight: number,
  baseImageDataUrl: string,
  fonts: { pressStart: Buffer; vt323: Buffer; ibmCondensed: Buffer },
  layers: {
    ellipseLayers: string;
    progressLayers: string;
    textLayers: string;
    qrLayer: string;
    crtEnabled: boolean;
  }
): string {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <style>
    @font-face { font-family: "Press Start 2P"; src: url("data:font/woff;base64,${fonts.pressStart.toString(
      "base64"
    )}") format("woff"); font-weight: 400; }
    @font-face { font-family: "VT323"; src: url("data:font/woff;base64,${fonts.vt323.toString(
      "base64"
    )}") format("woff"); font-weight: 400; }
    @font-face { font-family: "IBM Plex Sans Condensed"; src: url("data:font/woff;base64,${fonts.ibmCondensed.toString(
      "base64"
    )}") format("woff"); font-weight: 600; }
    * { box-sizing: border-box; margin:0; padding:0; }
    body { width:${frameWidth}px; height:${frameHeight}px; overflow:hidden; background:#000; }
    .frame { position:relative; width:${frameWidth}px; height:${frameHeight}px; }
    .base { position:absolute; left:0; top:0; width:${frameWidth}px; height:${frameHeight}px; object-fit:cover; }
    .crt {
      position:absolute;
      inset:0;
      pointer-events:none;
      background:
        linear-gradient(rgba(255,255,255,0.02), rgba(0,0,0,0.14)),
        repeating-linear-gradient(
          to bottom,
          rgba(255,255,255,0.045) 0px,
          rgba(255,255,255,0.045) 1px,
          rgba(0,0,0,0) 2px,
          rgba(0,0,0,0) 4px
        );
      mix-blend-mode: screen;
      opacity: 0.36;
    }
    .crt-vignette {
      position:absolute;
      inset:0;
      pointer-events:none;
      box-shadow: inset 0 0 56px rgba(0,0,0,0.42);
      border-radius: 40px;
    }
    .crt-warp {
      position:absolute;
      inset:0;
      pointer-events:none;
      border-radius: 40px;
      transform: perspective(880px) rotateX(1.2deg) scale(1.008, 0.992);
      box-shadow: inset 0 0 22px rgba(126, 255, 200, 0.1);
    }
  </style>
</head>
<body>
  <div class="frame">
    <img class="base" src="${baseImageDataUrl}" />
    ${layers.ellipseLayers}
    ${layers.progressLayers}
    ${layers.textLayers}
    ${layers.qrLayer}
    ${
      layers.crtEnabled
        ? `<div class="crt"></div><div class="crt-vignette"></div><div class="crt-warp"></div>`
        : ""
    }
  </div>
</body>
</html>`;
}

// ============================================================================
// Chrome Browser Management (Dual Launch Strategy)
// ============================================================================

/**
 * Find available Chrome executable for local development
 */
async function findLocalChromeExecutable(): Promise<string | undefined> {
  for (const chromePath of LOCAL_CHROME_PATHS) {
    try {
      await fs.access(chromePath);
      return chromePath;
    } catch {
      // Continue to next path
    }
  }
  return undefined;
}

/**
 * Get Chromium executable for Vercel serverless environment
 * Uses @sparticuz/chromium package
 */
async function getVercelChromiumExecutable(): Promise<string | undefined> {
  try {
    // Dynamic import for @sparticuz/chromium (optional dependency)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const sparticuzChromium = await import("@sparticuz/chromium");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    const executablePath = sparticuzChromium.default?.executablePath
      ? sparticuzChromium.default.executablePath()
      : undefined;
    return executablePath;
  } catch {
    return undefined;
  }
}

/**
 * Detect current environment
 */
function detectEnvironment(): "local" | "vercel" {
  return IS_VERCEL ? "vercel" : "local";
}

/**
 * Create browser instance with appropriate executable based on environment
 *
 * Strategy:
 * - Local development: Use playwright-core + local Chrome
 * - Vercel serverless: Use playwright-core + @sparticuz/chromium
 *
 * Note: @sparticuz/chromium may fail on local macOS with ENOEXEC error;
 * this is expected and not a production blocker.
 */
async function createBrowser(
  customExecutablePath?: string
): Promise<Browser> {
  const environment = detectEnvironment();

  // If custom path provided, use it directly
  if (customExecutablePath) {
    return chromium.launch({
      headless: true,
      executablePath: customExecutablePath,
    });
  }

  // Environment-based selection
  if (environment === "vercel") {
    const vercelExecutable = await getVercelChromiumExecutable();
    if (vercelExecutable) {
      return chromium.launch({
        headless: true,
        executablePath: vercelExecutable,
      });
    }
    // Fall through to local Chrome if @sparticuz/chromium not available
  }

  // Local development: find local Chrome
  const localExecutable = await findLocalChromeExecutable();
  if (localExecutable) {
    return chromium.launch({
      headless: true,
      executablePath: localExecutable,
    });
  }

  // No executable found - provide helpful error message
  const errorMessage =
    environment === "vercel"
      ? "Chrome executable not found. Please ensure @sparticuz/chromium is installed as a dependency."
      : "Chrome executable not found. Please install Chrome or specify chromeExecutablePath in renderer config.";

  throw new Error(errorMessage);
}

// ============================================================================
// Main Render Function
// ============================================================================

/**
 * Render poster image from model and options
 */
export async function renderPoster(
  model: PosterRenderModel,
  options: RenderOptions = {},
  config: RendererConfig = {}
): Promise<RenderResult> {
  let browser: Browser | undefined;

  try {
    // Resolve paths
    const templatePath = path.resolve(
      config.templatePath ??
        path.join(process.cwd(), DEFAULT_TEMPLATE_PATH)
    );

    // Load template
    const doc = await loadTemplate(templatePath);
    const frame = findMainFrame(doc);

    if (!frame || !frame.children) {
      return {
        success: false,
        error: "Invalid .pen file: missing root frame",
      };
    }

    const frameWidth = Math.round(frame.width ?? 687);
    const frameHeight = Math.round(frame.height ?? 1024);

    // Find template nodes
    const baseRect = findBaseRect(frame);
    const qrRect = findQrRect(frame);
    const progressNodes = findProgressNodes(frame);
    const textNodes = getAllTextNodes(doc, frame);
    const hasNamedProgress = Boolean(
      progressNodes.track || progressNodes.background || progressNodes.bar
    );

    // Resolve base image
    let baseImagePath = config.baseImagePath ?? options.baseImagePath;

    if (!baseImagePath && baseRect && typeof baseRect.fill === "object") {
      baseImagePath = path.resolve(
        path.dirname(templatePath),
        baseRect.fill.url
      );
    }

    // Check if base image exists, fallback if needed
    let finalBaseImagePath = baseImagePath;
    if (finalBaseImagePath) {
      try {
        await fs.access(finalBaseImagePath);
      } catch {
        // Try fallback base image
        const fallbackPath = path.join(
          process.cwd(),
          "assets/poster/base",
          DEFAULT_BASE_IMAGE_NAME
        );
        try {
          await fs.access(fallbackPath);
          finalBaseImagePath = fallbackPath;
        } catch {
          return {
            success: false,
            error: `Base image not found: ${baseImagePath}`,
          };
        }
      }
    } else {
      return {
        success: false,
        error: "No base image path specified and none found in template",
      };
    }

    // Load base image as data URL
    const baseImageData = await fs.readFile(finalBaseImagePath);
    const ext = path.extname(finalBaseImagePath).toLowerCase();
    const mimeType = ext === ".png" ? "image/png" : "image/jpeg";
    const baseImageDataUrl = `data:${mimeType};base64,${baseImageData.toString(
      "base64"
    )}`;

    // Resolve render options
    const resolvedOptions = resolveRenderOptions(model, options);

    // Load fonts
    const fonts = await loadFonts();

    // Build layers
    const textLayers = buildTextLayers(
      textNodes,
      model,
      resolvedOptions.textOverrides,
      resolvedOptions.scoreThemeColor
    );

    const qrLayer = await buildQrLayer(qrRect, model.qrUrl);

    const progressLayers = hasNamedProgress
      ? buildProgressLayers(progressNodes, resolvedOptions.ringPercent, {
          progressTrackColor: resolvedOptions.progressTrackColor,
          progressBackgroundColor: resolvedOptions.progressBackgroundColor,
          progressBarColor: resolvedOptions.progressBarColor,
        })
      : "";

    // Build ellipse layers (non-progress ellipses)
    const ellipseLayers = frame.children
      .filter((node) => {
        if (node.type !== "ellipse" || node.enabled === false) return false;
        if (
          hasNamedProgress &&
          (node.name ?? "").toLowerCase().startsWith("progress")
        )
          return false;
        return true;
      })
      .map((node) => {
        const x = node.x ?? 0;
        const y = node.y ?? 0;
        const w = node.width ?? 0;
        const h = node.height ?? 0;
        const outerRadius = Math.min(w, h) / 2;
        const innerRatio = clamp(node.innerRadius ?? 0, 0, 0.999);
        const innerRadius = outerRadius * innerRatio;
        const strokeWidth = Math.max(1, outerRadius - innerRadius);
        const midRadius = outerRadius - strokeWidth / 2;
        const fillColor =
          normalizeHexColor(
            typeof node.fill === "string" ? node.fill : "#ffffff"
          ) ?? "#ffffff";
        const hasArc =
          typeof node.sweepAngle === "number" &&
          typeof node.startAngle === "number";
        const sweep = hasArc ? clamp(Math.abs(node.sweepAngle ?? 0), 0, 360) : 360;
        const start = hasArc ? (node.startAngle ?? -90) : -90;
        const circumference = 2 * Math.PI * midRadius;
        const dash = (circumference * sweep) / 360;
        const gap = Math.max(0, circumference - dash);
        const cx = w / 2;
        const cy = h / 2;
        const rotate = Number.isFinite(node.rotation) ? (node.rotation ?? 0) : 0;

        return `<svg style="
          position:absolute;
          left:${Math.round(x)}px;
          top:${Math.round(y)}px;
          width:${Math.round(w)}px;
          height:${Math.round(h)}px;
          overflow:visible;
          pointer-events:none;
          transform: rotate(${rotate}deg);
          filter: drop-shadow(0 0 5px rgba(252,229,123,0.38));
        " viewBox="0 0 ${w} ${h}">
          <ellipse
            cx="${cx}"
            cy="${cy}"
            rx="${midRadius}"
            ry="${midRadius}"
            fill="none"
            stroke="${fillColor}"
            stroke-width="${strokeWidth}"
            stroke-linecap="butt"
            transform="rotate(${start + 90} ${cx} ${cy})"
            ${hasArc ? `stroke-dasharray="${dash} ${gap}"` : ""}
          />
        </svg>`;
      })
      .join("\n");

    // Build HTML document
    const html = buildHtmlDocument(
      frameWidth,
      frameHeight,
      baseImageDataUrl,
      fonts,
      {
        ellipseLayers,
        progressLayers,
        textLayers,
        qrLayer,
        crtEnabled: false, // CRT effect disabled by default
      }
    );

    // Launch browser and render
    browser = await createBrowser(config.chromeExecutablePath);

    const page = await browser.newPage({
      viewport: { width: frameWidth, height: frameHeight },
      deviceScaleFactor: 1,
    });

    await page.setContent(html, { waitUntil: "load" });
    await page.evaluate(async () => {
      // Wait for fonts to load
      if (document.fonts?.ready) await document.fonts.ready;
    });

    // Capture screenshot
    const buffer = await page.screenshot({ type: "png" });

    return {
      success: true,
      buffer,
      dimensions: { width: frameWidth, height: frameHeight },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Render poster to file
 */
export async function renderPosterToFile(
  outputPath: string,
  model: PosterRenderModel,
  options: RenderOptions = {},
  config: RendererConfig = {}
): Promise<RenderResult> {
  const result = await renderPoster(model, options, config);

  if (result.success && result.buffer) {
    await fs.mkdir(path.dirname(path.resolve(outputPath)), { recursive: true });
    await fs.writeFile(outputPath, result.buffer);
  }

  return result;
}

// Re-export types and utilities
export {
  type PosterRenderModel,
  type RenderOptions,
  type GradeConfig,
  loadGradeConfig,
  resolveRenderOptions,
};
