# OpenSpec Proposal: Security Scan Abuse Fallback Controls V0.2.3.5

## 0. Meta

- Date: 2026-02-13
- Stage: Proposal
- Owner: Product + Engineering
- Parent released baseline: `specs/released/2026-02-12-security-scan-modular-architecture-v0.2.3.4.md`
- Related forward plan: `specs/proposals/2026-02-12-security-scan-cisco-worker-integration-v0.2.4.md`

## 1. Problem Statement

V0.2.3 functional and modular goals are effectively complete, but anti-abuse controls remain unshipped.
Current `POST /api/scan` still lacks robust entry protection for high-cost scanning paths.

This leaves a practical risk:

1. abusive burst calls can burn compute/API budget
2. fallback controls for scanner instability are not explicit enough
3. upcoming V0.2.4 worker integration would inherit this risk if baseline controls are missing

## 2. Goal (V0.2.3.5)

Ship a narrow hardening patch that makes anti-abuse controls a persistent fallback layer before V0.2.4 integration.

Core target:

1. rate limit and concurrency protection at scan entry
2. stable typed throttling contract (`429 rate_limited`)
3. bounded scanner timeout/failure fallback behavior
4. no route or payload breaking change

## 3. Non-Goals (V0.2.3.5)

1. no Cisco worker integration in this patch
2. no UI redesign
3. no account/paywall system
4. no scoring-model redesign

## 4. Scope

### 4.1 API Entry Guards

1. add request limiter for `POST /api/scan` (IP-keyed window), executed before request body parsing
2. add global in-flight scan concurrency cap
3. return stable typed 429 response when blocked

### 4.2 Scanner Fallback Guardrails

1. enforce scan-time upper bound with typed timeout mapping
2. preserve non-blocking scanner behavior (request may timeout while underlying task finishes cleanup asynchronously)
3. avoid early workspace cleanup race during timeout path

### 4.3 Operational Config Surface

Add env-tunable limits with safe defaults:

1. `SCAN_RATE_LIMIT_WINDOW_MS`
2. `SCAN_RATE_LIMIT_MAX_REQUESTS`
3. `SCAN_MAX_INFLIGHT`
4. `SCAN_HARD_TIMEOUT_MS`

## 5. API/Error Contract

No route changes:

1. `POST /api/scan`
2. `GET /api/scan/:id`
3. `GET /api/scan/:id/poster`

Add/confirm typed errors:

1. `rate_limited` -> `429`
2. existing typed timeout errors remain compatible (`scan_timeout`)

Suggested 429 body:

```json
{
  "error": "rate_limited",
  "message": "Scan rate limit exceeded, please retry later"
}
```

## 6. Acceptance Criteria

1. burst calls above threshold receive stable `429 rate_limited`
2. normal traffic below threshold remains unaffected
3. in-flight concurrency cap blocks excess scans deterministically
4. timeout/fallback paths remain non-breaking and typed
5. `npm test` and `npm run build` pass

## 7. Risks and Mitigations

1. risk: overly strict defaults hurt normal users
   - mitigation: conservative default values + env overrides
2. risk: memory-only limiter not shared across instances
   - mitigation: document as V0.2.3.5 local baseline; distributed limiter deferred to V0.2.4+
3. risk: introducing controls changes API behavior unexpectedly
   - mitigation: keep additive typed errors only and add dedicated API tests

## 8. Release Positioning

V0.2.3.5 is a hardening patch and release gate for V0.2.4.
No V0.2.4 worker rollout should start before this baseline is released.

## 9. Next Step

Create active implementation spec for `v0.2.3.5` with:

1. concrete limiter algorithm and data structures
2. exact env defaults
3. test plan for throttling/concurrency/timeout paths
