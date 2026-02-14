# OpenSpec Active Spec: Security Scan Viral Trust Loop V0.2.4 (Master)

## 0. Meta

- Date: 2026-02-14
- Stage: Active
- Owner: Product + Engineering
- Proposal source: `specs/proposals/2026-02-13-security-scan-viral-trust-loop-v0.2.4.md`
- Previous release baseline: `specs/released/2026-02-13-security-scan-abuse-fallback-controls-v0.2.3.5.md`
- Master version: `v0.2.4`
- Execution slices:
  - `v0.2.4.0` core rendering
  - `v0.2.4.1` data/API integration
  - `v0.2.4.2` poster page + save flow
  - `v0.2.4.3` stabilization and release gate

## 1. Objective

Deliver the V0.2.4 share loop end-to-end:

1. dynamic poster rendering capability
2. integration with existing scan/report/poster data chain
3. poster page save-to-local experience

## 2. Scope (Master)

1. Poster image generation as a production capability.
2. Poster/report/scan chain integration without breaking current APIs.
3. Share-ready poster page integration.
4. Release quality gates for visual and functional stability.

## 3. Out of Scope (Master)

1. Worker runtime integration (`v0.2.5` line).
2. Account/paywall rollout.
3. Score model redesign.

## 4. Architecture (Master-Level)

1. `PosterDomain`
   - report data -> normalized poster model
2. `PosterRenderCore`
   - poster model -> deterministic PNG
3. `PosterApi`
   - transport, validation, error mapping, cache policy
4. `PosterPage`
   - consume image endpoint, present save/download UX

Detailed technical design is maintained in slice specs, starting with:

- `specs/active/2026-02-14-security-scan-viral-trust-loop-v0.2.4.0.md`

## 5. Version Slicing Plan

### 5.1 V0.2.4.0 - Core Render Engine

- extract POC into reusable renderer modules
- stabilize template semantics and parameter model
- establish deterministic rendering and core tests

### 5.2 V0.2.4.1 - Data and API Integration

- map stored report -> poster domain model
- add poster image endpoint
- keep existing poster JSON endpoint backward-compatible

### 5.3 V0.2.4.2 - Poster Page Integration

- integrate generated image into `/scan/poster/[id]`
- add one-click save with browser fallback

### 5.4 V0.2.4.3 - Stabilization and Release Gate

- harden validation and error behavior
- visual regression sample matrix
- release gate checks (`test/build/perf`)

## 6. Master Acceptance Criteria

1. All slice acceptance gates (`v0.2.4.0~v0.2.4.3`) are closed.
2. End-to-end scan -> report -> poster -> save flow is functional.
3. Existing API contracts remain backward-compatible.
4. Release checks pass and docs are ready for `released/` promotion.
