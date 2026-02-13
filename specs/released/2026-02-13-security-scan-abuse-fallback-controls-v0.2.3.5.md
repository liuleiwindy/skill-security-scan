# OpenSpec Spec: Security Scan Abuse Fallback Controls V0.2.3.5

## 0. Meta

- Date: 2026-02-13
- Stage: Released
- Owner: Product + Engineering
- Proposal source: `specs/proposals/2026-02-13-security-scan-abuse-fallback-controls-v0.2.3.5.md`
- Previous release baseline: `specs/released/2026-02-12-security-scan-modular-architecture-v0.2.3.4.md`

## 1. Objective

Close the anti-abuse gap in V0.2.3 line by shipping limiter/concurrency/timeout guardrails as persistent fallback controls.

## 2. Scope

1. Add request rate limiter for `POST /api/scan`.
2. Add process-level in-flight concurrency cap for scans.
3. Return typed `429 rate_limited` on limiter/cap rejection.
4. Add hard timeout boundary for scan execution path.
5. Keep API/report schema backward-compatible.

## 3. Out of Scope

1. No worker architecture integration (V0.2.5).
2. No queue system redesign.
3. No report/poster UX redesign.
4. No score or grade model changes.

## 4. Technical Design

### 4.1 Limiter Module

Create `lib/scan/abuse-guard.ts` (or equivalent) to own:

1. sliding-window request accounting keyed by client IP
2. in-flight job count accounting
3. allow/deny decision + reason

Required behaviors:

1. window-based max requests
2. deterministic cleanup of expired entries
3. no throw on malformed/missing IP; fallback to `unknown` key
4. safe env parsing: invalid/zero/negative env values must fall back to defaults
5. memory hygiene: when tracked IP windows grow beyond threshold, prune expired windows in batch

### 4.2 API Integration

`app/api/scan/route.ts` must:

1. check limiter before request body parse (`request.json()`)
2. increment in-flight count only after request accepted and payload validated
3. decrement in-flight count in `finally` to prevent leaks
4. map limiter/cap denial to `429 rate_limited`

### 4.3 Timeout Guard

Use bounded execution wrapper around `createAndStoreReport`:

1. enforce `SCAN_HARD_TIMEOUT_MS`
2. map timeout to existing typed timeout behavior (`scan_timeout`)
3. preserve existing non-timeout error mapping
4. timeout does not force-cancel underlying scan task; cleanup must still execute when task settles (no early workspace cleanup race)

## 5. Env Defaults

1. `SCAN_RATE_LIMIT_WINDOW_MS=60000`
2. `SCAN_RATE_LIMIT_MAX_REQUESTS=10`
3. `SCAN_MAX_INFLIGHT=4`
4. `SCAN_HARD_TIMEOUT_MS=45000`

All env values optional; defaults apply when missing/invalid.

## 6. Contract and Compatibility

1. No route changes.
2. Existing success payload unchanged.
3. Additive typed error only:

```json
{
  "error": "rate_limited",
  "message": "Scan rate limit exceeded, please retry later"
}
```

4. Existing report schema unchanged.

## 7. Acceptance Criteria

1. Same IP over threshold in configured window receives `429 rate_limited`.
2. When in-flight scans exceed cap, new requests receive `429 rate_limited`.
3. In-flight counter is always released on success/failure/timeout.
4. Timeout path returns typed timeout error mapping.
5. Existing API regression tests remain green.
6. `npm test` and `npm run build` pass.

## 8. Validation Plan

1. Unit tests:
   - window limiter allow/deny logic
   - window expiry behavior
   - invalid env fallback to defaults
   - large tracked-window pruning behavior
   - in-flight increment/decrement behavior
   - timeout path cleanup completion behavior
2. API tests:
   - burst requests trigger `429 rate_limited`
   - cap overflow triggers `429 rate_limited`
   - invalid JSON requests are counted by pre-parse rate limiter
   - normal request path unaffected under threshold
3. Regression:
   - existing typed error mappings unchanged
   - existing report/poster routes still functional

## 9. Release Gate

All below must pass before marking released:

1. new limiter and API tests green
2. full test suite green
3. build green
4. manual smoke: normal scan still works and blocked scan returns 429 typed payload

## 10. Next Step

After release, proceed to V0.2.4 growth UX and V0.2.5 worker integration with this guardrail baseline retained.
