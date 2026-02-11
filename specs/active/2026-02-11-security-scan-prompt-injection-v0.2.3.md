# OpenSpec Spec: Security Scan Prompt Injection Risk V0.2.3

## 0. Meta

- Date: 2026-02-11
- Stage: Active
- Owner: Product + Engineering
- Proposal source: `specs/proposals/2026-02-11-security-scan-prompt-injection-v0.2.3.md`
- Previous release baseline: `specs/released/2026-02-11-security-scan-real-v0.2.2.md`

## 1. Objective

Introduce a focused prompt-injection risk signal into the existing scan product, without expanding role systems or changing core flow.

Target outcome:

`users can quickly know whether prompt-injection risk exists`  
`developers can see evidence and remediation hints`

## 2. Scope

1. Add prompt-injection rule coverage in existing static scan pipeline.
2. Add two classes of findings:
   - `PI-1` Instruction Override
   - `PI-2` Prompt/Secret Exfiltration
3. Surface prompt-injection findings in existing report output.
4. Keep current report and poster routes unchanged.
5. Add fixture-based validation and regression tests.

## 3. Out of Scope (V0.2.3)

1. Role-based UI modes and switching logic.
2. Developer verification flow and paid gating.
3. Additional agent-risk families beyond prompt injection.
4. Scoring-system overhaul.
5. Major visual redesign of report/poster.

## 4. Interaction Contract

The user journey remains unchanged:

1. User submits scan target.
2. System runs scan.
3. Report displays findings plus prompt-injection signal.
4. Poster remains accessible and compatible.

Report content requirement:

1. On hit:
   - show clear "prompt-injection risk detected" messaging.
2. On no hit:
   - show clear "no obvious prompt-injection signal detected" messaging.

## 5. Risk Taxonomy for This Version

### 5.1 PI-1: Instruction Override

Definition:

Attempts to override, ignore, or bypass predefined instruction hierarchy.

Expected user-facing interpretation:

"This skill may be easier to manipulate away from intended behavior."

### 5.2 PI-2: Prompt/Secret Exfiltration

Definition:

Attempts to extract system prompt, hidden rules, or internal sensitive instruction text.

Expected user-facing interpretation:

"This skill may expose hidden prompt or internal guidance content."

## 6. Data and API Contract

No route or schema break.

1. Existing endpoints remain:
   - `POST /api/scan`
   - `GET /api/scan/:id`
   - `GET /api/scan/:id/poster`
2. Existing finding shape remains unchanged.
3. Prompt-injection findings are represented as normal findings with new `ruleId` values.
4. Existing report/poster pages must render without contract migration.

## 7. Validation and Quality Gate

### 7.1 Test Matrix (Minimum)

Unit/fixture tests:

1. PI-1 positive fixture (must trigger).
2. PI-2 positive fixture (must trigger).
3. Clean fixture (must not trigger).

Regression:

1. Existing API and scoring tests stay green.
2. Existing report/poster rendering path remains intact.

### 7.2 External Validation Practice

Use `promptfoo` as supplementary validation set for prompt-injection scenarios:

1. Confirm coverage of common instruction-override patterns.
2. Confirm coverage of prompt/secret-exfiltration patterns.
3. Use results for tuning thresholds and wording, not as runtime hard dependency.

## 8. Acceptance Criteria

1. Prompt-injection findings appear in report when PI fixtures are scanned.
2. PI-1 and PI-2 classes are both represented by at least one rule and one passing fixture.
3. Clean fixture produces no prompt-injection findings.
4. Existing scan/report/poster flow behavior is preserved.
5. Full test suite passes.

## 9. Release Notes Draft (V0.2.3)

V0.2.3 introduces focused prompt-injection risk signaling aligned to OWASP LLM01 with two classes: instruction override and prompt/secret exfiltration.  
This release intentionally keeps the interaction flow stable and avoids role/paywall scope expansion.
