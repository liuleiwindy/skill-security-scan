# Change Plan: Security Scan Abuse Fallback Controls V0.2.3.5

## 0. Links

- Proposal: `specs/proposals/2026-02-13-security-scan-abuse-fallback-controls-v0.2.3.5.md`
- Spec: `specs/released/2026-02-13-security-scan-abuse-fallback-controls-v0.2.3.5.md`
- Previous release baseline: `specs/released/2026-02-12-security-scan-modular-architecture-v0.2.3.4.md`

## 1. Execution Status

- Phase: Released
- Spec status: Released
- Implementation approval: Completed
- Release date: 2026-02-13

## 2. Action List

1. Introduce abuse guard module
   - Status: completed
   - Deliverables:
     - sliding-window limiter
     - in-flight concurrency cap
     - env-driven defaults and parsing
     - invalid env fallback to defaults
     - tracked-IP cleanup guard for stale windows

2. Integrate with `POST /api/scan`
   - Status: completed
   - Deliverables:
     - request allow/deny check before request body parse
     - typed `429 rate_limited` response
     - in-flight count release in `finally`
     - keep concurrency acquire after payload validation

3. Add hard timeout wrapper
   - Status: completed
   - Deliverables:
     - `SCAN_HARD_TIMEOUT_MS` boundary
     - timeout error mapping compatibility
     - avoid early workspace cleanup race on timeout

4. Add tests and regression checks
   - Status: completed
   - Deliverables:
     - limiter unit tests
     - API limiter/cap tests
     - pre-parse limiter test for invalid JSON flood
     - store timeout cleanup completion test
     - full regression (`npm test`, `npm run build`)

## 3. Milestones

1. M1 - limiter module and env defaults landed (completed)
2. M2 - API integration landed (completed)
3. M3 - test matrix and release gate green (completed)

## 4. Acceptance Gate Before "Done"

1. burst rejection returns typed `429 rate_limited`
2. cap rejection returns typed `429 rate_limited`
3. normal traffic under threshold passes
4. no API/report schema break
