# OpenSpec Active Spec: Security Scan Viral Trust Loop V0.2.4.2 (Poster Page + Save Flow)

## 0. Meta

- Date: 2026-02-14
- Stage: Sealed (Accepted)
- Owner: Product + Engineering
- Parent master spec: `specs/active/2026-02-14-security-scan-viral-trust-loop-v0.2.4.md`
- Previous slice baseline: `specs/active/2026-02-14-security-scan-viral-trust-loop-v0.2.4.1.md`
- Seal date: 2026-02-15

## 1. Objective

Ship V0.2.4.2 as the poster page integration slice:

1. integrate poster image endpoint into `/scan/poster/[id]`
2. deliver mobile-first one-click save flow with fallback
3. complete share handoff from poster to report via QR

## 2. Scope (Only V0.2.4.2)

1. Rework `/scan/poster/[id]` page to render generated poster image from `GET /api/scan/:id/poster/image`.
2. Implement save-to-local interaction with mobile-first behavior and desktop fallback.
3. Add LQIP/placeholder loading experience before full image resolves.

## 3. Product Decisions (Locked)

1. Route keeps existing dynamic path: `/scan/poster/[id]`.
2. No query override preview support on page route.
3. Page depends on poster image endpoint as primary render source (`/api/scan/:id/poster/image`).
4. Share target URL is `/scan/poster/[id]`.
5. QR in poster is fixed to report detail URL `/scan/report/[id]`.
6. Loading strategy uses low-quality placeholder first, then full-resolution image.
7. Save experience is mobile-first.

## 4. Technical Design

### 4.1 Page Data/Render Flow

1. Server renders shell for `/scan/poster/[id]`.
2. Client image component loads:
   - placeholder asset first (static fallback)
   - full image from `/api/scan/:id/poster/image`
3. If image load fails:
   - show retry CTA
   - keep fallback messaging

### 4.2 Save Flow (Mobile First)

1. Primary action: `Save Poster`.
2. Mobile behavior:
   - if `navigator.share` with file support is available, use Web Share API.
   - WeChat webview path:
     - first try `wx.previewImage` (official JSSDK path)
     - fallback to `WeixinJSBridge.invoke("imagePreview")`
     - if both fail, show bottom-sheet guidance
   - fallback UI uses bottom-sheet (not toast-only) with long-press guidance.
   - fallback text:
     - title: `Save Poster`
     - body: `Long press the poster image, then choose "Save Image".`
     - action: `I got it`
   - compatibility policy:
     - iOS Safari: use long-press guidance when Web Share file is unavailable.
     - Android Chrome: prefer Web Share file path; fallback to long-press guidance on rejection.
     - WeChat webview: use preview-image path before generic long-press fallback.
   - Web Share failure handling:
     - handle `AbortError` (user cancelled): silent close, no error UI.
     - handle `NotAllowedError` / `TypeError` / unknown: show fallback bottom-sheet.
3. Desktop behavior:
   - UI location: primary action button fixed in poster action area (same level as `Open Report`).
   - use blob download (`a[download]`) with filename `scan-{id}-poster.png`.
   - `{id}` formatting:
     - lowercase
     - replace non `[a-z0-9-_]` chars with `-`
     - max 32 chars
   - show saving state on button:
     - idle: `Save Poster`
     - in progress: `Saving...`
     - success (1.2s): `Saved`
   - browser support baseline: latest 2 major versions of Chrome, Safari, Firefox, Edge.
4. Failure fallback:
   - show explicit failure message and keep alternate action available.
   - failure text:
     - `Save failed. Try again, or long press image to save.`

### 4.3 QR/Share Handoff

1. Poster page URL for sharing: `/scan/poster/[id]`.
2. Poster QR target: `/scan/report/[id]` (fixed contract).
3. Do not route QR to poster page to avoid share-loop dead end.

### 4.4 Error Handling Policy

1. Retry CTA spec:
   - button text: `Retry Loading Poster`
   - behavior: refetch `/api/scan/:id/poster/image` once per click
2. HTTP-specific handling:
   - `404`: show `Poster not found` and `Back to Scan` link.
   - `500/502/503/504`: show `Poster generation is temporarily unavailable` + retry CTA.
   - network failure/timeout: show `Network issue while loading poster` + retry CTA.
3. Error reporting:
   - log client-side load/save errors to console in dev.
   - production error ingestion is deferred to `v0.2.4.4` telemetry slice.

### 4.5 LQIP/Placeholder Specification

1. Placeholder asset:
   - fixed aspect ratio: `687:1024`
   - rendered area must match final poster container dimensions.
2. Visual style:
   - use low-resolution static poster skeleton + 8px blur.
   - keep subtle shimmer optional; do not block interaction.
3. Timeout policy:
   - image request soft-timeout at `20s` for UI fallback messaging.
   - on timeout, keep request in-flight (no forced abort), keep placeholder visible and show retry CTA.
4. Swap behavior:
   - full image `onload` replaces placeholder in-place with no layout shift.
   - if full image never resolves, keep placeholder and actionable fallback.
   - WeChat webview must render poster using real network URL (not `blob:` URL) to preserve long-press save success.

### 4.6 Performance Budget (V0.2.4.2)

Target environment: Vercel Preview + mobile 4G simulation (or equivalent throttling).

1. Poster image load target:
   - P50 image resolved `< 3.0s`
   - P95 image resolved `< 5.0s`
2. FCP target on `/scan/poster/[id]`:
   - P75 FCP `< 1.8s` (placeholder/shell visible)
3. LQIP window:
   - placeholder must appear within `300ms` after navigation.
   - placeholder persists until full image decode succeeds or timeout fallback is shown.
4. Timeout fallback trigger:
   - if full image not visible by `20s`, show retry CTA while keeping placeholder.

### 4.7 Component Interface Contract

Poster page implementation should follow explicit component interfaces to avoid drift.

```ts
export interface PosterImageProps {
  scanId: string;
  src?: string; // default: /api/scan/:id/poster/image
  placeholderSrc?: string;
  timeoutMs?: number; // default: 20000
  onLoad?: () => void;
  onError?: (type: "timeout" | "http-404" | "http-5xx" | "network") => void;
  onTimeout?: () => void;
  onProgress?: (percent: number) => void;
  className?: string;
  alt?: string;
}

export interface SavePosterButtonProps {
  scanId: string;
  imageUrl?: string;
  onSaveSuccess?: () => void;
  onSaveFailure?: () => void;
  onFallbackShow?: () => void; // long-press guide sheet opened
}

export interface LongPressGuideSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string; // default: "Save Poster"
  description?: string; // default guidance copy
  confirmText?: string; // default: "I got it"
}

export interface PosterPageViewModel {
  scanId: string;
  posterImageUrl: string; // /api/scan/:id/poster/image
  reportUrl: string; // /scan/report/:id
  shareUrl: string; // /scan/poster/:id
}
```

Implementation notes:

1. `PosterImageProps.src` must not append query overrides in `v0.2.4.2`.
2. `SavePosterButtonProps.fileName` should use sanitized scan id (see section 4.2).
3. `PosterPageViewModel` is the single page-level data contract between page shell and child components.

## 5. Out of Scope (Deferred)

1. Campaign/UTM attribution analytics expansion.
2. Poster page telemetry and event persistence (`v0.2.4.4`).
3. A/B testing of save UX variants.
4. Full observability dashboards/alerts for telemetry pipeline.

## 6. Test Plan (V0.2.4.2)

1. Page integration tests
   - `/scan/poster/[id]` displays placeholder then resolved image.
   - invalid `id` handling follows product behavior (not found/fallback page).
2. Save flow tests
   - mobile share path success/fail coverage.
   - desktop blob download path coverage.
   - Web Share failure type handling (`AbortError`, `NotAllowedError`, `TypeError`).
3. Error handling tests
   - `404` / `5xx` / network timeout show correct message and retry behavior.
4. Placeholder tests
   - placeholder ratio and blur style applied.
   - timeout keeps placeholder and displays retry CTA.
5. Regression tests
   - poster page still links back to `/scan/report/[id]`.
   - no query override behavior introduced on poster page route.

### 6.1 Pass/Fail Criteria

1. Page integration:
   - pass: placeholder visible first, then full poster image renders with no layout shift.
   - fail: blank first paint or persistent broken image without fallback CTA.
2. Save flow:
   - pass: at least one save path succeeds on each target platform (mobile + desktop).
   - fail: all save paths fail on a supported browser.
3. Error handling:
   - pass: `404`, `5xx`, network timeout show distinct message + expected action.
   - fail: generic/empty error state with no actionable CTA.
4. Performance:
   - pass: budgets in section 4.6 are met on preview validation run.
   - fail: any budget repeatedly exceeds threshold (2 consecutive runs).
5. Component contract:
   - pass: page implementation conforms to section 4.7 interfaces without ad-hoc props.
   - fail: duplicated divergent prop shapes across poster components.

### 6.2 Test Fixtures

Use at least these fixture scan IDs (or equivalents with stable expected output):

1. `scan_fixture_v0240_b69` (B grade baseline, medium risk mix)
2. `scan_fixture_v0240_a90` (A grade high score baseline)
3. `scan_edge_d0` (D grade edge baseline)
4. `scan_not_found_case` (non-existent id for 404 path)

Required fixture assertions:

1. each existing fixture id resolves poster image endpoint successfully (`200 image/png`) except not-found case.
2. QR on rendered poster remains decodable to `/scan/report/[id]` for existing fixtures.

### 6.3 Manual Test Checklist

1. Mobile iOS Safari:
   - open `/scan/poster/[id]`, verify placeholder first paint.
   - tap `Save Poster`; if share unavailable, verify long-press guidance sheet text.
2. Mobile Android Chrome:
   - verify Web Share path and fallback path both reachable.
3. Desktop Chrome/Safari/Firefox/Edge:
   - click `Save Poster`, verify downloaded filename format and file open success.
4. Error path checks:
   - simulate `404`, `500`, and offline network; verify exact fallback messages and retry CTA behavior.
5. QR handoff check:
   - scan poster QR and confirm landing page is `/scan/report/[id]`.

## 7. Acceptance Criteria

1. `/scan/poster/[id]` shows generated poster image from API endpoint.
2. Save action works on both mobile (with fallback) and desktop.
3. QR always opens `/scan/report/[id]`.
4. Placeholder-first loading works and avoids blank first paint.
5. Save UX behavior is deterministic across mobile/desktop supported browsers.
6. Error and timeout paths show actionable fallback.
7. Performance budgets in section 4.6 pass in preview validation.
8. `npm run build` passes, and the v0.2.4.2 target test suite passes.
9. WeChat in-app save flow is accepted:
   - tap `Save Poster` opens image preview path
   - long-press save is available and validated with real network image URL.

### 7.1 Target Test Suite (Noise-free Gate)

Use this subset as the mandatory acceptance gate for v0.2.4.2:

1. `tests/poster-v0242-page-behavior.spec.test.tsx`
2. `tests/poster-v0242-savebutton-integration.test.tsx`
3. `tests/download.test.ts`
4. `tests/download-desktop.test.ts`
5. `tests/poster-v0241-image-route.contract.test.ts`
6. `tests/poster-v0242-model-contract.test.ts`
7. `tests/poster-visual-regression.test.ts`

Rationale:

1. avoid unrelated historical test noise blocking poster slice delivery.
2. keep regression gate focused on poster page, save flow, and render contract.
