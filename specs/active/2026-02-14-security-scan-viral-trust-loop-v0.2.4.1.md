# OpenSpec Active Spec: Security Scan Viral Trust Loop V0.2.4.1 (Data and API Integration)

## 0. Meta

- Date: 2026-02-14
- Stage: Active
- Owner: Product + Engineering
- Parent master spec: `specs/active/2026-02-14-security-scan-viral-trust-loop-v0.2.4.md`
- Previous slice baseline: `specs/active/2026-02-14-security-scan-viral-trust-loop-v0.2.4.0.md`

## 1. Objective

Ship V0.2.4.1 as the integration slice between existing scan/report data and the poster rendering core:

1. build report-to-poster domain mapping
2. expose production image endpoint
3. keep existing poster JSON endpoint backward-compatible

## 2. Scope (Only V0.2.4.1)

1. Implement `PosterDomain` mapper (`ScanReport -> PosterRenderModel`).
2. Add `GET /api/scan/:id/poster/image` endpoint.
3. Keep `GET /api/scan/:id/poster` contract backward-compatible while allowing additive fields.
4. Add API-level tests (contract, error shape, cache headers, integration success path).

## 3. Out of Scope (Deferred)

1. `/scan/poster/[id]` page integration and save button (`v0.2.4.2`).
2. Visual regression matrix expansion and release hardening (`v0.2.4.3`).
3. Runtime stability optimization track (pooling/telemetry hardening) beyond current baseline.

## 4. Technical Design

### 4.1 Integration Topology

1. `PosterDomain`
   - input: persisted report entity (`ScanReport`-like)
   - output: normalized `PosterRenderModel`
2. `PosterApi`
   - parse/validate request
   - fetch report
   - map to poster model
   - apply optional allowlisted overrides
   - call `PosterRenderCore` and return PNG
3. `PosterRenderCore`
   - reuse V0.2.4.0 modules under `lib/poster/`

### 4.2 Type Contracts

```ts
export interface ScanReport {
  id: string;
  repoUrl: string;
  score: number;
  summary: { critical: number; high: number; medium: number; low: number };
  scannedAt: string;
  engineVersion: string;
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
  grade: "A" | "B" | "C" | "D";
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

export interface ImageQueryOverrides {
  score?: number;
  beatsRatio?: string;
  proof?: string;
  short?: string;
  ringPercent?: number;
  progressBarColor?: string;
}
```

### 4.3 API Contracts

1. `GET /api/scan/:id/poster`
   - behavior: preserve old contract; allow additive fields only
   - response: JSON (`application/json`)
2. `GET /api/scan/:id/poster/image`
   - behavior: return rendered PNG
   - success response:
     - status: `200`
     - content-type: `image/png`
     - body: PNG bytes
   - request query (allowlist):
     - `score`, `beatsRatio`, `proof`, `short`, `ringPercent`, `progressBarColor`
   - unsupported query keys:
     - strict mode: `400` with typed error body

Error response shape (all poster API errors):

```json
{
  "code": "POSTER_INVALID_QUERY",
  "message": "Unsupported query parameter: foo",
  "requestId": "req_xxx"
}
```

### 4.4 Cache Policy

1. image success:
   - `Cache-Control: public, max-age=60, s-maxage=300`
2. image failure:
   - `Cache-Control: no-store`
3. cache key inputs:
   - `scan id`
   - all effective query overrides
   - template/version marker (if wired in current runtime)

### 4.5 Grade and Color Resolution

1. Grade/ring default color must come from `config/risk-grade.config.json`.
2. Mapping path:
   - `score -> grade` via config ranges
   - `grade -> color` via config color
3. query override color (if provided and valid) can replace default progress color only for that request.

### 4.5.1 Beats Ratio (Deterministic Placeholder Rule)

Before real percentile ranking is available, `beatsRatio` uses deterministic pseudo-random generation.

1. Purpose:
   - provide socially meaningful placeholder value
   - avoid unstable random changes between refreshes
2. Determinism:
   - seed inputs: `scanId + score + grade`
   - same seed must always produce same `beatsRatio`
3. Grade ranges:
   - `A`: `85-99`
   - `B`: `65-84`
   - `C`: `35-64`
   - `D`: `5-34`
4. Output format:
   - percentage string like `"78%"`
5. Forward plan:
   - replace this module with real ranking percentile after enough scan history is accumulated
   - keep output field name unchanged (`beatsRatio`) for compatibility

### 4.5.2 Proof/Repo/QR Mapping Rules

1. Proof time formatting:
   - input source: `ScanReport.scannedAt`
   - output format: `YYYY-MM-DD HH:mm UTC`
   - timezone policy: always UTC, not local timezone dependent
2. `repoValue` mapping:
   - GitHub scan: render `owner/repo` style path
   - npm/npx scan: prefer `packageName@version` from `scanMeta`, fallback to `packageName`
   - final fallback: sanitized `repoUrl` text
3. `qrUrl` policy:
   - no short-link module in V0.2.4.1
   - target route fixed to report detail `/scan/report/{id}`
   - image endpoint runtime should resolve absolute URL using current request host when available

### 4.6 Runtime and Deployment Notes

1. local:
   - `playwright-core` + local Chrome executable
2. Vercel:
   - `playwright-core` + `@sparticuz/chromium`
3. launch diagnostics on failure must include:
   - launch mode
   - executable path
   - essential env flags (sanitized)

### 4.7 Minimum Vercel Validation (Slice Gate)

V0.2.4.1 must include minimum deploy-time verification in Preview environment:

1. Smoke endpoint check:
   - call `GET /api/scan/:id/poster/image` on Preview URL
   - assert `200` and `content-type=image/png`
2. Runtime boot check:
   - assert Chromium launch path resolves in Vercel mode
   - collect launch diagnostics on failure
3. Basic output check:
   - PNG dimensions match expected poster size
   - QR decodes to expected report URL for fixture scan id

This slice does not require full release gate thresholds; those belong to `v0.2.4.3`.

## 5. Test Plan (V0.2.4.1)

1. API contract tests
   - `GET /api/scan/:id/poster/image` returns `200` + `image/png`
   - unsupported query key returns `400` + typed error JSON
2. mapping tests
   - score boundary cases: `39/40/59/60/79/80/100`
   - expected grade and default color derived from config
   - `beatsRatio` deterministic placeholder rule (stable + in-grade range)
   - proof time UTC formatting is stable for offset timestamps
   - repoValue mapping for GitHub vs npm (`packageName@version` fallback chain)
   - qrUrl maps to report route (no short-link path)
3. integration tests
   - same input deterministic output hash
   - generated QR decodes to expected report URL
   - required poster text fields are present in model before render
4. Preview validation checks
   - run smoke check against deployed Preview URL
   - verify Chromium launch mode is Vercel-compatible

## 6. Acceptance Criteria

1. Real scan id path works: `scan -> report -> poster image`.
2. Existing `GET /api/scan/:id/poster` consumers are unaffected.
3. `GET /api/scan/:id/poster/image` supports required allowlisted overrides.
4. Cache headers and error contract match this spec.
5. `npm test` and `npm run build` pass for integration slice.
6. Preview smoke validation passes for poster image endpoint.
