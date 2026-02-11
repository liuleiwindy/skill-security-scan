# OpenSpec Proposal: Security Scan Prompt Injection Risk V0.2.3

## 0. Meta

- Date: 2026-02-11
- Stage: Proposal (Review-ready)
- Owner: Product + Engineering
- Parent proposal: `specs/proposals/2026-02-11-security-scan-real-v0.2.md`
- Previous release baseline: `specs/released/2026-02-11-security-scan-real-v0.2.2.md`

## 1. Problem Statement

Current versions can scan repository risks and produce useful findings, but the report does not explicitly answer one high-impact trust question:

`Does this skill contain prompt-injection patterns that may mislead model behavior or extract hidden instructions/secrets?`

For both users and developers, this gap makes "can I trust this skill?" decisions slower and less consistent.

## 2. Goal (V0.2.3)

Add a focused Prompt Injection risk capability with minimal product surface change:

`existing scan flow -> detect prompt-injection indicators -> show clear risk signal in report`

This version is intentionally small: one new risk domain, no role system expansion.

## 3. Non-Goals (V0.2.3)

1. No role-based product architecture (defer to v0.3+).
2. No developer verification/paywall flow.
3. No broad agent-risk bundle beyond prompt injection.
4. No scoring model redesign.
5. No major report/poster layout redesign.

## 4. Scope

### 4.1 Risk Standard

Use OWASP LLM01 (Prompt Injection) as the alignment baseline, with two product-facing classes:

1. `PI-1` Instruction Override
   - Attempts to ignore, override, or bypass existing system/developer instructions.
2. `PI-2` Prompt/Secret Exfiltration
   - Attempts to reveal system prompt, hidden policy text, or sensitive internal instructions/secrets.

### 4.2 User Interaction Contract

Keep current flow unchanged:

1. Input repository URL/scan target
2. Run scan
3. Show report
4. Open poster

Report requirement:

1. If matched: clearly show prompt-injection risk present.
2. If not matched: clearly show no obvious prompt-injection signal detected.

### 4.3 Report Output Delta

Add prompt-injection findings under existing findings model without schema break:

1. Reuse finding fields (`ruleId`, `severity`, `title`, `file`, `line`, `snippet`, `recommendation`).
2. Add rule IDs under prompt-injection namespace (PI-1/PI-2 mapped IDs).
3. Keep API route and page route contracts unchanged.

### 4.4 Validation Strategy (Avoid Reinventing)

1. Primary detection remains inside existing scanner rule pipeline.
2. Use `promptfoo` as external validation/regression reference for prompt-injection coverage.
3. Do not integrate additional runtime-defense tools in this version.

## 5. Acceptance Criteria (V0.2.3)

1. Prompt-injection risk can be detected and surfaced in report output.
2. Both classes (`PI-1`, `PI-2`) have at least one positive fixture.
3. At least one clean fixture produces no prompt-injection finding.
4. Existing scan/report/poster flow remains functional without route changes.
5. No regression on existing v0.2.2 baseline test suite.

## 6. Risks and Mitigations

1. Risk: False positives on generic prompt text.
   Mitigation: keep rule wording precise and evidence-focused.

2. Risk: Scope creep into broader agent behavior governance.
   Mitigation: lock scope to prompt injection only in v0.2.3.

3. Risk: User confusion between "no signal" and "fully safe."
   Mitigation: keep static-scan disclaimer unchanged.

## 7. Decisions Locked for V0.2.3

1. Only prompt-injection risk is in scope.
2. Only two classes are tracked: `PI-1` and `PI-2`.
3. No role split and no paywall mechanics in this version.
4. `promptfoo` is used as validation aid, not as a hard runtime dependency.
5. Local context window for co-occurrence matching is fixed at ±2 lines (5-line total window).
6. `snippet` max length is fixed at 200 characters.

## 8. Next Step in OpenSpec Flow

After proposal approval:

1. Create active spec:
   - `specs/active/2026-02-11-security-scan-prompt-injection-v0.2.3.md`
2. Execute implementation and validation.
3. Promote to `specs/released/` after acceptance gate passes.
