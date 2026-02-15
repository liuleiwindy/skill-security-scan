# Change Plan: Security Scan Viral Trust Loop V0.2.4.2 (Poster Page + Save Flow)

## 0. Links

- Master change plan: `changes/active/2026-02-14-security-scan-viral-trust-loop-v0.2.4.md`
- Slice spec: `specs/released/2026-02-14-security-scan-viral-trust-loop-v0.2.4.2.md`
- API baseline: `specs/released/2026-02-14-security-scan-viral-trust-loop-v0.2.4.1.md`

## 1. Execution Status

- Phase: Released
- Slice: `v0.2.4.2`
- Status: completed
- Seal date: 2026-02-15

## 2. Tasks (Slice Only)

1. Integrate poster image endpoint into poster page
   - Status: completed
   - Output: updates under `app/scan/poster/[id]/`

2. Implement mobile-first save behavior
   - Status: completed
   - Output:
     - Web Share API branch
     - long-press fallback guidance
     - desktop blob download fallback

3. Add placeholder-first loading
   - Status: completed
   - Output:
     - static or server-generated low-quality placeholder
     - image swap logic after full poster load

4. Lock QR/report handoff behavior
   - Status: completed
   - Output:
     - poster QR target fixed to `/scan/report/[id]`
     - page-level links remain consistent

5. Add tests for page/save integration
   - Status: completed
   - Output:
     - poster page integration tests
     - save behavior tests (mobile/desktop paths)
     - error handling tests (`404/5xx/timeout`)
     - fixture-based regression checks for defined scan IDs

6. Add performance validation for poster page
   - Status: deferred_to_v0.2.4.3
   - Output:
     - preview performance check script/report
     - metrics: image load, FCP, placeholder first paint window
     - threshold evaluation against spec 4.6 budgets

## 3. Patch Notes (Post-acceptance Fixes Included)

1. Vercel runtime stability fixes
   - embedded poster fonts moved into repo assets and loaded without runtime `node_modules` dependency.
   - Chromium launch on Vercel aligned to `@sparticuz/chromium` runtime args and sandbox flags.
2. Poster image loading reliability fixes
   - soft-timeout strategy updated to avoid aborting in-flight request.
   - timeout threshold raised from `8s` to `20s` to reduce false failures in serverless cold-start scenarios.
3. Save flow reliability fixes
   - mobile webviews without file-share capability now enter fallback guidance instead of hard fail.
   - WeChat save path upgraded to preview-image first, with bridge fallback.
   - WeChat poster display path uses network image URL (not `blob:` URL) to preserve long-press save success.

## 3. Slice Acceptance Gate

1. `/scan/poster/[id]` renders API-generated poster image with placeholder-first experience.
2. Save flow works on mobile-first path with desktop fallback.
3. QR target remains `/scan/report/[id]` for all poster cases.
4. Performance budgets pass in preview validation run (deferred to v0.2.4.3 env validation).
5. Build and target test suite pass for this slice.
