# Change Plan: Security Scan Abuse Fallback Controls V0.2.3.5

## 0. Links

- Proposal: `specs/proposals/2026-02-13-security-scan-abuse-fallback-controls-v0.2.3.5.md`
- Active spec: `specs/active/2026-02-13-security-scan-abuse-fallback-controls-v0.2.3.5.md`
- Previous release baseline: `specs/released/2026-02-12-security-scan-modular-architecture-v0.2.3.4.md`

## 1. Execution Status

- Phase: Pre-implementation
- Spec status: Active
- Implementation approval: Pending execution

## 2. Action List

1. Introduce abuse guard module
   - Status: pending
   - Deliverables:
     - sliding-window limiter
     - in-flight concurrency cap
     - env-driven defaults and parsing

2. Integrate with `POST /api/scan`
   - Status: pending
   - Deliverables:
     - request allow/deny check before scan start
     - typed `429 rate_limited` response
     - in-flight count release in `finally`

3. Add hard timeout wrapper
   - Status: pending
   - Deliverables:
     - `SCAN_HARD_TIMEOUT_MS` boundary
     - timeout error mapping compatibility

4. Add tests and regression checks
   - Status: pending
   - Deliverables:
     - limiter unit tests
     - API limiter/cap tests
     - full regression (`npm test`, `npm run build`)

## 3. Milestones

1. M1 - limiter module and env defaults landed
2. M2 - API integration landed
3. M3 - test matrix and release gate green

## 4. Acceptance Gate Before "Done"

1. burst rejection returns typed `429 rate_limited`
2. cap rejection returns typed `429 rate_limited`
3. normal traffic under threshold passes
4. no API/report schema break
