# OpenSpec Proposal: Security Scan Cisco Worker Integration V0.2.4

## 0. Meta

- Date: 2026-02-12
- Stage: Proposal
- Owner: Product + Engineering
- Parent active baseline: `specs/active/2026-02-12-security-scan-modular-architecture-v0.2.3.4.md`
- Scope window: `v0.2.4.0 ~ v0.2.4.3`

## 1. Problem Statement

Current scanner runtime in this project is Node-first and optimized for lightweight deterministic rules plus selective external scanners.
Recent benchmark against Cisco `skill-scanner` shows major detection coverage gaps in skill-specific threat classes (data exfiltration, path traversal, SQL injection, trigger hijacking, behavioral chains).

At the same time, our product shell (Vercel-hosted UX/API/reporting/poster) is already production-usable and should be preserved.

Key tension:

1. Keep existing product flow and API contracts stable.
2. Upgrade scanner quality significantly by integrating Cisco scanner runtime.
3. Respect deployment reality: Vercel is not a suitable place to run heavy Python/YARA scan jobs.

## 2. Goal (V0.2.4)

Introduce a split-plane scanning architecture:

1. Vercel app remains control plane (request intake, task orchestration, report serving).
2. Dedicated Python Worker service executes Cisco scanner jobs.
3. Existing legacy scanner path remains available as fallback and rollback lane.
4. Public API contract remains backward-compatible; new fields are additive.

## 3. Non-Goals (V0.2.4)

1. No full rewrite of frontend report UX.
2. No removal of legacy engine in this version line.
3. No multi-cloud distributed queue redesign beyond minimal reliable async execution.
4. No account/paywall system changes.

## 4. Deployment Assumptions (Locked for this proposal)

1. Frontend/API gateway: Vercel.
2. Worker backend: separate server (user-managed) with Python runtime.
3. Connectivity: Vercel invokes Worker over public network endpoint (IP-reachable service).
4. Persistence: existing Postgres-backed report storage remains source of truth.

## 5. Architecture Direction

### 5.1 Control Plane (Vercel)

Responsibilities:

1. validate incoming scan request
2. create scan task + initial status
3. dispatch job to worker service (sync short ack or async fire-and-poll)
4. serve report status/result from repository

### 5.2 Compute Plane (Worker)

Responsibilities:

1. fetch/prepare scan target material (or consume payload from control plane)
2. execute `cisco-ai-skill-scanner`
3. normalize findings into internal domain model
4. return/write result with scanner metadata and execution diagnostics

### 5.3 Engine Modes

Introduce runtime mode switch:

1. `legacy` - existing Node scanner path only
2. `cisco` - worker path only
3. `hybrid` - run both and merge/compare (default during rollout)

## 6. Security Baseline for Vercel <-> Worker Calls

IP reachability alone is not sufficient. V0.2.4 requires signed request validation.

Mandatory controls:

1. HTTPS-only transport (no plain HTTP)
2. HMAC request signature headers: timestamp + nonce + body hash
3. request TTL check and replay protection window
4. worker-side rate limit + concurrency caps
5. strict input allowlist and size/time limits
6. egress guardrails on worker side to reduce SSRF blast radius
7. short sanitized error messages only (no internal stack traces in API payload)

Recommended headers contract:

1. `X-Scan-Timestamp`
2. `X-Scan-Nonce`
3. `X-Scan-Signature`
4. `X-Scan-Key-Id` (optional for key rotation)

## 7. Sub-Version Plan

### 7.1 `v0.2.4.0` - Worker Adapter Foundation

1. add worker client module in Vercel app
2. add env config for worker URL, timeout, signing key
3. add scanner mode switch (`legacy|cisco|hybrid`)
4. define normalized worker response schema and mapping

### 7.2 `v0.2.4.1` - Async Scan Job Flow

1. move scan execution to async task lifecycle
2. define scan statuses (`queued`, `running`, `completed`, `failed`, `partial`)
3. persist per-scan execution meta and timing
4. ensure report page polling remains backward-compatible

### 7.3 `v0.2.4.2` - Hybrid Comparison and Scoring Alignment

1. support dual-engine run in `hybrid`
2. persist per-engine findings/source tags
3. tune score/status synthesis from combined findings
4. add internal comparison metrics output for release decision

### 7.4 `v0.2.4.3` - Production Hardening and Default Flip Readiness

1. rollout guardrails (timeouts, retries, circuit breaker)
2. key rotation support for request signing
3. operational runbook + health checks + alert thresholds
4. decision gate to flip default mode from `legacy` to `hybrid` or `cisco`

## 8. Data Contract Additions (Additive)

Proposed additive fields under `scanMeta`:

1. `engineMode`: `legacy | cisco | hybrid`
2. `jobId`: async worker job identifier
3. `worker`:
   - `status`
   - `durationMs`
   - `version`
   - `errorCode?`
4. `engines[]`:
   - `name`
   - `status`
   - `findings`
   - `durationMs`

No existing fields are removed or renamed.

## 9. Acceptance Criteria

1. Existing public routes continue to work without contract break.
2. `legacy` mode behavior remains equivalent to v0.2.3 baseline.
3. Worker path can produce report-compatible findings in `cisco` mode.
4. `hybrid` mode persists per-engine result visibility for comparison.
5. Signed request validation enforced for worker endpoint.
6. `npm test` and `npm run build` remain green in integration branch.

## 10. Risks and Mitigations

1. Risk: Worker unavailable causes scan outage
   - Mitigation: mode fallback + circuit breaker to `legacy`
2. Risk: latency increase in hybrid mode
   - Mitigation: async job model + user-visible progress states
3. Risk: increased false positives from richer rule sets
   - Mitigation: staged default rollout and threshold tuning
4. Risk: credential/signing key leakage
   - Mitigation: key rotation policy and strict secret scoping

## 11. Open Questions for Active Spec

1. Queue implementation choice: DB queue vs external queue service.
2. Worker result writeback mode: callback API vs direct DB write.
3. Merge policy in `hybrid`: union-first or severity-priority dedupe.
4. Default failure policy: partial report vs hard fail when worker path errors.

## 12. Next Step

Create active execution spec for `v0.2.4.0` focused on:

1. worker client contract
2. signed request protocol
3. env and mode-switch wiring
4. minimal integration tests
