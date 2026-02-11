# Change Plan: Security Scan Prompt Injection Risk V0.2.3

## 0. Link to Proposal and Spec

- Proposal: `specs/proposals/2026-02-11-security-scan-prompt-injection-v0.2.3.md`
- Spec: `specs/active/2026-02-11-security-scan-prompt-injection-v0.2.3.md`
- Reference playbook: `docs/archive/v0.2-implementation-playbook.md` (Task F section)
- Previous release baseline: `specs/released/2026-02-11-security-scan-real-v0.2.2.md`

## 1. Execution Status

- Phase: Pre-implementation
- Spec status: Active
- Implementation approval: Pending explicit "start building v0.2.3"

## 2. Action List

1. Prompt-injection taxonomy lock
   - Status: pending
   - Deliverables:
     - lock two classes only: `PI-1` and `PI-2`
     - map rule IDs and user-facing titles

2. Rule implementation and evidence output
   - Status: pending
   - Deliverables:
     - add deterministic PI rules into existing rule pipeline
     - output evidence with existing finding schema

3. Report messaging integration
   - Status: pending
   - Deliverables:
     - clear "risk detected / no obvious signal" messaging on report page
     - no route/schema break

4. Validation and regression
   - Status: pending
   - Deliverables:
     - positive fixtures for PI-1 and PI-2
     - clean fixture for no-hit case
     - full test suite green

## 3. Acceptance Gate Before Release

1. `PI-1` and `PI-2` both produce at least one deterministic hit.
2. Clean fixture has no prompt-injection hit.
3. `/scan -> /scan/report/:id -> /scan/poster/:id` flow remains stable.
4. `npm test` and `npm run build` pass.

## 4. Notes

1. V0.2.3 intentionally excludes role split and paywall mechanics.
2. Scope is prompt-injection risk only.
3. `promptfoo` is validation reference, not runtime hard dependency.
