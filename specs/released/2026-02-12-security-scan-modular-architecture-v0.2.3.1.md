# OpenSpec Spec: Modular Architecture Refactor V0.2.3.1

## 0. Meta

- Date: 2026-02-12
- Stage: Released
- Owner: Product + Engineering
- Proposal source: `specs/proposals/2026-02-12-security-scan-modular-architecture-v0.2.3.x.md`
- Parent plan: `changes/active/2026-02-12-security-scan-modular-architecture-v0.2.3.1.md`
- Scope note: non-functional refactor only (no API behavior change)

## 1. Objective

Extract policy and repository responsibilities out of `store.ts` to reduce coupling and prepare for V0.2.3.2+ pipeline modularization.

## 2. Scope

1. Create `lib/scan/scan-policy.ts`
2. Create `lib/report-repository.ts`
3. Replace direct constant usage in:
   - `lib/scan/engine.ts`
   - `lib/scan/github.ts`
   - `lib/scan/npm.ts`
   - `lib/store.ts`
4. Move report persistence/cache logic from `lib/store.ts` into `lib/report-repository.ts`
5. Keep existing `lib/store.ts` exports and signatures unchanged

## 3. Out of Scope

1. no `intake.ts` in this version (v0.2.3.2)
2. no `pipeline.ts` in this version (v0.2.3.3)
3. no `pi-pipeline.ts` extraction in this version (v0.2.3.4)
4. no scanner metadata schema expansion in this version

## 4. Design Constraints

1. API contract unchanged:
   - `POST /api/scan` success/error shape unchanged
   - `GET /api/scan/:id` shape unchanged
2. report schema unchanged:
   - no required field additions/removals
3. error mapping unchanged
4. runtime behavior unchanged except module boundaries

## 5. Target Module Responsibilities

### 5.1 `lib/scan/scan-policy.ts`

Must contain centralized policy constants and defaults used today, including:

1. file inclusion/exclusion defaults
2. intake size/count/timeout defaults
3. skills-add dynamic scope controls

Exports must be consumed by existing modules without changing external behavior.

### 5.2 `lib/report-repository.ts`

Must own:

1. in-memory report cache
2. file-based local read/write
3. postgres read/write and table initialization
4. environment gating for production storage config

Must expose repository API that `lib/store.ts` can call.

### 5.3 `lib/store.ts`

Must remain public facade with same exported functions:

1. `createAndStoreReport(repoUrl)`
2. `getStoredReport(id)`
3. existing test hooks (`__setScanRuntimeDepsForTest`, `__resetScanRuntimeDepsForTest`)

`store.ts` should delegate persistence to repository layer.

## 6. Acceptance Criteria

1. Existing route tests pass without response contract changes.
2. `createAndStoreReport` behavior remains equivalent for:
   - GitHub URL input
   - npm command input
   - `npx skills add owner/repo` dynamic GitHub routing
3. all report IDs still resolve through `getStoredReport`.
4. no new runtime-required env vars introduced.

## 7. Validation Plan

1. run `npm test`
2. run `npm run build`
3. smoke checks:
   - one GitHub scan creation/read
   - one npm scan creation/read

## 8. Release Gate

All below must pass before marking released:

1. tests green
2. build green
3. no API contract regression in manual sanity checks

## 9. Next Step

After completion, move to:

1. `v0.2.3.2` intake modularization (`intake.ts` extraction)
