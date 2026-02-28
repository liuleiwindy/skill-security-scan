# OpenSpec Spec: npm Portable Extraction Patch v0.2.4.5

## 0. Meta

- Date: 2026-02-28
- Stage: Released
- Owner: Engineering
- Parent context: npm/npx intake (`v0.2.2`) runtime compatibility bugfix

## 1. Objective

Fix npm package scan failures in environments where system `tar` CLI is unavailable (e.g. some serverless runtimes).

## 2. Scope

1. Replace npm tarball extraction path from system `tar` subprocess calls to pure Node.js parsing.
2. Preserve existing API contract and error semantics.
3. Add regression tests for tgz extraction flow without external CLI dependency.

## 3. Design

1. `lib/scan/npm.ts`
   - remove `execFile("tar", ...)` usage from package extraction flow
   - parse `.tgz` using `zlib.gunzipSync` + internal tar header parser
   - keep existing safety controls:
     - file count limit
     - per-file size limit
     - path traversal sanitation
     - binary/null-byte skipping
2. Keep package metadata resolution and tarball download flow unchanged.

## 4. Acceptance Criteria

1. `npm i @scope/pkg` style input can complete scan without relying on system `tar`.
2. Existing npm error contracts remain compatible (`npm_tarball_too_large`, `npm_extracted_files_exceeded`, `npm_extracted_file_too_large`, `npm_fetch_failed`).
3. Unit test suite and build pass.

## 5. Validation

1. `npm test` passes.
2. `npm run build` passes.
3. Manual verification confirms `npm i @leo56/simple-redact-skill` can be scanned in local runtime and no longer depends on shell `tar`.
