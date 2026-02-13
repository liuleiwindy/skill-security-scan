# OpenSpec Proposal: Security Scan Modular Architecture V0.2.3.x

## 0. Meta

- Date: 2026-02-12
- Stage: Proposal (Review-ready)
- Owner: Product + Engineering
- Parent proposal: `specs/proposals/2026-02-11-security-scan-real-v0.2.md`
- Scope window: `v0.2.3.1 ~ v0.2.3.4`

## 1. Problem Statement

V0.2.3 completed prompt-injection capability, but orchestration responsibilities remain concentrated in `store.ts` and partially in `engine.ts`.
This increases maintenance risk for upcoming productization work in V0.2.4 (viral trust UX) and V0.2.5 (advanced worker integration).

## 2. Goal

Refactor architecture incrementally without breaking public behavior:

1. keep API contract stable
2. keep report schema backward-compatible
3. improve module boundaries and testability
4. add scanner observability metadata for runtime transparency

## 3. Non-Goals

1. New detection capability beyond V0.2.3 baseline
2. Route changes or report/poster UX redesign
3. Scoring model redesign

## 4. Sub-Version Plan

1. `v0.2.3.1` - Extract `scan-policy.ts` and `report-repository.ts`
2. `v0.2.3.2` - Introduce `intake.ts`, remove source branching details from `store.ts`
3. `v0.2.3.3` - Introduce `external-scanners.ts` and `pipeline.ts`
4. `v0.2.3.4` - Extract `pi-pipeline.ts`, add `scanMeta.scanners` + scanner error domain mapping

## 5. Architectural Target

Target module responsibilities:

1. `scan-policy.ts`
   - central limits, defaults, and policy constants
2. `intake.ts`
   - input classification and source-specific file intake
3. `pipeline.ts`
   - full scan orchestration (rules + external scanners + scoring)
4. `external-scanners.ts`
   - semgrep/gitleaks execution wrapper and normalized status
5. `pi-pipeline.ts`
   - external PI detector registration and execution adapter
6. `report-repository.ts`
   - persistence and cache for reports
7. `store.ts`
   - thin facade preserving existing exports

## 6. Acceptance Criteria

1. `createAndStoreReport(repoUrl)` signature remains unchanged.
2. `POST /api/scan` and `GET /api/scan/:id` response shape remains backward-compatible.
3. Existing error codes remain available; additional detail is additive only.
4. `npm test` and `npm run build` pass after each sub-version.
5. `scanMeta.scanners` is present by `v0.2.3.4` with per-scanner status summary.

## 7. Risks and Mitigations

1. Risk: refactor introduces behavior drift
   Mitigation: contract tests + snapshot checks at API layer.

2. Risk: module split creates circular dependencies
   Mitigation: enforce one-way dependency direction (`policy/intake/pipeline/repository`).

3. Risk: observability fields leak unstable internals
   Mitigation: expose only stable status enum and counts.

## 8. Next Step

1. Start execution with `changes/active/2026-02-12-security-scan-modular-architecture-v0.2.3.1.md`.
2. Move each sub-version plan to released once gate passes.
