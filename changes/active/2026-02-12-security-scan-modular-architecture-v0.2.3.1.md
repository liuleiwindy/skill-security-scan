# Change Plan: Modular Architecture Refactor V0.2.3.1

## 0. Links

- Proposal: `specs/proposals/2026-02-12-security-scan-modular-architecture-v0.2.3.x.md`
- Active spec: `specs/active/2026-02-12-security-scan-modular-architecture-v0.2.3.1.md`
- Parent plan: `changes/active/2026-02-11-security-scan-real-v0.2.md`

## 1. Execution Status

- Phase: Pre-implementation
- Spec status: Active
- Implementation approval: Approved for incremental non-breaking refactor

## 2. Action List (V0.2.3.1)

1. Extract `scan-policy.ts`
   - Status: pending
   - Deliverables:
     - move limits/defaults to centralized module
     - update imports in `engine.ts`, `github.ts`, `npm.ts`, `store.ts`

2. Extract `report-repository.ts`
   - Status: pending
   - Deliverables:
     - move file/Postgres/cache read-write logic out of `store.ts`
     - keep existing public function signatures in `store.ts`

3. Refactor safety checks
   - Status: pending
   - Deliverables:
     - preserve API behavior and report shape
     - no error-code or status-code regression

4. Validation
   - Status: pending
   - Deliverables:
     - `npm test` pass
     - `npm run build` pass

## 3. Milestones

1. M1 - Policy extraction done
2. M2 - Repository extraction done
3. M3 - Regression gate pass

## 4. Acceptance Gate Before "Done"

1. `store.ts` is reduced to thin orchestration facade.
2. Existing route behavior remains unchanged.
3. Automated checks pass.
