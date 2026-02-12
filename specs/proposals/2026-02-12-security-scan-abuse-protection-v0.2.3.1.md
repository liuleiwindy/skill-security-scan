# OpenSpec Proposal: Security Scan Abuse Protection V0.2.3.1

## 0. Meta

- Date: 2026-02-12
- Stage: Proposal
- Owner: Product + Engineering
- Parent active spec: `specs/active/2026-02-11-security-scan-prompt-injection-v0.2.3.md`
- Previous release baseline: `specs/released/2026-02-11-security-scan-real-v0.2.2.md`

## 1. Problem Statement

`POST /api/scan` is a public endpoint. Even though API keys stay server-side, the endpoint can still be abused as a paid proxy for external model calls.

Main abuse paths:

1. burst requests from one IP (or a small IP set)
2. repeated scans on same target to trigger paid PI checks
3. high external-provider retry/timeout cost under unstable network

Resulting risks:

1. model quota drain ("薅额度")
2. unstable latency for normal users
3. operational cost spikes

## 2. Goal (V0.2.3.1)

Add low-risk anti-abuse controls that cap spend and preserve service quality, while keeping current UX and API schema stable.

## 3. Non-Goals (V0.2.3.1)

1. no user account/paywall rollout
2. no distributed Redis/KV limiter in this patch
3. no route or payload breaking change
4. no report UI redesign

## 4. Solution Direction

### 4.1 API Entry Protection

1. add in-memory sliding-window limiter on `POST /api/scan`
2. default key: client IP
3. optional global concurrency cap for scan jobs
4. return typed `429 rate_limited`

### 4.2 External PI Cost Guard

1. keep external PI as primary path
2. cap external PI call budget per scan (max files/inputs)
3. cap provider timeout and retry attempts
4. trigger deterministic local fallback on budget/circuit conditions

### 4.3 Abuse-Resilient Failure Policy

1. external PI failure must not block whole scan result
2. return report with fallback PI outcome when possible
3. log fallback reasons for diagnosis

## 5. Decisions Locked for V0.2.3.1

1. focus is abuse prevention, not credential leakage remediation
2. external model calls remain server-side only
3. promptfoo remains test/eval harness, not runtime engine
4. if protection conflicts with completeness, prioritize service stability

## 6. Acceptance Criteria

1. burst traffic receives `429 rate_limited` with stable error contract
2. normal usage under threshold still completes scan
3. external PI is attempted first in healthy path
4. fallback PI path works when budget/timeout/circuit is hit
5. baseline test suite remains green

## 7. Risks and Mitigations

1. false-positive throttling
   - mitigation: conservative defaults + env overrides
2. memory-only limiter not cross-instance
   - mitigation: document as v0.2.3.1 limit, plan distributed limiter later
3. frontend confusion on blocking
   - mitigation: explicit typed error and user-facing message
