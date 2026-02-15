# OpenSpec Released Spec: Security Scan Viral Trust Loop V0.2.4.0 (Core Render Engine)

## 0. Meta

- Date: 2026-02-14
- Stage: Released
- Owner: Product + Engineering
- Parent master spec: `specs/active/2026-02-14-security-scan-viral-trust-loop-v0.2.4.md`
- Proposal source: `specs/proposals/2026-02-13-security-scan-viral-trust-loop-v0.2.4.md`
- Previous release baseline: `specs/released/2026-02-13-security-scan-abuse-fallback-controls-v0.2.3.5.md`

## 1. Objective

Ship V0.2.4.0 as the production-ready poster rendering core:

1. extract current POC into reusable modules
2. stabilize `.pen` template semantics and parameter injection
3. establish deterministic PNG output and core tests

## 2. Scope (Only V0.2.4.0)

1. Build `PosterRenderCore` in `lib/poster/`.
2. Keep `.pen` as runtime template source (filesystem parse, no MCP dependency).
3. Implement file-driven grade config (`config/risk-grade.config.json`).
4. Support dynamic text/ring/color/QR overrides in renderer input.
5. Add smoke/QR/config validation tests.

## 3. Out of Scope (Deferred)

1. `GET /api/scan/:id/poster/image` route (V0.2.4.1).
2. `/scan/poster/[id]` save button integration (V0.2.4.2).
3. Visual regression release hardening (V0.2.4.3).

## 4. Technical Design

### 4.1 Technology Choices

1. `.pen` parsing
   - Use native JSON parsing (`JSON.parse`) against local `.pen` file.
   - No dedicated external parser library is required in V0.2.4.0.
2. Server-side rendering stack
   - Use `playwright-core` headless Chromium to render HTML/SVG layers and export PNG.
   - Do not use Sharp/Canvas API as the primary rendering engine in this version.
3. QR generation
   - Use `qrcode` package for URL -> QR data URL generation.
   - Style via configured dark/light colors, then composite into template slot.
4. Fonts
   - Use `@fontsource/*` assets and embed via data URL in render document.

### 4.2 Rendering Contract

Template source of truth: `scan-poster.pen`

Required semantics:

1. Layer order:
   - base image
   - progress elements (`progress-track`, `progress-background`, `progress-bar`)
   - text layers
   - QR layer
   - optional CRT/glow overlays
2. `progress-bar` geometry semantics follow Pencil definitions (start/gap direction preserved).
3. Font loading pinned and embedded for consistent output.
4. Deterministic output for same inputs.

Implementation policy for V0.2.4.0:

1. Keep template geometry in `.pen` (no coordinate hardcoding in TS business logic).
2. TS rendering code is responsible for:
   - template parsing
   - parameter injection
   - layer composition and export
3. If template evolves, changes should be done in `.pen` first, then mapping updates in code.
4. Pencil MCP is optional for design-time editing only; runtime rendering reads `.pen` from filesystem directly and does not call MCP.

### 4.2.1 `.pen` Node Mapping (Current Template Baseline)

Source file: `assets/poster/template/scan-poster.pen`.

Progress node mapping:

1. `progress-track` -> `XXSGi`
2. `progress-background` -> `cKx8m`
3. `progress-bar` -> `usy8R`
4. `qrcode` rectangle -> `2VtpU`

Primary text node mapping:

1. `header` -> `ECJzv`
2. `proof` -> `pWzXq`
3. `repoLabel` -> `0xiLo`
4. `repoValue` -> `TCqtL`
5. `grade` -> `MnBcS`
6. `scoreText` -> `QmvPl`
7. `beatsText` -> `ANZlB`
8. `beatsRatio` -> `nrEJR`
9. `criticalLabel` -> `oFXT6`
10. `criticalNumber` -> `ei9oQ`
11. `highLabel` -> `Dq11K`
12. `highNumber` -> `srQLh`
13. `mediumLabel` -> `J8PGm`
14. `mediumNumber` -> `SyUkn`
15. `lowLabel` -> `hNP49`
16. `lowNumber` -> `F8674`
17. `cta` -> `aYAuH`
18. `short` -> `A56m7`

Notes:

1. Some text nodes may exist outside the main frame in `.pen`; renderer must merge frame and root-level text lookup.
2. Mapping is locked per template version; when template changes, this table must be updated in the same PR.

### 4.3 Base Asset Strategy

1. Base background images are stored in repository assets (versioned):
   - e.g. `assets/poster/base/base-clean-v1.jpg`
2. `.pen` references base image via relative path.
3. Runtime can optionally override base image path for controlled deployment/debug usage, but business defaults come from repository assets.
4. Release checklist must lock a single base image variant per template version to avoid visual drift.

Repository-first constraint (must):

1. Template, base images, and grade config are code-managed in repository by default.
2. V0.2.4 release does not depend on remote asset service for these core files.
3. Runtime override is optional and non-default; core functionality must work with repository assets only.

Required repository layout:

1. `assets/poster/template/scan-poster.pen`
2. `assets/poster/base/base-clean-v1.jpg` (and optional variants)
3. `config/risk-grade.config.json`

### 4.4 QR Integration Strategy

1. Reuse existing real-link QR capability from previous versions (target remains report URL).
2. Upgrade visual style from pure black/white to poster-aligned palette:
   - dark modules use configured deep-green
   - light modules use high-contrast light background
3. QR rendering must preserve scannability:
   - error correction level `H`
   - non-zero quiet zone
   - no overlay on QR content area
4. QR is composited into template-defined QR slot only; no dynamic repositioning.

### 4.4.1 Data Models (TypeScript Contracts)

```ts
export interface ScanReport {
  id: string;
  repoUrl: string;
  score: number;
  grade: "A" | "B" | "C" | "D";
  status: "safe" | "needs_review" | "risky";
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
  grade: "A" | "B" | "C" | "D";
  scoreText: string;         // e.g. "SCORE\\n90/100"
  beatsText: string;         // e.g. "BEATS\\nOF REPOS"
  beatsRatio: string;        // e.g. "78%"
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
```

### 4.5 Risk Grade Configuration (ABCD, File-Driven)

Risk grade ranges and colors must be managed by config file, not environment variables.

1. Config file path:
   - `config/risk-grade.config.json`
2. Example shape:
   - `version`
   - `grades[]`: `{ grade, min, max, color }`
   - reference example:

```json
{
  "version": "1.0",
  "grades": [
    { "grade": "A", "min": 80, "max": 100, "color": "#7dffb1" },
    { "grade": "B", "min": 60, "max": 79, "color": "#b8ff7d" },
    { "grade": "C", "min": 40, "max": 59, "color": "#ffdd7d" },
    { "grade": "D", "min": 0, "max": 39, "color": "#ff7d7d" }
  ]
}
```
3. Required rules:
   - grades cover `0..100`
   - no overlapping ranges
   - `min <= max`
   - color format valid
4. Renderer and poster-domain mapping must consume this config as single source of truth for:
   - score -> grade
   - grade -> theme color
5. Startup/runtime validation:
   - invalid config produces typed error log
   - fallback policy must be deterministic (documented default config)

### 4.6 Parameter Contract

Poster image endpoint supports additive overrides:

1. Text fields:
   - header/proof/repo label/repo value
   - grade/score
   - beats split: `beatsText`, `beatsRatio`
   - severity labels + numbers (critical/high/medium/low)
   - CTA/brand short text
2. Ring fields:
   - `ringPercent` (0-100)
   - `progressTrackColor`
   - `progressBackgroundColor`
   - `progressBarColor`
   - optional `scoreThemeColor`
3. QR/base fields:
   - `qrUrl`
   - optional template base image override for controlled environments

Rules:

1. Missing overrides fallback to domain defaults.
2. `ringPercent` fallback parses score fraction (`90/100 -> 90`).
3. Unsupported params are rejected (`400`) or ignored by strict allowlist policy (implementation must choose one and document it consistently).
4. Grade and default score theme color are resolved from `config/risk-grade.config.json`.

### 4.7 API Contract

1. `GET /api/scan/:id/poster`
   - Keep backward compatibility.
   - May add non-breaking fields only.

2. `GET /api/scan/:id/poster/image`
   - Returns `image/png`.
   - `404` when scan not found.
   - `400` for invalid override params.
   - `500` for renderer failure.
   - Include cache headers suitable for CDN/browser caching.

Concrete contract:

1. Example request
   - `GET /api/scan/scan_123/poster/image?ringPercent=90&beatsRatio=91%25&progressBarColor=%237dffb1`
2. Success response
   - status: `200`
   - headers:
     - `Content-Type: image/png`
     - `Cache-Control: public, max-age=300, s-maxage=300, stale-while-revalidate=86400`
     - `ETag: "<hash>"`
   - body: PNG binary
3. Error response format (JSON)
   - `{"error":"<code>","message":"<human-readable>","requestId":"<optional-id>"}`
4. Error codes
   - `400`: `invalid_poster_params`
   - `404`: `scan_not_found`
   - `500`: `poster_render_failed`

### 4.8 Test Strategy (V0.2.4.0 Focus)

Use a four-layer test strategy:

1. Unit tests
   - render option parser/defaulting
   - risk-grade config validation
   - score fraction to ring percent conversion
2. Renderer smoke tests
   - PNG signature check
   - dimension check
   - non-empty buffer check
3. Visual regression tests
   - fixed sample matrix (A/B/C/D + severity variants)
   - baseline image diff threshold
4. QR decodability tests
   - decode QR region from output
   - assert decoded URL equals expected report URL

### 4.8.1 Test Data Fixtures (Required)

Smoke render fixture (example):

```json
{
  "id": "scan_fixture_v0240",
  "header": "SYSTEM INTEGRITY CHECK // REPORT",
  "proof": "PROOF ID: X9K2 · 2026-02-14 14:32 UTC",
  "repoLabel": "REPO:",
  "repoValue": "facebook/react/security-scan-fixture-mini",
  "grade": "B",
  "scoreText": "SCORE\\n69/100",
  "beatsText": "BEATS\\nOF REPOS",
  "beatsRatio": "78%",
  "criticalLabel": "CRITICAL",
  "criticalNumber": "[ 1 ]",
  "highLabel": "HIGH",
  "highNumber": "[ 2 ]",
  "mediumLabel": "MEDIUM",
  "mediumNumber": "[ 0 ]",
  "lowLabel": "LOW",
  "lowNumber": "[ 0 ]",
  "cta": "> SCAN TO VERIFY REPORT DETAILS <",
  "short": "POWERED BY MYSKILL.AI",
  "qrUrl": "https://secscan.dev/r/X9K2"
}
```

QR test URL fixture:

1. default: `https://secscan.dev/r/X9K2`
2. secondary: `https://example.com/scan/report/scan_fixture_v0240`

Expected assertions:

1. output is valid PNG and expected dimensions (`687x1024` for current template).
2. decoded QR payload equals fixture URL exactly.

### 4.9 POC Baseline and Migration Entry

POC source for extraction in V0.2.4.0:

1. Historical POC script (already migrated and removed from active tree).

Migration target modules:

1. `lib/poster/render-options.ts`
2. `lib/poster/render-poster.ts`

### 4.10 Deployment Context and Dependencies

1. Deployment context
   - Integrated into existing Next.js app (`app/api/...` routes), not a standalone microservice in V0.2.4.0.
2. Runtime dependencies
   - `playwright` (runtime rendering)
   - `qrcode` (QR generation)
   - `@fontsource/*` (embedded fonts)
3. Operational requirement
   - Chromium runtime must be available in execution environment for Playwright.

### 4.10.1 Environment Strategy (Local vs Vercel)

Use dual launch strategy:

1. Local development (macOS/Linux dev machine)
   - `playwright-core` + local Chrome executable path.
2. Vercel Node runtime (serverless)
   - `playwright-core` + `@sparticuz/chromium`.

Implementation note:

1. `@sparticuz/chromium` is serverless-oriented and may fail on local macOS with executable format errors (`ENOEXEC`); this is expected and not a production blocker.
2. Renderer must select executable strategy by environment and expose clear diagnostics when launch fails.

Validation status (completed in local verification):

1. `playwright-core + @sparticuz/chromium` on local macOS: failed with `ENOEXEC` (expected compatibility behavior).
2. `playwright-core + local Chrome` on local macOS: succeeded and produced screenshot artifact.

## 5. Deliverables

1. `lib/poster/render-options.ts`
2. `lib/poster/render-poster.ts`
3. `config/risk-grade.config.json`
4. test set for parser/smoke/QR/config validation

## 6. Acceptance Criteria

1. Renderer returns deterministic PNG for fixed inputs.
2. Dynamic fields and ring colors are effective.
3. QR is scannable and decodes to expected URL.
4. Grade mapping comes from config file (not env).
5. `npm test` and `npm run build` pass.

## 7. Post-Release Stability Backlog (V0.2.4.x)

These are follow-up hardening items and are not release blockers for V0.2.4.0:

1. Add render hard-timeout guard in poster rendering path to prevent long-running Chromium sessions.
2. Add explicit close path for page/context/browser objects with safe error swallowing in teardown.
3. Implement and validate environment-based launcher selection:
   - local: `playwright-core + local Chrome`
   - Vercel: `playwright-core + @sparticuz/chromium`
4. Add runtime observability:
   - per-render duration
   - memory usage snapshots
   - timeout/error rate metrics
5. Run Vercel load verification on poster endpoint and define alert thresholds for memory and timeout regressions.
