# Change Plan: Security Scan Viral Trust Loop V0.2.4.0 (Core Render Engine)

## 0. Links

- Master change plan: `changes/active/2026-02-14-security-scan-viral-trust-loop-v0.2.4.md`
- Slice spec: `specs/released/2026-02-14-security-scan-viral-trust-loop-v0.2.4.0.md`
- Master spec: `specs/released/2026-02-14-security-scan-viral-trust-loop-v0.2.4.md`
- Render module entry: `lib/poster/render-poster.ts`

## 1. Execution Status

- Phase: Released
- Slice: `v0.2.4.0`
- Status: completed

## 2. Tasks (Slice Only)

1. Extract option parser
   - Status: completed
   - Output: `lib/poster/render-options.ts`

2. Extract renderer core
   - Status: completed
   - Output: `lib/poster/render-poster.ts`

3. Introduce grade config file
   - Status: completed
   - Output: `config/risk-grade.config.json`

4. Enforce repository-first assets
   - Status: completed
   - Output:
     - `assets/poster/template/scan-poster.pen`
     - `assets/poster/base/base-clean-v1.jpg`

5. Add tests
   - Status: completed
   - Output:
     - options/config validation tests
      - render smoke test
      - QR decodability test

6. Runtime launch strategy wiring
   - Status: deferred to stabilization track (`v0.2.4.x`)
   - Output:
      - local path: `playwright-core` + local Chrome executable
      - vercel path: `playwright-core` + `@sparticuz/chromium`
      - environment-based launch selection and error diagnostics

## 3. Slice Acceptance Gate

1. PNG generation stable and deterministic.
2. Dynamic text/ring/color works.
3. Grade range/color uses config file.
4. QR decodes to expected report URL.
5. `npm test` and `npm run build` pass.
