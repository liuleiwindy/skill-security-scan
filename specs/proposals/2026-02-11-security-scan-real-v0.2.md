# OpenSpec Proposal: Security Scan Real Static Analysis V0.2

## 0. Meta

- Date: 2026-02-11
- Stage: Proposal (Review-ready)
- Owner: Product + Engineering
- Previous spec: `2026-02-10-security-scan-standalone-v0.1.md`

## 1. Problem Statement

V0.1 completed the scan/report/poster experience, but scan results are simulated and cannot be trusted as repository-grounded evidence.
V0.2 upgrades to real repository static analysis while preserving V0.1 product flow.

## 2. Goal (V0.2)

Deliver a real static scan pipeline:

`GitHub repo URL -> fetch real repository files -> run deterministic static analysis -> report/publisher flows`

Primary objective: move from demo trust signal to baseline real trust signal.

## 2.1 Sub-Version Plan (V0.2.x)

V0.2 is delivered in staged sub-versions:

1. `v0.2.1` - GitHub intake + mature scanners (Semgrep + Gitleaks) + authenticated GitHub API mode
2. `v0.2.2` - npm/npx input scanning (scan from package/install command, not only repo URL)
3. `v0.2.3` - Prompt-injection detection (external-first, local fallback)
4. `v0.2.4` - Quality/performance/false-positive governance (pending detailed planning)

Sub-spec links:

1. `specs/active/2026-02-11-security-scan-real-v0.2.1.md`

## 3. Non-Goals (V0.2)

1. Runtime sandbox execution of repository code
2. Full dynamic red-team attack simulation against live models
3. Account system, private report ACL, paid plans
4. Multi-repo batch scanning
5. Distributed queue/worker architecture

## 4. Scope (V0.2)

### 4.1 Real Repository Intake

1. Support public GitHub HTTPS URLs:
   - `https://github.com/{owner}/{repo}`
   - `https://github.com/{owner}/{repo}/tree/{ref}/{path?}`
2. Resolve default branch for repo-root URLs.
3. Traverse repository tree and fetch file contents via GitHub API.
4. Apply scanning limits:
   - max files
   - max file size
   - total scan timeout
5. Support authenticated GitHub API requests with `GITHUB_TOKEN` for higher limits and stability.

### 4.2 Rule Coverage

V0.2 rule families:

1. Existing static code risk rules
   - command execution misuse
   - download-and-execute patterns
   - secret leakage patterns
2. External scanner findings (introduced in `v0.2.1`)
   - Semgrep findings (SAST)
   - Gitleaks findings (secrets)
3. Prompt-injection coverage (introduced in `v0.2.3`)
   - PI-1 instruction override
   - PI-2 prompt/secret exfiltration
   - external tooling priority, local deterministic fallback

### 4.3 npm/npx Input Intake (V0.2.2)

1. Accept npm install-like input:
   - `npx <pkg[@version]> ...`
   - `npm i <pkg[@version]>`
2. Resolve package metadata from npm registry.
3. Download tarball and scan extracted package files through the same pipeline.
4. Report source metadata must distinguish GitHub vs npm intake.

### 4.4 Reliability Baseline

1. Basic scan creation rate limit.
2. Explicit timeout handling and typed failure responses.
3. Stable status/error contract for frontend rendering.

### 4.5 UX & Messaging

1. Remove “simulated results” copy.
2. Keep explicit disclaimer: “real static scan, not full security audit”.
3. Preserve existing report and poster URL contracts.

## 5. Technical Design Constraints

1. Reuse current report schema and API surface as much as possible.
2. Keep deterministic scoring and finding output shape.
3. No breaking changes to report page and poster page routes.

## 6. API Contract Updates (Delta from V0.1)

### 6.1 POST `/api/scan`

Success:

```json
{
  "scanId": "scan_xxx",
  "status": "completed"
}
```

Failure examples:

```json
{
  "error": "scan_timeout",
  "message": "Scan timed out after 25s"
}
```

```json
{
  "error": "repo_not_found",
  "message": "Repository, branch, or path was not found"
}
```

```json
{
  "error": "github_rate_limited",
  "message": "GitHub API rate limit exceeded, please retry later"
}
```

### 6.2 Report payload

No structural break; only version update:

1. `engineVersion: "v0.2"`
2. Findings may include new rule IDs for prompt/agent risks.

## 7. Data Contract (V0.2 additions)

Optional metadata added to stored report:

1. `scanMeta.filesScanned` (number)
2. `scanMeta.filesSkipped` (number)
3. `scanMeta.timeoutMs` (number)
4. `scanMeta.source` (`github_api`)

These fields are optional and backward compatible.

## 8. Acceptance Criteria (V0.2)

1. A public GitHub repository URL triggers real file fetching and analysis.
2. Scan findings can be traced to actual repository file paths and lines.
3. Prompt/agent risk findings can be produced from prompt/config files.
4. Timeout and inaccessible repository scenarios return typed API errors.
5. Existing report page and poster page render successfully with V0.2 reports.
6. Test suite covers:
   - repo URL parsing + fetch flow
   - scan timeout handling
   - prompt/agent rule matching
7. External scanner adapter path is functional (`v0.2.1+`):
   - Semgrep JSON findings can be normalized into report findings
   - Gitleaks JSON findings can be normalized into report findings
8. npm/npx intake path is functional (`v0.2.2+`) and shares the same report schema.
9. V0.2 final release gate (`v0.2.4`) requires all `v0.2.1~v0.2.4` criteria to pass.

## 8.1 V0.2.1 Test and Acceptance Gate

V0.2.1 is accepted only when all checks below pass:

1. Unit tests
   - GitHub intake parser/traversal/filter/timeout path
   - Semgrep adapter parse/normalize/fallback path
   - Gitleaks adapter parse/normalize/fallback path
2. Integration tests
   - `POST /api/scan` triggers real intake + scanner adapters
   - `GET /api/scan/:id` returns merged normalized findings
   - typed error paths are verified (`repo_not_found`, `repo_private`, `github_rate_limited`, `scan_timeout`, `repo_fetch_failed`)
3. Manual E2E checks on public repos
   - one low-risk sample repo
   - one repo containing known secret/unsafe patterns
   - one medium-size repo for latency sanity
4. Backward compatibility checks
   - existing report route and poster route render without schema break
5. Hard gate
   - `npm test` is fully green
   - `engineVersion` is `v0.2.1` in generated reports
   - Semgrep and Gitleaks findings both appear in at least one validation run

## 9. Risks and Mitigations

1. Risk: GitHub API rate limits affect scan success rate.  
   Mitigation: authenticated mode via `GITHUB_TOKEN`, bounded retries, and clear typed error messages.

2. Risk: npm tarball intake can include large or malformed packages.  
   Mitigation: strict size/file-count bounds and safe extraction rules.

3. Risk: Prompt injection static rules may have false positives.  
   Mitigation: conservative severity defaults and evidence-first findings.

4. Risk: Large repositories/packages degrade latency.  
   Mitigation: max-file, max-size, timeout hard limits.

## 10. Open Decisions

1. Whether scanner adapters fail-open (degrade gracefully) or fail-closed when tool binary is unavailable.
2. Whether to expose `scanMeta` fields in public report UI or keep API-only.
3. Final severity mapping for prompt/agent rules (`high` vs `medium` defaults).
4. Default repository/package limits for balancing latency and coverage.
5. npm command parser coverage boundary (`pnpm dlx`, `yarn dlx`) for future versions.

## 11. Next Step in OpenSpec Flow

Once this proposal is approved:

1. Set corresponding change plan to `in_progress`.
2. Execute implementation playbook tasks A-H.
3. Validate acceptance criteria and mark spec as implemented.
