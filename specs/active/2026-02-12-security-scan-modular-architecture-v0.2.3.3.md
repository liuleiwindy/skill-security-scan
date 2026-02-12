# OpenSpec Spec: Modular Architecture Refactor V0.2.3.3

## 0. Meta

- Date: 2026-02-12
- Stage: Active (Implementation-ready)
- Owner: Product + Engineering
- Proposal source: `specs/proposals/2026-02-12-security-scan-modular-architecture-v0.2.3.x.md`
- Previous active baseline: `specs/active/2026-02-12-security-scan-modular-architecture-v0.2.3.2.md`
- Parent plan: `changes/active/2026-02-12-security-scan-modular-architecture-v0.2.3.3.md`
- Scope note: non-functional refactor only (no API behavior change)

## 1. Objective

Introduce a dedicated scan pipeline and external scanner facade so `store.ts` no longer owns semgrep/gitleaks orchestration, findings merge, and score assembly.

## 2. Scope

1. Create `lib/scan/external-scanners.ts`
2. Create `lib/scan/pipeline.ts`
3. Move from `lib/store.ts` to pipeline layer:
   - internal scan invocation (`runScan`)
   - external scanner execution (`semgrep` + `gitleaks`)
   - findings merge + dedupe/sort
   - score recomputation and report field update
4. Keep `store.ts` as facade:
   - intake resolution (`runIntakeFromInput`)
   - pipeline call (`runFullScan`)
   - persistence (`saveReport`/`loadReport`)
5. Keep public report schema and API contract unchanged

## 3. Out of Scope

1. no `pi-pipeline.ts` extraction in this version (`v0.2.3.4`)
2. no prompt-injection runtime path movement in this version
3. no route/API schema change
4. no `scanMeta.scanners` public schema extension in this version
5. no new scanner adapter/tools beyond semgrep and gitleaks

## 4. Design Constraints

1. API contract unchanged:
   - `POST /api/scan`
   - `GET /api/scan/:id`
2. `createAndStoreReport(repoUrl)` signature unchanged.
3. Findings merge behavior unchanged:
   - internal findings + semgrep findings + gitleaks findings
   - dedupe/sort via existing normalize utilities
4. Scoring behavior unchanged:
   - score/grade/status/summary derived from merged findings via existing scoring logic
5. External scanner failures are non-blocking:
   - single scanner failure does not abort scan
   - all scanners failure still produces report from internal scan
6. Pipeline starts from intake output and does not perform input classification/routing.

## 5. Target Module Responsibilities

### 5.1 `lib/scan/external-scanners.ts`

Must provide a unified facade for external scanners.

Responsibilities:

1. run semgrep adapter
2. run gitleaks adapter
3. aggregate findings
4. expose per-scanner internal status (`ok` / `failed`) for pipeline-side observability

Note: scanner status is internal in `v0.2.3.3`; no public report schema changes yet.

### 5.2 `lib/scan/pipeline.ts`

Must provide the full scan orchestration used by store.

Responsibilities:

1. run internal scan on intake files
2. run external scanners through facade
3. merge + dedupe findings
4. recompute score and summary
5. return final `ScanReport` ready for persistence

Recommended signature:

1. `runFullScan(effectiveRepoUrl, intake, deps)`

### 5.3 `lib/store.ts`

Must stay thin and preserve existing exports:

1. `createAndStoreReport(repoUrl)`
2. `getStoredReport(id)`
3. `__setScanRuntimeDepsForTest`
4. `__resetScanRuntimeDepsForTest`

## 6. Acceptance Criteria

1. Existing tests pass with no API contract regression.
2. For same mocked scanner outputs, report fields are backward-compatible with pre-refactor behavior.
3. `store.ts` no longer directly owns scanner merge/scoring orchestration.
4. Non-blocking semantics verified:
   - one external scanner fails, report still generated
   - all external scanners fail, report still generated

## 7. Validation Plan

1. run `npm test`
2. run `npm run build`
3. ensure tests include:
   - pipeline happy path (internal + external merge)
   - one external scanner failure path
   - all external scanners failure path
   - npm scanMeta path through pipeline
4. ensure existing API tests (GitHub/npm/skills-add) remain green

## 8. Release Gate

All below must pass before release:

1. tests green
2. build green
3. no API contract regression
4. module boundaries match this spec

## 9. Next Step

After completion, move to:

1. `v0.2.3.4` extract PI runtime registration (`pi-pipeline.ts`) and add scanner-level metadata/error domain mapping (`scanMeta.scanners`)
