# Change Plan: Security Scan Real Static Analysis V0.2.1

## 0. Link to Active Spec

- `/Users/lei_liu/Documents/Code/skill-store/skill-security-scan/specs/active/2026-02-11-security-scan-real-v0.2.1.md`
- `/Users/lei_liu/Documents/Code/skill-store/skill-security-scan/docs/v0.2.1-implementation-playbook.md`

## 1. Execution Status

- Phase: Pre-implementation
- Spec status: Active
- Implementation approval: Pending explicit "start v0.2.1 implementation"

## 2. Action List (V0.2.1)

1. GitHub repository intake layer
   - Status: pending
   - Deliverables:
     - URL parser (`owner/repo/ref/path`)
     - tree traversal and blob fetch
     - bounded file assembly
     - authenticated mode via `GITHUB_TOKEN`

2. Semgrep adapter
   - Status: pending
   - Deliverables:
     - CLI execution wrapper
     - JSON parser and normalization
     - fallback behavior

3. Gitleaks adapter
   - Status: pending
   - Deliverables:
     - CLI execution wrapper
     - JSON parser and normalization
     - fallback behavior

4. Pipeline wiring
   - Status: pending
   - Deliverables:
     - merge scanner findings into existing report schema
     - update engine version to `v0.2.1`
     - preserve existing API and storage behavior

5. Tests and release gate
   - Status: pending
   - Deliverables:
     - unit + integration tests for intake/adapters/payload
     - manual E2E on 3 sample repos
     - token-enabled GitHub intake validation
     - green `npm test`

## 3. Milestones

1. M1 - Real intake ready
   - Done when:
     - GitHub URL -> file list conversion works with limits/timeout
2. M2 - Scanner adapters ready
   - Done when:
     - Semgrep/Gitleaks findings normalized into `Finding[]`
3. M3 - End-to-end report ready
   - Done when:
     - `POST /api/scan` produces report with external scanner findings
4. M4 - Release gate pass
   - Done when:
     - all tests pass and manual validation checklist completes

## 4. Acceptance Gate Before "Done"

1. All criteria in `specs/active/2026-02-11-security-scan-real-v0.2.1.md` pass.
2. `npm test` passes.
3. `engineVersion` is `v0.2.1` in generated reports.
4. Report/poster pages have no payload compatibility regressions.
