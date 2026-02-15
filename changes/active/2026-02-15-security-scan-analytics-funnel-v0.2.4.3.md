# Change Plan: Security Scan Analytics Funnel V0.2.4.3

## 0. Links

- Active spec: `specs/active/2026-02-15-security-scan-analytics-funnel-v0.2.4.3.md`
- Previous active baseline: `specs/active/2026-02-14-security-scan-viral-trust-loop-v0.2.4.2.md`

## 1. Execution Status

- Phase: Completed
- Spec status: Active
- Implementation approval: Ready for release

## 2. Action List

1. Add frontend analytics helper
   - Status: completed
   - Deliverables:
     - `track(eventName, props)` utility
     - shared event payload enrichments (`ts`, `device_id`, page context)
     - dual-write adapters (GA4 + backend `/api/analytics`)
     - GA4 adapter feature-gated by `NEXT_PUBLIC_GA4_MEASUREMENT_ID`

2. Implement `device_id` lifecycle
   - Status: completed
   - Deliverables:
     - UUID generation on first visit
     - localStorage primary persistence
     - cookie backup persistence (365d)
     - deterministic read priority

3. Add backend analytics ingestion
   - Status: completed
   - Deliverables:
     - `POST /api/analytics`
      - `analytics_events` schema/migration
      - input validation and bounded payload
     - native SQL migration script(s), no new ORM dependency

4. Implement `session_id` lifecycle
   - Status: completed
   - Deliverables:
     - per-tab/session UUID generation
     - `sessionStorage` persistence
     - event payload enrichment with nullable compatibility

5. Instrument funnel events
   - Status: completed
   - Deliverables:
     - `scan_page_view`
     - `scan_submit_clicked`
     - `scan_result`
     - `report_page_view`
     - `poster_page_view`
     - `poster_save_clicked`

6. Instrument action-specific result events
   - Status: completed
   - Deliverables:
     - `poster_download_result`
     - `poster_share_result`
     - strict success criteria per action

7. Instrument QR attribution
   - Status: completed
   - Deliverables:
     - QR links include `src=poster_qr`
     - `poster_qr_visit` first-load only
     - UV/PV-ready fields with device dedupe key

8. Standardize error code taxonomy
   - Status: completed
   - Deliverables:
     - `{domain}_{type}` convention in analytics payloads
     - domain/type whitelist for scan/poster/download/share/analytics

9. Add error/latency dimensions
   - Status: completed
   - Deliverables:
     - `error_code/error_type` on failed paths
     - `duration_ms` for scan/poster/save

10. Verification
   - Status: completed
   - Deliverables:
     - event fire tests for all funnel steps
     - QR source and first-load guard validation
     - conversion metric query examples
     - ingestion endpoint contract tests
     - error-code format validation tests
     - GA4-disabled mode validation (no Measurement ID)

## 3. Acceptance Gate Before "Done"

1. Event logs can compute:
   - Scan Start Rate
   - Share Intent Rate
   - Share Success Rate
2. Download/share success is action-specific and consistent with defined criteria.
3. QR-attributed UV/PV can be calculated from `poster_qr_visit`.
4. Error and duration dimensions are present and queryable.
5. GA4 and backend ingestion both receive events from the same `track()` call path.
6. `device_id` strategy is implemented and stable across page reloads.
7. Error codes comply with standard naming convention.

Gate result: passed (2026-02-15 local verification)
