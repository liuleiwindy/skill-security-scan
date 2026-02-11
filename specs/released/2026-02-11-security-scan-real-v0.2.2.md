# OpenSpec Spec: Security Scan npm/npx Intake V0.2.2

## 0. Meta

- Date: 2026-02-11
- Stage: Released
- Owner: Product + Engineering
- Parent proposal: `/Users/lei_liu/Documents/Code/skill-store/skill-security-scan/specs/proposals/2026-02-11-security-scan-real-v0.2.2.md`
- Previous release baseline: `/Users/lei_liu/Documents/Code/skill-store/skill-security-scan/specs/released/2026-02-11-security-scan-real-v0.2.1.md`

## 1. Objective

Add npm-command intake without breaking existing GitHub URL scan behavior:

`repoUrl input (GitHub URL | npm/npx command) -> source-specific intake -> shared static scan pipeline -> report`

V0.2.2 is accepted only if npm and GitHub paths both work under the same API contract.

## 2. Scope

1. Input classifier and parser
2. npm registry metadata + tarball intake
3. Safe extraction and bounded file assembly
4. Reuse existing rule engine + Semgrep + Gitleaks merge
5. Typed API failure contract for npm limit/extraction failures
6. Backward-compatible report/poster rendering

## 3. Out of Scope (V0.2.2)

1. `pnpm dlx` / `yarn dlx`
2. Transitive dependency graph scanning
3. Runtime execution or sandbox
4. Scoring model changes

## 4. Input Contract

`POST /api/scan` keeps field name `repoUrl`.

Accepted input classes:

1. GitHub URL (existing behavior unchanged)
2. `npx <pkg[@version|@tag]> [args...]`
3. `npm i <pkg[@version|@tag]>`
4. `npm install <pkg[@version|@tag]>`

Parsing rules:

1. Package token must be the first non-flag package token after command verb.
2. `npx` trailing args are ignored for intake resolution.
3. Scoped packages must be supported: `@scope/name`.
4. If version/tag is omitted, resolve as `latest` stable dist-tag.
5. Pre-release versions are excluded by default unless explicitly provided in input token.
6. Malformed or unsupported command form must return `invalid_package_input`.

Examples accepted:

1. `npx create-next-app@14 my-app`
2. `npm i lodash`
3. `npm install @types/node@20.11.30`

Examples rejected:

1. `npm add lodash`
2. `pnpm dlx foo`
3. empty/whitespace string

## 5. Intake Limits and Enforcement Order

Hard limits:

1. Tarball response size: `<= 10MB`
2. Intake timeout (metadata + tarball + extraction): `25s`
3. Extracted candidate files for scanning: `<= 300`
4. Single extracted file size: `<= 300KB`

Enforcement order:

1. Validate command syntax and classify source.
2. Resolve npm metadata (or GitHub path for repo URLs).
3. Enforce tarball download size limit during stream/read.
4. Extract archive with path safety checks.
5. Enforce extracted file count and per-file size before scan assembly.
6. Run shared scan pipeline.

## 6. Extraction Safety Rules

For npm tarball extraction:

1. Reject absolute paths and traversal paths (`/`, `../`, `..\\`).
2. Normalize and verify extracted target remains inside workspace root.
3. Ignore symlink entries (do not follow links during extraction).
4. Only include text-like files that pass existing scanner include/exclude filters.
5. Skip binary/null-byte files from scan candidate set.

## 7. API Error Contract

Success (unchanged):

```json
{
  "scanId": "scan_xxx",
  "status": "completed"
}
```

Typed errors and HTTP mapping:

1. `invalid_repo_url` -> `400`
2. `invalid_package_input` -> `400`
3. `npm_package_not_found` -> `404`
4. `npm_tarball_too_large` -> `413`
5. `npm_extracted_files_exceeded` -> `413`
6. `npm_extracted_file_too_large` -> `413`
7. `scan_timeout` -> `408`
8. `npm_fetch_failed` -> `502`
9. Existing GitHub errors keep v0.2.1 mapping behavior.

## 8. Data Contract

No schema break on report payload.

Required updates:

1. `engineVersion = "v0.2.2"`
2. `scanMeta.source` supports:
   - `github_api`
   - `npm_registry`
3. npm optional metadata fields:
   - `scanMeta.packageName`
   - `scanMeta.packageVersion`
4. Do not persist tarball URL in report metadata.

## 9. Acceptance Criteria

1. npm command input can produce report ID via `POST /api/scan`.
2. `npm i <pkg@version>` respects explicit version.
3. GitHub URL path remains functional.
4. Typed npm errors are returned for:
   - malformed command
   - package not found
   - tarball oversize
   - extracted file count oversize
   - extracted single-file oversize
5. `/scan/report/:id` and `/scan/poster/:id` render v0.2.2 reports without schema regression.
6. `scanMeta.source` is correct for both sources.

## 10. Test Matrix (Minimum)

Unit tests:

1. Parser: valid/invalid `npx`, `npm i`, `npm install`
2. Parser: scoped package and explicit version/tag handling
3. Intake limits: tarball size, file count, single file size
4. Extraction safety: traversal and symlink rejection

Integration/API tests:

1. npm success path (latest)
2. npm success path (explicit version)
3. npm error paths:
   - `invalid_package_input`
   - `npm_package_not_found`
   - `npm_tarball_too_large`
   - `npm_extracted_files_exceeded`
   - `npm_extracted_file_too_large`
4. GitHub regression path still green

Release gate:

1. `npm test` fully green
2. `engineVersion = v0.2.2` in generated reports
3. At least one validated npm scan artifact and one GitHub regression artifact

## 11. Release Note

V0.2.2 implementation is archived as released with dynamic `npx skills add owner/repo`
GitHub source resolution, dynamic `SKILL.md` scope discovery, and bounded timeout/scope controls.
