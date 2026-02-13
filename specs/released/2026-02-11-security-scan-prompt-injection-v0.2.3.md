# OpenSpec Spec: Security Scan Prompt Injection Risk V0.2.3

## 0. Meta

- Date: 2026-02-12
- Stage: Released
- Owner: Product + Engineering
- Proposal source: `specs/proposals/2026-02-11-security-scan-prompt-injection-v0.2.3.md`
- Previous release baseline: `specs/released/2026-02-11-security-scan-real-v0.2.2.md`

## 1. Objective

Add prompt-injection risk scanning to the current product with strict implementation priority:

1. external/cloud tooling first
2. local deterministic PI rules only as fallback

This version must not refactor existing non-PI scan architecture.

## 2. Scope

1. Keep existing scan flow and routes.
2. Add prompt-injection risk findings for:
   - `PI-1-INSTRUCTION-OVERRIDE`
   - `PI-2-PROMPT-SECRET-EXFIL`
3. Use external tooling as primary PI detector.
4. Use local PI detector only when external path is unavailable.
5. Keep finding schema and score pipeline unchanged.

## 3. Out of Scope

1. Role split and role-specific UI.
2. Payment/verification mechanics.
3. Broader agent-risk families.
4. Report/poster redesign (except minimal PI scan visibility indicators).
5. API schema break.

## 4. Interaction Contract

No UX path changes:

1. user submits target
2. system scans
3. report shows findings
4. poster remains available

PI risk is shown as part of existing findings list.
Minimal transparency UI (for example PI scan enabled/hit counters) is allowed without changing routes or payload schema.

## 5. PI Taxonomy and Severity

### 5.1 PI-1

- ID: `PI-1-INSTRUCTION-OVERRIDE`
- Severity: `high`
- Meaning: attempts to bypass/override instruction hierarchy

### 5.2 PI-2

- ID: `PI-2-PROMPT-SECRET-EXFIL`
- Severity: `high`
- Meaning: attempts to extract hidden prompt/internal sensitive instruction content

## 6. Detection Architecture

### 6.1 Priority Order (Mandatory)

1. External PI scanning path first.
2. Local PI scanning path only when external path fails or is unavailable.

### 6.2 External Tooling Path

Runtime scanning uses direct Z.AI OpenAI-compatible API calls.
Promptfoo is used as the validation/evaluation harness in local/CI tests.

1. Runtime online provider target: Z.AI OpenAI-compatible endpoint (`/chat/completions`).
2. Required runtime environment:
   - `ZAI_API_KEY`
   - `ZAI_API_BASE_URL` (optional override; coding endpoint supported)
   - `ZAI_PI_MODEL` (optional override; default `glm-4.5`)
3. Promptfoo online config is isolated from runtime detector code:
   - `tests/promptfoo/prompt-injection.online.yaml`

### 6.3 Local Fallback Path

Local PI rules are retained only for resiliency.

Fallback is triggered by external path errors such as:

1. missing credential
2. network/provider failure
3. timeout
4. tool unavailable

### 6.4 Existing Architecture Protection

V0.2.3 must not rework existing baseline scan orchestration unrelated to PI.

## 7. Data and API Contract

No route changes:

1. `POST /api/scan`
2. `GET /api/scan/:id`
3. `GET /api/scan/:id/poster`

No finding schema changes:

1. `ruleId`
2. `severity`
3. `title`
4. `file`
5. `line`
6. `snippet`
7. `recommendation`

## 8. Validation and Quality Gate

### 8.1 Required Tests

1. PI-1 positive fixture
2. PI-2 positive fixture
3. clean negative fixture
4. API/report/poster regression tests remain green

### 8.2 Promptfoo Validation Modes

1. Local mode (fast regression, no online dependency)
2. Online mode (Z.AI provider path verification)

Recommended validation order:

1. `npm test`
2. `npm run build`
3. `npm run test:promptfoo` (local)
4. `npm run test:promptfoo:online:connect` (connectivity)
5. `npm run test:promptfoo:online:quick` (single-case smoke)
6. `npm run test:promptfoo:online` (release/manual gate)

### 8.3 External Interface Setup (Z.AI)

1. Set runtime env:
   - `ZAI_API_KEY`
   - `ZAI_API_BASE_URL`
   - optional `ZAI_PI_MODEL`
2. Runtime detector calls OpenAI-compatible `chat/completions` and maps JSON output to PI finding IDs.
3. Promptfoo configs validate behavior and regression, but are not the runtime execution path.

## 9. Acceptance Criteria

1. PI findings appear in report with existing finding schema.
2. External path is executed first for PI detection.
3. Local PI rules are used only when external path is unavailable.
4. Existing baseline scan behavior outside PI remains stable.
5. Full test suite passes.

## 10. Release Notes Draft

V0.2.3 adds prompt-injection risk detection with two classes (`PI-1`, `PI-2`) while keeping current user flow unchanged.  
Implementation prioritizes external/cloud-based PI checks and uses local deterministic PI rules only as fallback.
