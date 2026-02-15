# Analytics Repository Integration Guide

## Quick Start

### 1. Import the Repository

```typescript
import {
  insertAnalyticsEvent,
  insertAnalyticsEvents
} from '@/lib/analytics/repository';

import type { AnalyticsEvent } from '@/lib/analytics/repository';
```

### 2. Configure Database

Ensure `POSTGRES_URL` or `DATABASE_URL` is set in your environment:

```bash
# .env.local
POSTGRES_URL=postgresql://user:password@host:port/database
# or
DATABASE_URL=postgresql://user:password@host:port/database
```

### 3. Track an Event

```typescript
// Simple page view tracking
await insertAnalyticsEvent({
  event_name: 'scan_page_view',
  device_id: getDeviceId(),
  ts: Date.now()
});

// Track scan completion
await insertAnalyticsEvent({
  event_name: 'scan_result',
  device_id: getDeviceId(),
  scan_id: 'scan-123',
  status: 'success',
  duration_ms: 5432,
  ts: Date.now()
});
```

---

## Common Patterns

### Track User Journey

```typescript
// Track complete scan journey
const deviceId = generateDeviceId();
const scanId = 'scan-' + crypto.randomUUID();

// 1. Page view
await insertAnalyticsEvent({
  event_name: 'scan_page_view',
  device_id: deviceId,
  ts: Date.now()
});

// 2. Submit scan
await insertAnalyticsEvent({
  event_name: 'scan_submit_clicked',
  device_id: deviceId,
  input_type: 'url',
  ts: Date.now()
});

// 3. Scan result
await insertAnalyticsEvent({
  event_name: 'scan_result',
  device_id: deviceId,
  scan_id,
  status: 'success',
  duration_ms: 5432,
  ts: Date.now()
});
```

### Batch Events for Performance

```typescript
// Collect multiple events and insert in one transaction
const events = [
  {
    event_name: 'scan_page_view',
    device_id: 'device-1',
    ts: Date.now()
  },
  {
    event_name: 'scan_submit_clicked',
    device_id: 'device-1',
    input_type: 'url',
    ts: Date.now()
  },
  {
    event_name: 'scan_result',
    device_id: 'device-1',
    scan_id: 'scan-123',
    status: 'success',
    duration_ms: 5432,
    ts: Date.now()
  }
];

await insertAnalyticsEvents(events);
```

### Handle Errors

```typescript
// The repository handles errors gracefully - no try/catch needed
await insertAnalyticsEvent({
  event_name: 'scan_page_view',
  device_id: getDeviceId(),
  ts: Date.now()
});

// Events are validated before insertion
// Invalid events are logged and skipped
// Database errors are logged and don't crash your app
```

---

## Event Types

### Page View Events

```typescript
// Scan page
await insertAnalyticsEvent({
  event_name: 'scan_page_view',
  device_id: deviceId,
  ts: Date.now()
});

// Report page
await insertAnalyticsEvent({
  event_name: 'report_page_view',
  device_id: deviceId,
  scan_id: 'scan-123',
  ts: Date.now()
});

// Poster page
await insertAnalyticsEvent({
  event_name: 'poster_page_view',
  device_id: deviceId,
  scan_id: 'scan-123',
  ts: Date.now()
});
```

### Scan Events

```typescript
// Submit scan
await insertAnalyticsEvent({
  event_name: 'scan_submit_clicked',
  device_id: deviceId,
  input_type: 'url', // or 'npm' or 'file'
  ts: Date.now()
});

// Scan result
await insertAnalyticsEvent({
  event_name: 'scan_result',
  device_id: deviceId,
  scan_id: 'scan-123',
  status: 'success', // or 'error', 'cancelled'
  duration_ms: 5432,
  ts: Date.now()
});
```

### Poster Events

```typescript
// Save poster
await insertAnalyticsEvent({
  event_name: 'poster_save_clicked',
  device_id: deviceId,
  scan_id: 'scan-123',
  method: 'wechat', // or 'image'
  ts: Date.now()
});

// Download result
await insertAnalyticsEvent({
  event_name: 'poster_download_result',
  device_id: deviceId,
  scan_id: 'scan-123',
  status: 'success',
  duration_ms: 2345,
  ts: Date.now(),
  error_code: 'download_http_5xx', // optional, if status is 'error'
  error_message: 'Server error 500', // optional
  error_details: { url: 'https://...' } // optional
});

// Share result
await insertAnalyticsEvent({
  event_name: 'poster_share_result',
  device_id: deviceId,
  scan_id: 'scan-123',
  status: 'success',
  duration_ms: 1234,
  ts: Date.now()
});

// QR code visit
await insertAnalyticsEvent({
  event_name: 'poster_qr_visit',
  device_id: deviceId,
  scan_id: 'scan-123',
  src: 'https://example.com/qr',
  ua_basic: 'Mozilla/5.0...',
  ts: Date.now()
});
```

---

## Advanced Usage

### Custom Properties

```typescript
await insertAnalyticsEvent({
  event_name: 'scan_result',
  device_id: deviceId,
  scan_id: 'scan-123',
  status: 'success',
  duration_ms: 5432,
  ts: Date.now(),
  props: {
    customField1: 'value1',
    customField2: 42,
    nested: {
      key: 'value'
    }
  }
});
```

### Session Tracking

```typescript
// Generate session ID per browser tab
const sessionId = crypto.randomUUID();

// Track all events with session
await insertAnalyticsEvents([
  {
    event_name: 'scan_page_view',
    device_id: deviceId,
    session_id: sessionId,
    ts: Date.now()
  },
  {
    event_name: 'scan_submit_clicked',
    device_id: deviceId,
    session_id: sessionId,
    input_type: 'url',
    ts: Date.now()
  }
]);
```

### Source Attribution

```typescript
// Track traffic sources
await insertAnalyticsEvent({
  event_name: 'poster_qr_visit',
  device_id: deviceId,
  scan_id: 'scan-123',
  src: 'poster_qr', // or any custom source
  ua_basic: getUserAgentBasic(),
  ts: Date.now()
});
```

---

## Helper Functions

### Generate Device ID

```typescript
function getDeviceId(): string {
  // Use localStorage to persist device ID
  if (typeof window === 'undefined') {
    return 'server-' + crypto.randomUUID();
  }

  let deviceId = localStorage.getItem('device_id');
  if (!deviceId) {
    deviceId = 'device-' + crypto.randomUUID();
    localStorage.setItem('device_id', deviceId);
  }
  return deviceId;
}
```

### Generate Session ID

```typescript
function getSessionId(): string {
  if (typeof window === 'undefined') {
    return 'server-' + crypto.randomUUID();
  }

  // Session is per-tab, stored in sessionStorage
  let sessionId = sessionStorage.getItem('session_id');
  if (!sessionId) {
    sessionId = 'session-' + crypto.randomUUID();
    sessionStorage.setItem('session_id', sessionId);
  }
  return sessionId;
}
```

### Basic User Agent

```typescript
function getUserAgentBasic(): string {
  if (typeof window === 'undefined') {
    return 'server';
  }

  const ua = navigator.userAgent;
  // Simplified UA for analytics
  if (ua.includes('iPhone')) return 'ios-iphone';
  if (ua.includes('iPad')) return 'ios-ipad';
  if (ua.includes('Android')) return 'android';
  if (ua.includes('Mac')) return 'macos';
  if (ua.includes('Windows')) return 'windows';
  if (ua.includes('Linux')) return 'linux';
  return 'other';
}
```

---

## Environment Configuration

### Development

```bash
# .env.local
POSTGRES_URL=postgresql://dev:devpass@localhost:5432/dev_db
```

### Production (Vercel)

```bash
# Set in Vercel Environment Variables
POSTGRES_URL=postgres://user:pass@host:port/db?sslmode=require
```

### No Database

If Postgres is not configured, the repository will:
- Log warnings for each insert attempt
- Silently skip database operations
- Not throw exceptions (graceful degradation)

---

## Error Handling

The repository handles all errors internally:

```typescript
// No need for try-catch
await insertAnalyticsEvent(event); // Won't throw

// Validation failures are logged
// Database errors are logged
// Missing database is logged

// All errors are graceful - your app continues
```

To monitor errors:

```typescript
// All repository logs are prefixed with [analytics-repository]
// Example logs:
// [analytics-repository] Postgres not configured, skipping insert
// [analytics-repository] Invalid error code: invalid_code
// [analytics-repository] Event validation failed: [...]
// [analytics-repository] Failed to insert analytics event: [...]
// [analytics-repository] Successfully inserted 5 events
```

---

## Performance Considerations

### Batch When Possible

```typescript
// ❌ Multiple individual inserts
for (const event of events) {
  await insertAnalyticsEvent(event); // Slow - multiple DB roundtrips
}

// ✅ Single batch insert
await insertAnalyticsEvents(events); // Fast - single transaction
```

### Minimize Props Size

```typescript
// ❌ Large props payload
await insertAnalyticsEvent({
  event_name: 'scan_result',
  device_id: deviceId,
  props: {
    largeArray: Array(1000).fill({ data: '...' }),
    nested: { deep: { structure: { ... } } }
  },
  ts: Date.now()
});

// ✅ Minimal props
await insertAnalyticsEvent({
  event_name: 'scan_result',
  device_id: deviceId,
  props: {
    summary: 'scan completed',
    count: 42
  },
  ts: Date.now()
});
```

---

## Validation

Events are automatically validated before insertion:

### Event Names (Whitelist)

Valid event names:
- `scan_page_view`
- `scan_submit_clicked`
- `scan_result`
- `report_page_view`
- `poster_page_view`
- `poster_save_clicked`
- `poster_download_result`
- `poster_share_result`
- `poster_qr_visit`

Invalid event names will be rejected and logged.

### Error Codes (Format)

Error codes must follow: `{domain}_{type}`

Valid domains:
- `scan`, `poster`, `download`, `share`, `analytics`

Valid types:
- `timeout`, `network`, `http_4xx`, `http_5xx`, `validation`, `not_supported`, `aborted`, `unknown`

Examples:
- ✅ `scan_timeout`
- ✅ `download_http_5xx`
- ❌ `invalid_code`
- ❌ `unknown_timeout` (invalid domain)

---

## Testing

### Manual Testing

```typescript
import { insertAnalyticsEvent } from '@/lib/analytics/repository';

// Test with valid event
const result = await insertAnalyticsEvent({
  event_name: 'scan_page_view',
  device_id: 'test-device',
  ts: Date.now()
});
console.log('Insert complete:', result);

// Test with invalid event (should log warning)
await insertAnalyticsEvent({
  event_name: 'invalid_event',
  device_id: 'test-device',
  ts: Date.now()
});
// Logs: [analytics-repository] Event validation failed: [...]
```

### Verify Database

```sql
-- Check if events were inserted
SELECT * FROM analytics_events ORDER BY created_at DESC LIMIT 10;

-- Count events by type
SELECT event_name, COUNT(*) as count
FROM analytics_events
GROUP BY event_name;

-- Find recent errors
SELECT * FROM analytics_events
WHERE status = 'error'
ORDER BY created_at DESC;
```

---

## Troubleshooting

### Events Not Appearing

1. Check environment variables:
   ```bash
   echo $POSTGRES_URL
   ```

2. Check logs for warnings:
   ```
   [analytics-repository] Postgres not configured
   ```

3. Check database connection:
   ```sql
   SELECT * FROM analytics_events;
   ```

### Validation Errors

1. Check event name is in whitelist
2. Check error code format if present
3. Check required fields for event type

### Performance Issues

1. Use `insertAnalyticsEvents` for batches
2. Reduce props payload size
3. Check database indexes

---

## Migration

The repository automatically creates the table on first use. If you need to run migration manually:

```bash
# Apply migration
psql $DATABASE_URL -f migrations/analytics_events.sql
```

Table structure matches schema in `migrations/analytics_events.sql`.
