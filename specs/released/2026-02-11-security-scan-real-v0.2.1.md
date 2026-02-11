# OpenSpec Spec: Security Scan Real Static Analysis V0.2.1

## 0. Meta

- Date: 2026-02-11
- Stage: Active (Implementation-ready)
- Owner: Product + Engineering
- Parent proposal: `specs/proposals/2026-02-11-security-scan-real-v0.2.md`

## 1. Objective

Deliver the first real scanning release by integrating mature repository scanners:

`GitHub repo URL -> authenticated GitHub API intake -> Semgrep + Gitleaks -> normalized report output`

V0.2.1 is the baseline that replaces demo simulation with repository-grounded findings.

## 2. Scope

1. Real GitHub repository intake
   - parse supported URL formats
   - resolve default branch when ref absent
   - traverse repository tree and fetch file contents
   - support authenticated mode via `GITHUB_TOKEN`
2. External scanner integration
   - Semgrep adapter
   - Gitleaks adapter
3. Finding normalization
   - map scanner output to internal `Finding` schema
   - stable merge order for report rendering
4. Backward-compatible report generation
   - keep existing report/presenter API contracts
   - set `engineVersion` to `v0.2.1`

## 3. Out of Scope (V0.2.1)

1. npm/npx command intake scanning (moved to V0.2.2)
2. Prompt injection and agent-risk custom rules (moved to V0.2.3)
3. Advanced dedupe/performance/false-positive governance (moved to V0.2.4)
4. Runtime sandbox execution

## 4. API and Data Expectations

1. `POST /api/scan` still returns:

```json
{
  "scanId": "scan_xxx",
  "status": "completed"
}
```

2. `GET /api/scan/:id` includes findings from Semgrep/Gitleaks in existing schema.
3. `GET /api/scan/:id/poster` remains compatible.
4. `engineVersion` must be `v0.2.1`.

## 5. Acceptance Criteria

1. Public GitHub repository URL triggers real file intake and static scanning.
2. At least one validation run confirms Semgrep findings are present in report output.
3. At least one validation run confirms Gitleaks findings are present in report output.
4. Existing report and poster pages render without schema break.
5. Typed scan failures are preserved (no generic-only failures on known cases).
6. Authenticated GitHub mode works when `GITHUB_TOKEN` is provided.

## 6. Test and Release Gate

V0.2.1 is releasable only when all checks pass:

1. Unit tests
   - GitHub intake parser/traversal/filter/timeout
   - Semgrep adapter parse/normalize/fallback
   - Gitleaks adapter parse/normalize/fallback
2. Integration tests
   - `POST /api/scan` with mocked intake/scanner outputs
   - `GET /api/scan/:id` merged finding payload validation
3. Manual E2E
   - low-risk public repo
   - risky public repo with known patterns
   - medium-size public repo
4. Hard gate
   - `npm test` passes
   - `engineVersion = v0.2.1`
   - both scanner outputs appear in validation artifacts
   - authenticated request path is validated with token-enabled run

## 7. Risks and Mitigations

1. Risk: scanner binaries unavailable in environment  
   Mitigation: define fail-open or fail-closed policy explicitly before release.

2. Risk: GitHub API limits reduce scan success  
   Mitigation: enforce timeout/limits and return typed errors.

3. Risk: scanner output shape changes across versions  
   Mitigation: adapter-level normalization tests with fixtures.

## 8. Next Step

1. Move change plan `2026-02-11-security-scan-real-v0.2.1.md` to in-progress.
2. Execute `docs/v0.2.1-implementation-playbook.md`.
