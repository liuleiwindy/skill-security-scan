# OpenSpec Proposal: Security Scan npm/npx Intake V0.2.2

## 0. Meta

- Date: 2026-02-11
- Stage: Proposal (Review-ready)
- Owner: Product + Engineering
- Parent proposal: `specs/proposals/2026-02-11-security-scan-real-v0.2.md`
- Previous release baseline: `specs/released/2026-02-11-security-scan-real-v0.2.1.md`

## 1. Problem Statement

V0.2.1 already supports real GitHub repository scanning, but user input is still repository-URL-centric.
In real usage, many users start from installation commands (`npx ...`, `npm i ...`) instead of repository links.
This causes input friction and blocks quick trust checks on package-first workflows.

## 2. Goal (V0.2.2)

Deliver package-command-first static scanning:

`npm/npx command input -> npm registry metadata -> tarball download + safe extraction -> shared static scan pipeline -> report`

Primary objective: let users scan from install commands without manually finding repository URLs.

## 3. Non-Goals (V0.2.2)

1. `pnpm dlx` and `yarn dlx` support (defer)
2. Lockfile dependency graph traversal
3. Deep transitive dependency analysis
4. Runtime execution/sandbox of package scripts
5. New scoring model

## 4. Scope

### 4.1 Input Normalization

Support these input classes under existing `/api/scan` flow:

1. GitHub URL (existing path, unchanged)
2. `npx <pkg[@version]> [args...]`
3. `npm i <pkg[@version]>`
4. `npm install <pkg[@version]>`

Parser requirements:

1. Ignore extra runtime args after package token for `npx`
2. Preserve explicit version when provided (`pkg@1.2.3`)
3. Default to `latest` when version is omitted
4. Return typed `invalid_package_input` on malformed command

### 4.2 npm Registry Intake

For npm-command input:

1. Resolve package metadata via npm registry API
2. Resolve exact tarball URL and package version
3. Download tarball with bounded timeout and size checks
4. Extract package files to temp workspace safely

Safety bounds:

1. Max tarball bytes: `10MB`
2. Max extracted file count: `300`
3. Max extracted single-file size: `300KB`
4. Path traversal prevention (`../` and absolute path escapes)
5. Total intake timeout: `25s`

### 4.3 Shared Scan Pipeline Reuse

1. Reuse existing internal rules + Semgrep + Gitleaks merge pipeline
2. Reuse existing report schema and scoring behavior
3. Keep report/poster route contracts unchanged

### 4.4 Source Metadata

Set source metadata in report:

1. GitHub intake: `scanMeta.source = "github_api"` (existing)
2. npm intake: `scanMeta.source = "npm_registry"`
3. Add optional npm context fields:
   - `scanMeta.packageName`
   - `scanMeta.packageVersion`
4. Do not store `scanMeta.packageTarballUrl` in V0.2.2 (privacy-minimized baseline).

## 5. API Contract (Delta)

### 5.1 POST `/api/scan`

Backward compatibility rule:

1. Keep request field name `repoUrl` for V0.2.x compatibility.
2. `repoUrl` now accepts either:
   - GitHub URL
   - npm/npx command string

Success response unchanged:

```json
{
  "scanId": "scan_xxx",
  "status": "completed"
}
```

New typed failure examples:

```json
{
  "error": "invalid_package_input",
  "message": "Unsupported npm/npx command format"
}
```

```json
{
  "error": "npm_package_not_found",
  "message": "Package not found on npm registry"
}
```

```json
{
  "error": "npm_tarball_too_large",
  "message": "Package tarball exceeds scan size limit"
}
```

```json
{
  "error": "npm_extracted_files_exceeded",
  "message": "Extracted package file count exceeds scan limit"
}
```

```json
{
  "error": "npm_extracted_file_too_large",
  "message": "An extracted file exceeds per-file scan size limit"
}
```

```json
{
  "error": "npm_fetch_failed",
  "message": "Failed to fetch package metadata or tarball"
}
```

### 5.2 Report payload

No structural break.

1. `engineVersion = "v0.2.2"`
2. `scanMeta.source` supports `npm_registry`
3. npm context fields are optional and backward compatible

## 6. UX and Messaging

1. `/scan` input helper copy explicitly shows npm/npx examples
2. Error messages should distinguish GitHub failures vs npm failures
3. Keep disclaimer: static scan only, not full security audit

## 7. Acceptance Criteria (V0.2.2)

1. Input `npx <pkg>` can complete scan and generate report.
2. Input `npm i <pkg@version>` can complete scan using specified version.
3. Report includes `scanMeta.source = "npm_registry"` for npm intake.
4. Existing GitHub URL scan path remains functional and unchanged.
5. Typed npm errors are returned for malformed command, missing package, tarball oversize, extracted-file-count oversize, and per-file oversize.
6. Existing report and poster pages render V0.2.2 reports without route/schema break.
7. Test suite covers parser, registry intake, extraction safety, and API error paths.

## 8. Risks and Mitigations

1. Risk: malformed or malicious tarball contents
   Mitigation: strict extraction guardrails and path sanitization.

2. Risk: package size explosion causing latency spikes
   Mitigation: hard limits on tarball bytes, file count, and per-file bytes.

3. Risk: npm availability/network instability
   Mitigation: explicit timeout and typed `npm_fetch_failed` contract.

4. Risk: confusion due to `repoUrl` field naming
   Mitigation: document compatibility rationale in spec and API docs; consider `scanTarget` rename in future major version.

## 9. Decisions Locked for V0.2.2

1. `repoUrl` compatibility field remains as-is for V0.2.x; `scanTarget` rename is deferred.
2. Version resolution defaults to stable releases only (exclude pre-release tags unless explicitly requested in command).

## 10. Next Step in OpenSpec Flow

After proposal approval:

1. Create active spec: `specs/active/2026-02-11-security-scan-real-v0.2.2.md`
2. Execute playbook: `docs/archive/v0.2.2-implementation-playbook.md`
3. Move release-ready spec into `specs/released/`
