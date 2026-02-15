# Analytics API

## Overview

The Analytics API endpoint accepts analytics events from the frontend with a partial acceptance strategy. Invalid events are rejected silently (logged server-side), while valid events are accepted and stored asynchronously.

**Endpoint**: `POST /api/analytics`

## Request Format

### Headers

- `Content-Type`: `application/json` (required)
- `x-device-id`: Device identifier (required)
- `x-session-id`: Session identifier (optional)

### Body

Array of analytics events (1-50 events, max 1MB total payload).

```json
[
  {
    "event_name": "scan_page_view",
    "ts": 1678901234567
  },
  {
    "event_name": "scan_submit_clicked",
    "input_type": "url",
    "ts": 1678901234567
  }
]
```

## Response Format

### Success Response (202 Accepted)

```json
{
  "accepted": 2,
  "rejected": 0
}
```

### Error Responses

- **400 Bad Request**: Invalid JSON, payload structure, or batch size
  ```json
  { "error": "Invalid JSON format" }
  ```
- **413 Payload Too Large**: Request body exceeds 1MB
  ```json
  { "error": "Payload too large" }
  ```
- **500 Internal Server Error**: Unexpected server error
  ```json
  { "error": "Internal server error" }
  ```

## Supported Event Types

All events must include:
- `event_name`: Must be one of the whitelisted event names
- `ts`: Timestamp in milliseconds (Unix epoch)

### Available Events

| Event Name | Required Fields |
|-----------|-----------------|
| `scan_page_view` | ts |
| `scan_submit_clicked` | input_type, ts |
| `scan_result` | status, duration_ms, ts |
| `report_page_view` | scan_id, ts |
| `poster_page_view` | scan_id, ts |
| `poster_save_clicked` | scan_id, method, ts |
| `poster_download_result` | scan_id, status, duration_ms, ts |
| `poster_share_result` | scan_id, status, duration_ms, ts |
| `poster_qr_visit` | scan_id, src, ua_basic, ts |

### Event Fields Reference

| Field | Type | Description |
|-------|------|-------------|
| `event_name` | string | The name of the event (must be whitelisted) |
| `ts` | number | Timestamp in milliseconds |
| `scan_id` | string | Unique identifier for a scan |
| `status` | enum | "success", "error", or "cancelled" |
| `duration_ms` | number | Duration in milliseconds |
| `input_type` | enum | "url", "npm", or "file" |
| `method` | enum | "wechat" or "image" |
| `src` | string | Source of the visit |
| `ua_basic` | string | Basic user agent information |
| `error_code` | string | Error code in format `{domain}_{type}` |
| `error_message` | string | Error message |
| `error_details` | object | Additional error details |

### Error Code Format

Error codes must follow the format `{domain}_{type}` where:

**Allowed Domains**: `scan`, `poster`, `download`, `share`, `analytics`

**Allowed Types**: `timeout`, `network`, `http_4xx`, `http_5xx`, `validation`, `not_supported`, `aborted`, `unknown`

Examples:
- `scan_timeout`
- `download_http_5xx`
- `share_validation`

## Usage Examples

### Example 1: Scan Page View

```bash
curl -X POST https://example.com/api/analytics \
  -H "Content-Type: application/json" \
  -H "x-device-id: device_abc123" \
  -d '[
    {
      "event_name": "scan_page_view",
      "ts": 1678901234567
    }
  ]'
```

### Example 2: Scan Submission and Result

```bash
curl -X POST https://example.com/api/analytics \
  -H "Content-Type: application/json" \
  -H "x-device-id: device_abc123" \
  -H "x-session-id: session_xyz789" \
  -d '[
    {
      "event_name": "scan_submit_clicked",
      "input_type": "url",
      "ts": 1678901234567
    },
    {
      "event_name": "scan_result",
      "status": "success",
      "duration_ms": 5234,
      "ts": 1678901240000
    }
  ]'
```

### Example 3: Poster Download with Error

```bash
curl -X POST https://example.com/api/analytics \
  -H "Content-Type: application/json" \
  -H "x-device-id: device_abc123" \
  -d '[
    {
      "event_name": "poster_download_result",
      "scan_id": "scan_def456",
      "status": "error",
      "duration_ms": 3200,
      "error_code": "download_timeout",
      "error_message": "Download timed out after 3.2 seconds",
      "ts": 1678901245000
    }
  ]'
```

## Implementation Details

### Partial Acceptance Strategy

The API uses a partial acceptance strategy:
1. Validate all events in the batch
2. Accept all valid events (insert into database asynchronously)
3. Reject all invalid events (log server-side, return count in response)
4. Return 202 Accepted immediately with accepted/rejected counts

This ensures that:
- Valid events are always processed, even if some events in the batch are invalid
- Clients can track delivery success/failure
- Server-side logs contain detailed validation errors for debugging
- Response is fast (202 Accepted, async processing)

### Async Processing

The API returns 202 Accepted immediately without waiting for database insertion. This:
- Reduces client-side latency
- Improves throughput
- Handles database errors gracefully (logged server-side)

### Validation Rules

1. **Event Name Whitelist**: Only whitelisted event names are accepted
2. **Error Code Format**: Must follow `{domain}_{type}` format
3. **Required Fields**: Each event type has specific required fields
4. **Batch Size**: 1-50 events per request
5. **Payload Size**: Maximum 1MB per request

### Security Considerations

- **No Authentication**: Events are anonymous (no auth required)
- **Rate Limiting**: Recommended 10 requests/second per IP (not enforced by default)
- **DoS Protection**: Payload size validation (max 1MB), batch size limits
- **Error Sanitization**: Generic error messages (no internal details leaked)
- **Logging**: All rejected events are logged server-side for debugging

### Error Handling

- Validation errors are logged server-side but not exposed to clients
- Database errors are caught and logged (graceful degradation)
- Unexpected errors return 500 with generic message
- Invalid events in a batch don't prevent valid events from being accepted

## Testing

Run the test suite:

```bash
npm test tests/analytics-api.test.ts
```

## Files

- **API Route**: `app/api/analytics/route.ts`
- **Tests**: `tests/analytics-api.test.ts`
- **Validation**: `lib/analytics/validation.ts`
- **Repository**: `lib/analytics/repository.ts`
