# Change Plan: Security Scan Prompt Injection Risk V0.2.3

## 0. Link to Proposal and Spec

- Proposal: `specs/proposals/2026-02-11-security-scan-prompt-injection-v0.2.3.md`
- Spec: `specs/active/2026-02-11-security-scan-prompt-injection-v0.2.3.md`
- Reference playbook: `docs/archive/v0.2-implementation-playbook.md` (Task F section)
- Previous release baseline: `specs/released/2026-02-11-security-scan-real-v0.2.2.md`

## 1. Execution Status

- Phase: Implemented and validated
- Spec status: Active
- Implementation approval: Completed
- Note: runtime path uses direct Z.AI `chat/completions`; Promptfoo remains evaluation harness

## 2. Action List

1. Lock PI scope
   - Status: completed
   - Deliverables:
     - keep only `PI-1` and `PI-2`
     - no agent-risk expansion

2. External-first PI detection integration
   - Status: completed
   - Deliverables:
     - runtime external PI path integrated via direct Z.AI `chat/completions`
     - Promptfoo local/online configs integrated for validation harness
     - configured Z.AI OpenAI-compatible provider path (coding endpoint supported)
     - keep existing findings schema

3. Local fallback PI path
   - Status: completed
   - Deliverables:
     - keep local PI rules as fallback only
     - fallback triggers only when external path unavailable/fails

4. Baseline architecture protection
   - Status: completed
   - Deliverables:
     - do not refactor non-PI existing scan architecture
     - avoid unrelated pipeline behavior changes

5. Validation and regression
   - Status: completed
   - Deliverables:
     - PI fixtures pass
     - Promptfoo local mode pass
     - Promptfoo online connectivity/smoke/full modes pass when credentials available
     - full test suite green

## 3. Acceptance Gate Before Release

1. `PI-1` and `PI-2` both produce report findings under existing schema.
2. External PI path is primary; local PI path is fallback-only.
3. Clean fixture has no PI hit.
4. `/scan -> /scan/report/:id -> /scan/poster/:id` flow remains stable.
5. `npm test` and `npm run build` pass.

## 4. Implementation Notes (Current)

1. Runtime detector:
   - `lib/scan/external-pi-detectors/promptfoo-detector.ts`
   - direct Z.AI OpenAI-compatible `chat/completions` call
2. Evaluation harness:
   - `tests/promptfoo/prompt-injection.local.yaml`
   - `tests/promptfoo/prompt-injection.online.yaml`
   - scripts in `package.json` (`test:promptfoo:*`)
3. Report visibility:
   - report page includes explicit Prompt Injection Scan section (enabled + PI hit counts)

## 5. Notes

1. V0.2.3 intentionally excludes role split and paywall mechanics.
2. Scope is prompt-injection risk only.
3. External tooling is primary for PI; local rules are resilience fallback.
4. Z.AI OpenAI-compatible provider path is the online evaluation target.
