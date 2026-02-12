# Change Plan: Security Scan Real Static Analysis V0.2

## 0. Link to Proposal and Specs

- `specs/proposals/2026-02-11-security-scan-real-v0.2.md`
- `docs/archive/v0.2-implementation-playbook.md`
- `specs/released/2026-02-11-security-scan-real-v0.2.1.md`
- `docs/archive/v0.2.1-implementation-playbook.md`
- `specs/released/2026-02-11-security-scan-real-v0.2.2.md`
- `docs/archive/v0.2.2-implementation-playbook.md`

## 1. Execution Status

- Phase: V0.2.3 completed, V0.2.4 pending planning
- Spec status: Active
- Implementation approval: V0.2.3 delivered and validated

## 2. Action List (V0.2.x)

1. `v0.2.1` Real GitHub repository intake
   - Status: pending
   - Deliverables:
     - GitHub URL parser (`owner/repo/ref/path`)
     - tree traversal + blob fetching
     - bounded scan input assembly (`MockFile[]`)

2. `v0.2.1` External scanner integration baseline
   - Status: pending
   - Deliverables:
     - Semgrep adapter (run + normalize JSON findings)
     - Gitleaks adapter (run + normalize JSON findings)
     - merged finding pipeline (internal + external dedupe baseline)
     - set `engineVersion` to `v0.2.1`
     - authenticated GitHub mode via `GITHUB_TOKEN`

3. `v0.2.2` npm/npx input scanning
   - Status: completed
   - Deliverables:
     - input parser for repo URL vs install command
     - npm registry metadata + tarball intake
     - tarball extraction + scan pipeline reuse

4. `v0.2.3` Prompt-injection integration (external-first)
   - Status: completed
   - Deliverables:
     - prompt-injection findings for PI-1/PI-2
     - runtime external-first path via direct Z.AI `chat/completions`
     - Promptfoo online/local as validation harness
     - local deterministic rules fallback only
     - no non-PI architecture refactor

5. `v0.2.4` Quality and hardening (pending planning)
   - Status: pending
   - Deliverables:
     - stronger dedupe and normalization quality
     - rule tuning for false positive reduction
     - performance controls and scan latency guardrails
     - rate limit on `POST /api/scan`
     - timeout handling
     - typed API errors (`scan_timeout`, `repo_not_found`, `repo_private`, `github_rate_limited`, `repo_fetch_failed`)
     - remove simulated/demo wording
     - keep static-audit disclaimer
     - keep existing report/poster flow

6. `v0.2.4` Automated tests
   - Status: pending
   - Deliverables:
     - GitHub fetcher tests (with mocked fetch responses)
     - adapter normalization tests (Semgrep/Gitleaks)
     - npm/npx intake tests
     - API error path tests
     - prompt/agent rule tests
     - quality/performance regression tests

## 3. Milestones

1. M1 (`v0.2.1`) - Pipeline realness
   - Done when:
     - real public GitHub repo can produce findings from real files
2. M2 (`v0.2.1`) - External scanner baseline
   - Done when:
     - Semgrep and Gitleaks findings appear in normalized report output
3. M3 (`v0.2.2`) - npm/npx intake coverage
   - Done when:
     - install-command input can produce scan reports through shared pipeline
4. M4 (`v0.2.3`) - Prompt-injection coverage
   - Done when:
     - PI-1/PI-2 findings are available in reports
     - external path is primary, fallback path works on failure
5. M5 (`v0.2.4`) - Quality and reliability baseline
   - Done when:
     - timeout/rate-limit/error contract paths are covered by tests
     - dedupe/performance/false-positive metrics meet target
6. M6 (`v0.2.4`) - Product consistency
   - Done when:
     - report/poster UI works with v0.2 payload without route changes

## 4. Acceptance Gate Before "Done"

1. All V0.2.1~V0.2.4 acceptance criteria in active spec pass.
2. `npm test` passes with new v0.2 tests.
3. End-to-end manual check:
   - `/scan` submit public repo URL
   - `/scan/report/:id` displays real findings
   - `/scan/poster/:id` still renders and links correctly

## 5. Notes

1. V0.2.x remains static analysis only; no runtime sandbox execution.
2. Existing JSON/Postgres storage strategy remains valid.
3. External scanner integration is required by `v0.2.1`.
