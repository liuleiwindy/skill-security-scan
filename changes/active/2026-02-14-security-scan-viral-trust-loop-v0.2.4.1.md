# Change Plan: Security Scan Viral Trust Loop V0.2.4.1 (Data and API Integration)

## 0. Links

- Master change plan: `changes/active/2026-02-14-security-scan-viral-trust-loop-v0.2.4.md`
- Slice spec: `specs/active/2026-02-14-security-scan-viral-trust-loop-v0.2.4.1.md`
- Render baseline: `specs/active/2026-02-14-security-scan-viral-trust-loop-v0.2.4.0.md`

## 1. Execution Status

- Phase: Active
- Slice: `v0.2.4.1`
- Status: completed (ready_for_submit)

## 2. Tasks (Slice Only)

1. Implement poster domain mapper
   - Status: **completed** ✅
   - Output: `lib/poster/render-options.ts` (createPosterModelFromScanReport)

2. Wire poster image API
   - Status: **completed** ✅
   - Output: `app/api/scan/[id]/poster/image/route.ts`

3. Keep poster JSON endpoint backward-compatible
   - Status: **completed** ✅
   - Output: existing `poster` JSON route (no changes needed)

4. Add query allowlist and typed error mapping
   - Status: **completed** ✅
   - Output:
     - `lib/poster/query-parser.ts`
     - `lib/poster/index.ts` (exports)

5. Apply cache header policy
   - Status: **completed** ✅
   - Output:
     - success: `public, max-age=60, s-maxage=300`
     - failure: `no-store`

6. Add integration tests
   - Status: **completed** ✅
   - Output:
     - API contract tests
     - grade boundary mapping tests
     - deterministic output and QR decode integration checks

7. Runtime launch strategy hook-up
   - Status: **completed** ✅
   - Output:
     - local and Vercel launch mode selection
     - launch diagnostics on failure (render-poster.ts)

## 3. Slice Acceptance Gate

1. `GET /api/scan/:id/poster/image` returns valid PNG for real scan id. ✅
2. `GET /api/scan/:id/poster` remains backward-compatible. ✅
3. Grade/ring color resolution strictly follows `config/risk-grade.config.json`. ✅
4. Error response and cache policy match slice spec. ✅
5. Build and tests pass. ✅

## 4. Files Changed

| File | Action | Description |
|------|--------|-------------|
| `lib/poster/query-parser.ts` | created | Query parameter parser with allowlist |
| `lib/poster/index.ts` | updated | Export query-parser types/functions |
| `lib/poster/render-poster.ts` | updated | Add diagnostic logging for browser launch |
| `app/api/scan/[id]/poster/image/route.ts` | created | Poster image API endpoint |

## 5. Remaining Work

- [ ] Preview deployment smoke validation (per spec 4.7; planned in `v0.2.4.3` gate)
