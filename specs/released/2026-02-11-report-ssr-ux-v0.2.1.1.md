# OpenSpec Spec: Report SSR UX Patch v0.2.1.1

## 0. Meta

- Date: 2026-02-11
- Stage: Released
- Owner: Product + Engineering
- Parent proposal: `specs/proposals/2026-02-11-security-scan-real-v0.2.md`
- Parent release: `specs/released/2026-02-11-security-scan-real-v0.2.1.md`

## 1. Objective

Remove visible loading flash when navigating to `/scan/report/:id` (especially from poster page) by switching report page rendering from client-fetch to server-first rendering.

## 2. Scope

1. Convert report page to Server Component data fetch flow.
2. Keep report content and visual output equivalent with v0.2.1.
3. Keep copy-link interaction via a small client-only child component.
4. Preserve existing report/poster routes and API contracts.

## 3. Out of Scope

1. Scanner capability changes.
2. Report schema changes.
3. New security rules.
4. Poster layout redesign.

## 4. Technical Design

1. `app/scan/report/[id]/page.tsx`
   - replace `useEffect + /api/scan/:id` runtime fetch with direct server read via `getStoredReport(id)`
   - return `notFound()` when report is absent
2. `app/scan/report/[id]/report-share-actions.tsx`
   - client component for clipboard copy behavior only
3. Maintain existing `report.module.css` class usage to avoid styling regressions.

## 5. Data and Contract Notes

1. No API payload change.
2. No DB schema change.
3. No route change.
4. `engineVersion` remains unchanged (`v0.2.1`).

## 6. Acceptance Criteria

1. Entering `/scan/report/:id` with a valid existing report renders report content directly (no page-level `Loading report...` placeholder).
2. Poster -> Report navigation no longer shows the old temporary loading copy.
3. Missing report still yields clear not-found behavior.
4. Copy report link and poster navigation continue to work.

## 7. Test and Release Gate

1. `npm test` passes.
2. `npm run build` passes.
3. Manual checks:
   - create scan -> open report
   - open poster -> back to report
   - open nonexistent report id
