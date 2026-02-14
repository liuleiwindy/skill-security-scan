# Change Plan: Security Scan Viral Trust Loop V0.2.4 (Master)

## 0. Links

- Proposal: `specs/proposals/2026-02-13-security-scan-viral-trust-loop-v0.2.4.md`
- Active spec: `specs/active/2026-02-14-security-scan-viral-trust-loop-v0.2.4.md`
- Implementation playbook: `docs/v0.2.4-poster-dynamic-rendering-playbook.md`
- Baseline: `specs/released/2026-02-13-security-scan-abuse-fallback-controls-v0.2.3.5.md`

## 1. Execution Status

- Phase: Active
- Version line: `v0.2.4` (master)
- Current slice: `v0.2.4.2`
- Implementation approval: `v0.2.4.1` ready_for_submit

## 2. Milestones by Slice

1. `M1 / v0.2.4.0` - Core render engine
   - Status: completed
   - Deliverables:
     - reusable renderer modules in `lib/poster/`
     - template semantic alignment (`progress-*`)
     - deterministic rendering smoke tests
     - file-driven risk-grade config (`config/risk-grade.config.json`)

2. `M2 / v0.2.4.1` - Data and API integration
   - Status: completed (ready_for_submit)
   - Deliverables:
     - report -> poster domain mapping
     - `GET /api/scan/:id/poster/image`
     - backward compatibility of `GET /api/scan/:id/poster`

3. `M3 / v0.2.4.2` - Poster page and save flow
   - Status: in_progress
   - Deliverables:
     - `/scan/poster/[id]` image endpoint integration
     - no query override preview behavior on poster page
     - mobile-first save button + fallback
     - placeholder-first loading experience
     - poster-page share target + QR-to-report handoff
     - e2e path validation

4. `M4 / v0.2.4.3` - Stabilization and release gate
   - Status: pending
   - Deliverables:
     - strict parameter validation and error mapping
     - visual regression sample matrix
     - build/test/perf release checks
     - production stability gate (memory/error-rate/rollback criteria)
     - cross-environment visual consistency gate (same-runner hash equality + cross-runner pixel diff threshold)

5. `M5 / v0.2.4.4` - Telemetry and analytics integration
   - Status: pending
   - Deliverables:
     - poster page telemetry events
     - telemetry ingestion + Postgres persistence
     - telemetry data quality checks and baseline reporting

## 3. Execution Tasks

1. Build `RenderOptions` schema and parser
   - Status: in_progress
   - Output: `lib/poster/render-options.ts`

2. Move script POC into render core module
   - Status: completed
   - Output: `lib/poster/render-poster.ts`
   - POC source: `scripts/render-pen-poster-poc.ts`

3. Add poster domain mapper
   - Status: pending
   - Output: `lib/poster/poster-domain.ts`

4. Add poster image API route
   - Status: completed
   - Output: `app/api/scan/[id]/poster/image/route.ts`

5. Integrate poster page image + save CTA
   - Status: in_progress
   - Output: updates under `app/scan/poster/[id]/`

6. Add tests and regression assets
   - Status: completed (`v0.2.4.1` scope)
   - Output:
     - parser tests
     - risk-grade config validation tests
     - API route tests
     - renderer smoke tests
     - QR decodability tests
     - sample output set for review

7. Poster base asset governance
   - Status: pending
   - Output:
     - template file committed under `assets/poster/template/scan-poster.pen`
     - versioned base assets under `assets/poster/base/`
     - risk-grade config committed under `config/risk-grade.config.json`
     - template-to-base mapping checklist for release

8. Runtime dependency alignment
   - Status: pending
   - Output:
     - add/verify `playwright` runtime dependency
     - verify `qrcode` and font packages available in production build
     - document Chromium runtime requirement for deployment environment

9. Preview smoke validation (minimum deployment check for `v0.2.4.1`)
   - Status: pending
   - Output:
     - preview environment smoke script for poster image endpoint
     - response/content-type/dimension/QR decode assertions

10. Cross-environment regression gate design (`v0.2.4.3`)
   - Status: pending
   - Output:
     - define same-runner strict hash check and cross-environment pixel-diff threshold policy
     - baseline split by runtime target (local, vercel-preview) if needed

## 4. Acceptance Gate Before Done

1. Poster PNG endpoint works for existing scan IDs.
2. All required dynamic fields and color options are effective.
3. Poster page includes functional save-to-local button.
4. Scan -> report -> poster chain is fully connected.
5. No breaking changes on existing poster/report APIs.
6. Grade range/color mapping is sourced from config file instead of env.
7. QR in generated poster is scannable to the expected report URL.
8. `npm test` and `npm run build` pass.
9. Telemetry integration is delivered in `v0.2.4.4` without blocking poster UX ship.
