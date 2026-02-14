# OpenSpec Spec: Security Scan Intake Timeout + Adaptive GitHub Concurrency V0.2.3.6

## 0. Meta

- Date: 2026-02-14
- Stage: Active
- Owner: Product + Engineering
- Previous release baseline: `specs/released/2026-02-13-security-scan-abuse-fallback-controls-v0.2.3.5.md`

## 1. Objective

Reduce scan timeout failures on larger GitHub repositories while preserving existing API contract and typed error behavior.

## 2. Scope

1. Introduce a unified intake timeout env for GitHub + npm source collection.
2. Add adaptive GitHub blob fetch concurrency with env-configurable base value.
3. Keep timeout behavior typed and backward-compatible (`scan_timeout` -> `408`).
4. Clarify timeout message semantics to include total timeout and last request budget.

## 3. Out of Scope

1. No route changes.
2. No queue/worker redesign.
3. No score/risk model changes.
4. No external scanner behavior changes.

## 4. Technical Design

### 4.1 Unified Intake Timeout

Add shared intake timeout resolver in scan policy:

1. `SCAN_INTAKE_TIMEOUT_MS` (positive integer)
2. fallback default remains `25000ms`
3. invalid/non-positive values fallback to default

Apply this timeout to:

1. GitHub intake (`fetchGitHubRepoFiles`)
2. npm intake (`fetchNpmPackageFiles`)

### 4.2 Adaptive GitHub Blob Concurrency

For GitHub blob content fetch stage:

1. add base env: `SCAN_GITHUB_BLOB_CONCURRENCY` (default `4`)
2. for larger selection (`selected blob count >= 60`), auto scale to `min(base*2, 12)`
3. keep minimum concurrency `>=1`
4. maintain stable file order in output even under concurrent fetch
5. preserve existing skip semantics for empty/non-text/unreadable blobs

### 4.3 Timeout Message Compatibility

1. Intake timeout message includes:
   - total configured timeout
   - last request time budget
2. Hard timeout wrapper message includes total hard timeout and `(hard timeout)` marker.
3. Error code remains unchanged: `scan_timeout`.

## 5. Env Defaults

1. `SCAN_INTAKE_TIMEOUT_MS=25000`
2. `SCAN_GITHUB_BLOB_CONCURRENCY=4`
3. Existing hard timeout remains: `SCAN_HARD_TIMEOUT_MS=45000`

All env values optional; defaults apply when missing/invalid.

## 6. Contract and Compatibility

1. `POST /api/scan` response schema unchanged.
2. Typed timeout mapping unchanged: `scan_timeout` -> `408`.
3. No report schema changes.

## 7. Acceptance Criteria

1. Small repository scan behavior remains unchanged.
2. Large repository GitHub intake uses scaled concurrency automatically.
3. Timeout errors remain typed and mapped to `408`.
4. npm intake also obeys `SCAN_INTAKE_TIMEOUT_MS`.
5. Existing GitHub and npm intake test suites remain green.

## 8. Validation Plan

1. Unit/regression:
   - `tests/github.test.ts`
   - `tests/npm.test.ts`
   - `tests/store-timeout.test.ts`
2. Manual smoke:
   - large repo request returns faster under higher concurrency baseline
   - timeout message includes total timeout and budget details

## 9. Rollout Guidance

1. Start with conservative base concurrency (`4` or `6`).
2. Increase gradually if timeout rate stays high.
3. Monitor GitHub rate-limit and error patterns (`403`/`429`) when tuning upward.
