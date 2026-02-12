# Change Plan: Modular Architecture Refactor V0.2.3.3

## Goal

Extract scan orchestration and external scanner execution from `store.ts` into dedicated modules while keeping public behavior unchanged.

## Scope

1. create `lib/scan/external-scanners.ts`
2. create `lib/scan/pipeline.ts`
3. migrate semgrep/gitleaks orchestration + merge/scoring flow from `lib/store.ts` to pipeline
4. keep `createAndStoreReport` signature and API route behavior unchanged

## Step Plan

1. Introduce external scanner facade
   - define normalized `ExternalScannerResult`
   - implement `runExternalScanners(workspaceDir, deps)`
   - preserve existing adapter outputs and finding shapes

2. Introduce full scan pipeline facade
   - define `runFullScan(input, intake, deps)`
   - execute `runScan`, external scanners, finding merge, score calculation
   - return final report payload ready for persistence

3. Slim `store.ts`
   - keep runtime deps wiring and test hooks
   - call `runIntakeFromInput`
   - call `runFullScan`
   - call `saveReport`

4. Add tests
   - pipeline happy path (internal + external findings merged)
   - external scanner failure/non-blocking behavior
   - runtime deps override path still effective end-to-end

5. Regression validation
   - `npm test`
   - `npm run build`

## Non-goals

1. no `pi-pipeline.ts` extraction (belongs to `v0.2.3.4`)
2. no API payload changes
3. no new external scanner feature flags
4. no scanMeta schema extension in this version

## Release Gate

1. all tests pass
2. build passes
3. API contract unchanged in existing test suite
4. manual smoke unchanged for GitHub/npm/skills-add paths
