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

Introduce a dedicated scan pipeline layer and external-scanner facade so `store.ts` no longer owns semgrep/gitleaks orchestration, finding merge, and score assembly.

## 2. Scope

1. Create `lib/scan/external-scanners.ts`
2. Create `lib/scan/pipeline.ts`
3. Move from `lib/store.ts` into pipeline layer:
   - `runScan(...)` invocation and report base assembly
   - semgrep + gitleaks execution orchestration
   - finding merge + dedupe/sort flow
   - score recomputation and final summary/grade/status updates
4. Keep `store.ts` as thin facade:
   - intake call
   - pipeline call
   - repository save/load
   - runtime deps test hooks
5. Keep finding schema and scoring semantics unchanged

## 3. Out of Scope

1. no `pi-pipeline.ts` extraction in this version (`v0.2.3.4`)
2. no route/API schema change
3. no scanner error-domain mapping to new public fields
4. no `scanMeta.scanners` schema extension in this version
5. no new scanner adapters/tools

## 4. Design Constraints

1. API contract must remain unchanged:
   - `POST /api/scan`
   - `GET /api/scan/:id`
2. `createAndStoreReport(repoUrl)` signature must remain unchanged.
3. Finding merge behavior must remain equivalent to pre-refactor flow:
   - merge baseline findings + semgrep findings + gitleaks findings
   - run existing `dedupeAndSortFindings`
4. Scoring behavior must remain equivalent:
   - use existing `calculateScoreResult`
   - report `score/grade/status/summary` values remain backward-compatible
5. External scanner failures must remain non-blocking for the full scan flow (same as current behavior expectation).

## 5. Target Module Responsibilities

### 5.1 `lib/scan/external-scanners.ts`

Must provide a single execution facade for external scanners.

Required responsibilities:

1. call semgrep adapter
2. call gitleaks adapter
3. normalize each scanner result into a stable internal structure
4. expose aggregated findings for pipeline merge

Recommended internal shape:

1. scanner id (`semgrep` / `gitleaks`)
2. status (`ok` / `failed`)
3. findings array
4. optional internal error message

Note: this structure is internal for `v0.2.3.3`; public report schema remains unchanged.

### 5.2 `lib/scan/pipeline.ts`

Must provide full scan orchestration facade consumed by store.

Required responsibilities:

1. run baseline `runScan` on intake files
2. invoke `runExternalScanners(workspaceDir, deps)`
3. merge + dedupe + sort findings
4. recompute score and summary fields
5. output final `ScanReport`

Pipeline should be deterministic for same input and scanner outputs.

### 5.3 `lib/store.ts`

Must remain facade with existing exports:

1. `createAndStoreReport(repoUrl)`
2. `getStoredReport(id)`
3. `__setScanRuntimeDepsForTest`
4. `__resetScanRuntimeDepsForTest`

`store.ts` should not contain scanner merge/scoring orchestration details after this refactor.

## 6. Acceptance Criteria

1. Existing tests pass without API contract regression.
2. For same mocked scanner outputs, resulting report fields are unchanged versus pre-refactor behavior.
3. `store.ts` no longer directly performs external scanner merge/scoring orchestration.
4. External scanner adapter failure path remains non-blocking and behavior-compatible.

## 7. Validation Plan

1. run `npm test`
2. run `npm run build`
3. add/ensure tests:
   - pipeline happy path with merged findings
   - pipeline path where one external scanner fails but report still generated
   - existing API tests (including npm/skills-add) remain green

## 8. Release Gate

All below must pass before marking released:

1. tests green
2. build green
3. no API contract regression in existing suite
4. pipeline and store responsibilities match module boundaries in this spec

## 9. Next Step

After completion, move to:

1. `v0.2.3.4` extract PI runtime registration (`pi-pipeline.ts`) and add scanner-level metadata/error domain mapping (`scanMeta.scanners`)
