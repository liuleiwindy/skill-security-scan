# Change Plan: Security Scan Prompt Injection Risk V0.2.3

## 0. Link to Proposal and Spec

- Proposal: `specs/proposals/2026-02-11-security-scan-prompt-injection-v0.2.3.md`
- Spec: `specs/active/2026-02-11-security-scan-prompt-injection-v0.2.3.md`
- Reference playbook: `docs/archive/v0.2-implementation-playbook.md` (Task F section)
- Previous release baseline: `specs/released/2026-02-11-security-scan-real-v0.2.2.md`

## 1. Execution Status

- Phase: Pre-implementation
- Spec status: Active
- Implementation approval: Approved, pending corrected implementation
- Note: previous implementation direction was incorrect and is replaced by this plan

## 2. Action List

1. Lock PI scope
   - Status: pending
   - Deliverables:
     - keep only `PI-1` and `PI-2`
     - no agent-risk expansion

2. External-first PI detection integration
   - Status: pending
   - Deliverables:
     - integrate `promptfoo` PI external path into scan workflow
     - configure Z.AI OpenAI-compatible provider path
     - keep existing findings schema

3. Local fallback PI path
   - Status: pending
   - Deliverables:
     - keep local PI rules as fallback only
     - fallback triggers only when external path unavailable/fails

4. Baseline architecture protection
   - Status: pending
   - Deliverables:
     - do not refactor non-PI existing scan architecture
     - avoid unrelated pipeline behavior changes

5. Validation and regression
   - Status: pending
   - Deliverables:
     - PI fixtures pass
     - promptfoo local mode pass
     - promptfoo online mode (Z.AI) pass when credentials available
     - full test suite green

## 3. Acceptance Gate Before Release

1. `PI-1` and `PI-2` both produce report findings under existing schema.
2. External PI path is primary; local PI path is fallback-only.
3. Clean fixture has no PI hit.
4. `/scan -> /scan/report/:id -> /scan/poster/:id` flow remains stable.
5. `npm test` and `npm run build` pass.

## 4. Notes

1. V0.2.3 intentionally excludes role split and paywall mechanics.
2. Scope is prompt-injection risk only.
3. External tooling is primary for PI; local rules are resilience fallback.
4. Z.AI OpenAI-compatible provider path is the online evaluation target.
