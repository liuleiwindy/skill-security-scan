# OpenSpec Spec: Modular Architecture Refactor V0.2.3.2

## 0. Meta

- Date: 2026-02-12
- Stage: Active (Implementation-ready)
- Owner: Product + Engineering
- Proposal source: `specs/proposals/2026-02-12-security-scan-modular-architecture-v0.2.3.x.md`
- Previous active baseline: `specs/active/2026-02-12-security-scan-modular-architecture-v0.2.3.1.md`
- Scope note: non-functional refactor only (no API behavior change)

## 1. Objective

Introduce `intake.ts` as the unified input-resolution and source-intake orchestration layer, and remove GitHub/npm/skills-add branching details from `store.ts`.

## 2. Scope

1. Create `lib/scan/intake.ts`
2. Move input classification and routing logic from `lib/store.ts` into `intake.ts`, including:
   - `classifyScanInput`
   - `resolveSkillsAddGitHubTarget`
   - GitHub intake branch
   - npm intake branch
   - `npx skills add owner/repo` dynamic sub-path resolution branch
3. Add unified intake entry function (recommended):
   - `runIntakeFromInput(input, deps)`
4. Keep existing intake result shape used by `createAndStoreReport`
5. Refactor `lib/store.ts` to call intake facade instead of owning source branching details

## 3. Out of Scope

1. no external scanner pipeline extraction in this version (`v0.2.3.3`)
2. no `pi-pipeline.ts` extraction in this version (`v0.2.3.4`)
3. no scoring/risk model change
4. no API route, payload, or poster UX redesign
5. no scanner metadata schema expansion in this version

## 4. Design Constraints

1. Keep API contract unchanged:
   - `POST /api/scan` response shape unchanged
   - `GET /api/scan/:id` response shape unchanged
2. Keep report schema unchanged:
   - no required field addition/removal
3. Keep error code behavior backward-compatible:
   - existing intake and scan error codes must still map to current API behavior
4. Keep runtime dependency injection compatibility:
   - existing store-level test hooks remain available
5. Keep behavior equivalent under boundary conditions:
   - timeout
   - package/repo too large
   - no eligible text files

## 5. Target Module Responsibilities

### 5.1 `lib/scan/intake.ts`

Must own all input-to-files resolution responsibilities:

1. classify input source type
2. resolve `skills add` target and dynamic skill roots
3. invoke proper source adapter (`github.ts` or `npm.ts`)
4. return unified intake result consumed by `store.ts`
5. provide cleanup callback for temporary workspace

`intake.ts` should depend on existing adapters and policy constants, but should not own scan/rule/scoring logic.

### 5.2 `lib/store.ts`

Must remain thin application facade and keep exports/signatures unchanged:

1. `createAndStoreReport(repoUrl)`
2. `getStoredReport(id)`
3. `__setScanRuntimeDepsForTest`
4. `__resetScanRuntimeDepsForTest`

`store.ts` should call intake facade, then continue existing scan + persistence orchestration.

## 6. Acceptance Criteria

1. Existing tests pass with no API contract regression.
2. `createAndStoreReport` behavior remains equivalent for:
   - plain GitHub URL
   - npm package/command input
   - `npx skills add owner/repo` dynamic GitHub routing
3. Existing input validation and error mapping remain equivalent or clearer without breaking current callers.
4. `store.ts` no longer contains source-specific branching details beyond intake facade invocation.

## 7. Validation Plan

1. run `npm test`
2. run `npm run build`
3. smoke checks:
   - GitHub scan create/read
   - npm scan create/read
   - `npx skills add owner/repo` scan create/read (including dynamic root selection)

## 8. Release Gate

All below must pass before marking released:

1. tests green
2. build green
3. no API contract regression in manual sanity checks
4. intake boundary behavior verified (timeout/size/no-text)

## 9. Next Step

After completion, move to:

1. `v0.2.3.3` external scanner and scan pipeline modularization (`external-scanners.ts` + `pipeline.ts`)
