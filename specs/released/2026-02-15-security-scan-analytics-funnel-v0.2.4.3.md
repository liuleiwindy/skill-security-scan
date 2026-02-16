# OpenSpec Released Spec: Security Scan Analytics Funnel V0.2.4.3

## 0. Meta

- Date: 2026-02-15
- Stage: Released
- Owner: Product + Engineering
- Previous active baseline: `specs/active/2026-02-14-security-scan-viral-trust-loop-v0.2.4.2.md`

## 1. Objective

Build a minimal, reliable analytics foundation for viral growth optimization in a no-login product.

This version focuses on tracking core user behavior funnel, key conversion rates, basic error/latency health metrics, and QR-attributed visits.

## 2. Scope

1. Define and implement the core monitoring funnel.
2. Define and implement conversion metrics for scan/share behavior.
3. Define success criteria separately for download/share actions.
4. Track QR-attributed report visits via URL source parameter.
5. Support UV/PV dedupe in no-login context using local anonymous device identity.

## 3. Out of Scope

1. Full attribution modeling across multiple channels.
2. Cross-device user identity unification.
3. Real-time dashboard infrastructure.
4. Login/account system integration.

## 4. Technical Decisions

This version explicitly resolves the following 4 implementation questions.

### 4.1 Analytics Stack Selection

1. Use dual-write strategy:
   - GA4 for fast visualization and product/ops dashboards
   - self-hosted event ingestion (`/api/analytics`) for raw event retention and flexible attribution by `scan_id/src/device_id`
2. Frontend business code must call a single `track()` abstraction.
3. `track()` dispatches to:
   - GA4 transport
   - backend ingestion endpoint
4. GA4 configuration for current stage:
   - `NEXT_PUBLIC_GA4_MEASUREMENT_ID` is currently not configured
   - backend ingestion remains mandatory and always enabled
   - GA4 transport is feature-gated and no-op when Measurement ID is missing

### 4.2 `device_id` Strategy (No Login)

1. Generate `device_id` client-side via `crypto.randomUUID()` on first visit.
2. Persistence:
   - primary: `localStorage`
   - backup: cookie (365 days)
3. Read priority:
   - `localStorage` -> cookie -> generate new
4. `device_id` is anonymous and must not be treated as person identity.

### 4.3 Backend Event Model

Backend ingestion/storage is required in V0.2.4.3.

1. Endpoint:
   - `POST /api/analytics`
2. Minimal table:
   - `analytics_events`
3. Suggested columns:
   - `id` (uuid)
   - `event_name` (text)
   - `scan_id` (text, nullable)
   - `device_id` (text)
   - `session_id` (text, nullable)
   - `src` (text, nullable)
   - `status` (text, nullable)
   - `error_code` (text, nullable)
   - `duration_ms` (int, nullable)
   - `props` (jsonb)
   - `created_at` (timestamptz default now)
4. Migration strategy:
   - use native SQL migration files (no Prisma/Drizzle introduction in this version)
   - align with existing `@vercel/postgres` + SQL repository pattern

### 4.5 `session_id` Strategy

1. `session_id` is implemented as anonymous session scope identifier.
2. Generation:
   - create UUID on first event in current browser tab/session
3. Persistence:
   - `sessionStorage` (tab/session scoped)
4. Event payload:
   - include `session_id` when available
   - backend column remains nullable for backward compatibility and partial data tolerance

### 4.6 Privacy Policy Handling in V0.2.4.3

1. Per product decision, legal policy document update is out of scope for this version.
2. Engineering must still follow data-minimization constraints in this spec (anonymous IDs, no raw PII fields).

### 4.4 Error Code Standard

1. Format:
   - lower snake case: `{domain}_{type}`
2. Domain set (initial):
   - `scan_*`
   - `poster_*`
   - `download_*`
   - `share_*`
   - `analytics_*`
3. Type set (initial):
   - `timeout`
   - `network`
   - `http_4xx`
   - `http_5xx`
   - `validation`
   - `not_supported`
   - `aborted`
   - `unknown`
4. Examples:
   - `scan_timeout`
   - `poster_http_5xx`
   - `download_aborted`
   - `share_not_supported`
   - `analytics_network`

## 5. Technical Architecture

Design goal: maximize reuse, keep business instrumentation thin, and make transports swappable.

### 5.1 Frontend Tracking Core

1. Single business entrypoint:
   - `lib/analytics/track.ts`
2. Shared context enricher:
   - `lib/analytics/context.ts`
   - enriches `ts`, `device_id`, `session_id`, page context, and `src`
3. Transport adapters (dual-write):
   - `lib/analytics/sinks/ga4.ts`
   - `lib/analytics/sinks/backend.ts`
4. Business pages/components must call `track()` only and must not directly call GA SDK or analytics API.

### 5.2 Frontend Trigger Placement

1. Trigger points remain inside existing pages/components:
   - scan page
   - report page
   - poster page and save/share actions
2. Trigger code should be minimal and delegate payload normalization to analytics core.

### 5.3 Backend Ingestion

1. API route:
   - `app/api/analytics/route.ts`
2. Validation module:
   - `lib/analytics/validation.ts`
   - event whitelist, required field checks, error code format checks
3. Persistence module:
   - `lib/analytics/repository.ts`
   - centralized write path to `analytics_events`

### 5.4 Data Layer

1. Single event table for V0.2.4.3:
   - `analytics_events`
2. Required indexes (minimum):
   - `(event_name, created_at)`
   - `(scan_id, created_at)`
   - `(device_id, created_at)`
3. Aggregated/materialized tables are out of scope for this version.

## 6. Module Boundaries and Ownership

1. Business UI layer:
   - owns only event trigger timing
   - does not own transport or schema rules
2. Analytics core layer:
   - owns event contract mapping, context enrichment, and fan-out
3. Transport layer:
   - owns provider-specific delivery details (GA4 vs backend)
4. Backend ingestion layer:
   - owns validation, persistence, and query compatibility
5. Event taxonomy authority:
   - centralized in analytics modules/spec, not distributed across pages

## 7. Core Monitoring Funnel

Funnel steps (strict order):

1. Enter scan page
2. Trigger scan
3. Scan success and reach report page
4. Enter poster page
5. Click save/share
6. Save/share success

## 8. Key Conversion Metrics

1. `Scan Start Rate`
   - definition: scan page visit -> scan submit
2. `Share Intent Rate`
   - definition: report page visit -> save/share click
3. `Share Success Rate`
   - definition: save/share click -> save/share success

## 9. Health Metrics

1. Error and failure clustering
   - grouped by `error_code` / `error_type`
2. Latency tracking
   - scan duration
   - poster load duration
   - save duration

## 10. Event Contract

## 10.1 Funnel Events

1. `scan_page_view`
   - trigger: scan page first render
   - required fields: `ts`

2. `scan_submit_clicked`
   - trigger: user clicks submit/start scan
   - required fields: `input_type`, `ts`
   - `input_type`: `github_url | npm_command | unknown`

3. `scan_result`
   - trigger: scan API returns
   - required fields: `status`, `duration_ms`, `ts`
   - optional fields: `scan_id`, `error_code`
   - `status`: `success | error`

4. `report_page_view`
   - trigger: report page first render
   - required fields: `scan_id`, `ts`

5. `poster_page_view`
   - trigger: poster page first render
   - required fields: `scan_id`, `ts`

6. `poster_save_clicked`
   - trigger: click save/share action
   - required fields: `scan_id`, `method`, `ts`
   - `method`: `download | share`

## 10.2 Success Result Events (Action-Specific)

1. `poster_download_result`
   - success definition:
     - browser download flow has been triggered
     - poster blob obtained and download action executed
     - `downloadPoster*` promise resolved without exception
   - required fields: `scan_id`, `status`, `duration_ms`, `ts`
   - optional fields: `error_type`
   - `status`: `success | error`

2. `poster_share_result`
   - success definition:
     - `navigator.share(...)` resolves
   - required fields: `scan_id`, `status`, `duration_ms`, `ts`
   - optional fields: `error_type`
   - `status`: `success | error`
   - note: external platform publish completion is not observable on frontend and must not be counted here

## 11. QR Attribution (Minimal)

1. QR URL format
   - `/scan/report/{id}?src=poster_qr`

2. Event
   - event name: `poster_qr_visit`
   - trigger condition: `src=poster_qr` and first page load only
   - required fields: `scan_id`, `src`, `ua_basic`, `ts`

3. Dedupe metrics
   - UV: dedupe by `device_id` (cookie or localStorage)
   - PV: no dedupe

## 12. Identity and Privacy

1. No login requirement.
2. Anonymous `device_id` generated client-side and persisted locally.
3. Do not claim person-level identity.
4. Avoid storing raw PII in event payload.

## 13. Compatibility

1. No breaking API contract changes for existing scan/report/poster paths.
2. Analytics events are additive only.

## 14. Acceptance Criteria

1. All funnel steps can be observed via events.
2. Three conversion metrics can be computed directly from event logs.
3. `poster_download_result` and `poster_share_result` use separate success definitions.
4. `poster_qr_visit` is emitted only for `src=poster_qr` first load.
5. UV/PV for QR visits can be computed with defined dedupe rule.
6. Error and latency dimensions are present for scan/poster/save key paths.
7. Dual-write path (GA4 + backend ingestion) can be toggled without changing business event call sites.
8. `device_id` generation and persistence follow the defined strategy.
9. Backend table and endpoint are available for analytics ingestion.
10. Error codes conform to the defined naming standard.

## 15. Post-Release Fixes

### 15.1 2026-02-16 Analytics Insert UUID Fallback Fix

Issue:
- Some accepted events were not persisted.
- Runtime error: `null value in column "id" of relation "analytics_events" violates not-null constraint`.

Root cause:
- Repository insert path explicitly passed `id = NULL`, which bypassed PostgreSQL default value generation (`uuid_generate_v4()`).

Fix:
- In `lib/analytics/repository.ts`, split insert logic:
  - when `event.id` exists: insert with explicit `id`.
  - when `event.id` is absent: omit `id` column so DB default UUID is applied.

Verification:
- Local `/api/analytics` request accepted and persisted with auto-generated UUID IDs.
- Manual SQL insert and query checks confirm `analytics_events` write path is healthy.
