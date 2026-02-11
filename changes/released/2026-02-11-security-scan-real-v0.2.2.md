# Change Plan: Security Scan npm/npx Intake V0.2.2

## 0. Links

- Proposal: `/Users/lei_liu/Documents/Code/skill-store/skill-security-scan/specs/proposals/2026-02-11-security-scan-real-v0.2.2.md`
- Spec: `/Users/lei_liu/Documents/Code/skill-store/skill-security-scan/specs/released/2026-02-11-security-scan-real-v0.2.2.md`
- Playbook: `/Users/lei_liu/Documents/Code/skill-store/skill-security-scan/docs/v0.2.2-implementation-playbook.md`
- Parent plan: `/Users/lei_liu/Documents/Code/skill-store/skill-security-scan/changes/active/2026-02-11-security-scan-real-v0.2.md`

## 1. Execution Status

- Phase: Released
- Spec status: Released
- Implementation approval: Completed

## 2. Action List (V0.2.2)

1. Input classifier and parser
   - Status: completed
   - Deliverables:
     - GitHub URL vs npm-command classifier
     - parser for `npx` / `npm i` / `npm install`
     - typed parser errors (`invalid_package_input`)

2. npm metadata + tarball intake
   - Status: completed
   - Deliverables:
     - npm registry metadata fetch
     - tarball download
     - timeout and size-bounded intake (`10MB` tarball, `25s` timeout)

3. Safe extraction pipeline
   - Status: completed
   - Deliverables:
     - temp workspace extraction
     - traversal protection and path sanitization
     - bounded extracted file set (`MockFile[]`, max `300` files, max `300KB` per file)
     - typed extraction limit errors (`npm_extracted_files_exceeded`, `npm_extracted_file_too_large`)

4. Scan pipeline integration
   - Status: completed
   - Deliverables:
     - reuse existing engine + Semgrep + Gitleaks flow
     - source metadata mapping (`npm_registry`)
     - keep privacy-minimized metadata (no stored tarball URL)
     - `engineVersion` upgrade to `v0.2.2`

5. API and UX compatibility
   - Status: completed
   - Deliverables:
     - preserve `/api/scan` success shape
     - add typed npm failures (`invalid_package_input`, `npm_package_not_found`, `npm_tarball_too_large`, `npm_extracted_files_exceeded`, `npm_extracted_file_too_large`, `npm_fetch_failed`)
     - update scan page helper copy with npm examples

6. Test and release gate
   - Status: completed
   - Deliverables:
     - parser tests
     - registry/tarball intake tests
     - extraction safety tests
     - API typed error tests
     - regression tests for GitHub path

## 3. Milestones

1. M1 - npm command parsing ready (done)
2. M2 - registry + tarball intake ready (done)
3. M3 - shared scan pipeline integration ready (done)
4. M4 - regression and release gate pass (done)

## 4. Acceptance Gate Before "Done"

1. All criteria in approved V0.2.2 spec passed.
2. `npm test` passed.
3. GitHub and npm intake both produced valid reports.
4. Report/poster routes showed no payload compatibility regression.
