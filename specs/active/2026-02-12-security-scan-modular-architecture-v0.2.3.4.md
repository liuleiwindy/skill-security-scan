# OpenSpec Spec: Modular Architecture Refactor V0.2.3.4

## 0. Meta

- Date: 2026-02-12
- Stage: Active (Implementation-ready)
- Owner: Product + Engineering
- Proposal source: `specs/proposals/2026-02-12-security-scan-modular-architecture-v0.2.3.x.md`
- Previous active baseline: `specs/active/2026-02-12-security-scan-modular-architecture-v0.2.3.3.md`
- Scope note: non-functional refactor + additive observability (no breaking API change)

## 1. Objective

Complete the `v0.2.3.x` modularization line by extracting PI execution wiring into `pi-pipeline.ts`, adding scanner-level runtime metadata into `scanMeta.scanners`, and unifying scanner error mapping into a stable domain.

## 2. Scope

1. Create `lib/scan/pi-pipeline.ts`
2. Move prompt-injection external detector registration/execution wiring from `engine.ts` into PI pipeline helper
3. Integrate PI pipeline into `pipeline.ts` orchestration path (without changing user-facing flow)
4. Add additive report metadata field: `scanMeta.scanners`
5. Introduce scanner error domain mapping for semgrep/gitleaks/pi external execution paths
6. Keep existing report core fields and route contracts backward-compatible

## 3. Out of Scope

1. no new detector capability beyond current PI baseline
2. no scoring model redesign
3. no report page/poster UX redesign
4. no route changes (`POST /api/scan`, `GET /api/scan/:id`, `GET /api/scan/:id/poster`)

## 4. Design Constraints

1. Backward compatibility:
   - existing API response fields remain available and unchanged in meaning
   - `scanMeta.scanners` is additive and optional
2. Non-blocking semantics must remain:
   - one scanner failure does not abort the full scan
   - all external scanners failure still returns report from internal scan path
3. Scanner metadata must be stable and implementation-agnostic:
   - avoid leaking provider-specific internal stack traces in public payload
4. Runtime dependency injection hooks used by tests must remain usable from `store.ts`

## 5. Target Module Responsibilities

### 5.1 `lib/scan/pi-pipeline.ts`

Responsibilities:

1. register/configure external PI detector(s)
2. run PI external detection with fallback handling policy
3. normalize PI execution output into pipeline-consumable structure
4. expose a narrow helper API for `pipeline.ts`

Required API (must):

1. `runExternalPIDetection(content, filePath, options?)`
2. return normalized result with method/status/error-domain fields

Type example (normative):

```ts
export type ScannerErrorCode =
  | "scanner_not_available"
  | "scanner_timeout"
  | "scanner_exec_failed"
  | "scanner_invalid_output"
  | "scanner_network_error";

export type PIExecutionStatus = "ok" | "failed" | "fallback" | "skipped";

export interface PIExecutionResult {
  status: PIExecutionStatus;
  method: "external" | "local";
  findings: number;
  errorCode?: ScannerErrorCode;
  message?: string;
}

export function runExternalPIDetection(
  content: string,
  filePath: string,
  options?: { fallbackToLocal?: boolean },
): Promise<PIExecutionResult>;
```

### 5.2 `lib/scan/pipeline.ts`

Responsibilities (incremental to `v0.2.3.3`):

1. consume PI pipeline helper instead of directly depending on PI registration details
2. collect scanner execution statuses from:
   - `semgrep`
   - `gitleaks`
   - `pi-external` (and fallback/local PI path when applicable)
3. populate `scanMeta.scanners` on final report (additive)
4. map raw scanner/tool errors into unified domain error codes

### 5.3 `lib/store.ts`

Responsibilities unchanged:

1. keep thin facade (`intake -> pipeline -> repository`)
2. preserve exported signatures:
   - `createAndStoreReport(repoUrl)`
   - `getStoredReport(id)`
   - `__setScanRuntimeDepsForTest`
   - `__resetScanRuntimeDepsForTest`

## 6. `scanMeta.scanners` Contract (Additive)

Add optional array field under `scanMeta`:

1. `name`: `"semgrep" | "gitleaks" | "pi-external" | "pi-local"`
2. `status`: `"ok" | "failed" | "skipped" | "fallback"`
3. `findings`: `number`
4. `errorCode?`: stable domain code (see section 7)
5. `message?`: short sanitized diagnostic text (optional)

Notes:

1. missing field in older reports remains valid
2. clients must treat unknown scanner names/status as forward-compatible values

## 7. Scanner Error Domain Mapping

Introduce internal/public-safe error domain codes (additive):

1. `scanner_not_available`
2. `scanner_timeout`
3. `scanner_exec_failed`
4. `scanner_invalid_output`
5. `scanner_network_error`

Mapping rules:

1. adapter/tool/provider raw errors map into one of the codes above
2. route-level error behavior remains unchanged for non-scanner fatal paths
3. scanner-level failures are reflected in `scanMeta.scanners[*]` and do not force request failure by default

Example mapping rules (implementation guide):

1. Tool binary missing (`ENOENT`) -> `scanner_not_available`
2. Child process timeout / abort -> `scanner_timeout`
3. Process exits non-zero without parseable payload -> `scanner_exec_failed`
4. JSON parse failure / malformed structured output -> `scanner_invalid_output`
5. Provider/API network failure (`AbortError`, DNS, connection reset) -> `scanner_network_error`

## 8. Acceptance Criteria

1. `npm test` and `npm run build` pass
2. Existing API tests remain green without contract regressions
3. `scanMeta.scanners` appears on new reports with valid entries for scanner execution states
4. PI execution wiring is moved behind `pi-pipeline.ts` (no direct detector-registration logic left in `engine.ts`)
5. All scanner failure modes in test scope map to defined domain codes

## 9. Validation Plan

1. Unit tests
   - `pi-pipeline` happy path
   - `pi-pipeline` external failure + fallback path
   - scanner error mapping table tests
2. Pipeline tests
   - scanner status aggregation for semgrep/gitleaks/pi
   - one scanner failure non-blocking
   - all external scanners failure non-blocking
3. API regression tests
   - existing route behavior unchanged
   - optional `scanMeta.scanners` field presence on new reports
4. Integration scenario
   - simulate real external failure chain (`semgrep` unavailable + PI external network failure)
   - verify API still returns report
   - verify `scanMeta.scanners` contains mapped `errorCode` and fallback/non-blocking statuses

## 10. Release Gate

All below must pass before marking released:

1. tests green
2. build green
3. additive-only schema change confirmed (`scanMeta.scanners` optional)
4. `v0.2.3.x` planned modules fully present:
   - `scan-policy.ts`
   - `report-repository.ts`
   - `intake.ts`
   - `external-scanners.ts`
   - `pipeline.ts`
   - `pi-pipeline.ts`
