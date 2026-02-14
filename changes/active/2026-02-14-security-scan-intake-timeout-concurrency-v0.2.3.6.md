# Change Plan: Security Scan Intake Timeout + Adaptive GitHub Concurrency V0.2.3.6

## 0. Links

- Active spec: `specs/active/2026-02-14-security-scan-intake-timeout-concurrency-v0.2.3.6.md`
- Implementation playbook: `docs/archive/v0.2.2-implementation-playbook.md`
- Previous release baseline: `specs/released/2026-02-13-security-scan-abuse-fallback-controls-v0.2.3.5.md`

## 1. Execution Status

- Phase: Active
- Spec status: Active
- Implementation approval: Completed

## 2. Action List

1. Add unified intake timeout env
   - Status: completed
   - Deliverables:
     - `SCAN_INTAKE_TIMEOUT_MS` parser with safe fallback
     - shared policy function used by GitHub and npm intake

2. Add adaptive GitHub blob concurrency
   - Status: completed
   - Deliverables:
     - env-configurable base: `SCAN_GITHUB_BLOB_CONCURRENCY`
     - auto scale for larger blob sets
     - stable output ordering under concurrency

3. Improve timeout message clarity
   - Status: completed
   - Deliverables:
     - intake timeout includes total timeout and last budget
     - hard timeout message includes explicit hard-timeout marker

4. Regression verification
   - Status: completed
   - Deliverables:
     - `tests/github.test.ts` passed
     - `tests/npm.test.ts` passed
     - `tests/store-timeout.test.ts` passed

## 3. Acceptance Gate Before "Done"

1. `scan_timeout` contract remains backward-compatible (`408`).
2. No route/schema change introduced.
3. Intake timeout and concurrency are both environment-configurable.
4. No regression in core intake test paths.
