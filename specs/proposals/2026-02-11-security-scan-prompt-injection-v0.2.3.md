# OpenSpec Proposal: Security Scan Prompt Injection Risk V0.2.3

## 0. Meta

- Date: 2026-02-12
- Stage: Proposal (Revised)
- Owner: Product + Engineering
- Parent proposal: `specs/proposals/2026-02-11-security-scan-real-v0.2.md`
- Previous release baseline: `specs/released/2026-02-11-security-scan-real-v0.2.2.md`

## 1. Problem Statement

Current versions already have a working repository scan pipeline, but they still miss one explicit trust signal:

`Does this skill contain prompt-injection risk?`

At the same time, implementation direction must avoid reinventing detection primitives already available in external tooling.

## 2. Goal (V0.2.3)

Add prompt-injection risk scanning in the existing product flow, with external tools as primary detectors and local rules only as fallback:

`existing scan flow -> cloud/external prompt-injection checks -> fallback local checks (if unavailable) -> report risk signal`

## 3. Non-Goals (V0.2.3)

1. No role split UI in this version.
2. No developer verification/paywall mechanics.
3. No broader agent-risk family rollout.
4. No scoring-system redesign.
5. No route/schema breaking change.
6. No major report/poster redesign (minimal PI visibility indicators are acceptable).

## 4. Scope

### 4.1 Risk Standard

Use OWASP LLM01 alignment with two locked classes:

1. `PI-1` Instruction Override
2. `PI-2` Prompt/Secret Exfiltration

### 4.2 Detection Strategy (Priority Order)

1. Primary: external/cloud-based prompt-injection evaluation tooling.
2. Fallback: existing deterministic local PI rules when cloud path is unavailable.
3. "Unavailable" includes missing credentials, provider/network failure, timeout, or tool-not-available conditions.

### 4.3 External Provider Requirement

For this project, external online evaluation must support Z.AI large model service through OpenAI-compatible API mode.

1. Provider mode:
   - runtime: direct `openai`-compatible `chat/completions` client path
   - validation: `promptfoo` eval harness for local/CI testing
2. Required runtime env:
   - `ZAI_API_KEY`
   - optional `ZAI_API_BASE_URL` (default project value should point to Z.AI OpenAI-compatible endpoint)
3. Promptfoo online config must be isolated from runtime detector code config files.

### 4.4 User Interaction Contract

Keep current product interaction unchanged:

1. input scan target
2. run scan
3. open report
4. open poster

Prompt-injection is an additional finding domain in report output, not a new page or route.

### 4.5 Report Output Contract

Keep existing finding schema unchanged:

1. `ruleId`
2. `severity`
3. `title`
4. `file`
5. `line`
6. `snippet`
7. `recommendation`

Only add PI findings under this existing schema.

## 5. Acceptance Criteria (V0.2.3)

1. Prompt-injection findings are visible in report output when PI scenarios hit.
2. PI classes are limited to `PI-1` and `PI-2`.
3. External tool path is attempted first for PI detection.
4. Local PI rules execute only when external path is unavailable.
5. Existing `/scan -> /scan/report/:id -> /scan/poster/:id` flow remains intact.
6. Existing baseline tests remain green.

## 6. Risks and Mitigations

1. Risk: External service instability.
   Mitigation: strict local fallback path with deterministic local PI rules.

2. Risk: Confusion about "no hit" meaning.
   Mitigation: keep current static-scan disclaimer language.

3. Risk: Scope creep into broader governance.
   Mitigation: lock v0.2.3 to PI-only domain and existing UI flow.

## 7. Decisions Locked for V0.2.3

1. External/cloud PI evaluation is primary.
2. Local PI rules are fallback-only.
3. Z.AI OpenAI-compatible mode is supported for online provider path.
4. No role/paywall expansion in v0.2.3.
5. No API contract break.

## 8. Next Step in OpenSpec Flow

After proposal approval:

1. update active spec to match this detection priority contract
2. implement only PI integration delta on top of existing pipeline
3. promote to `specs/released/` after acceptance criteria pass
