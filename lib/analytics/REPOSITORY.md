# Analytics Repository Module

## Implementation Summary

**Module Path**: `lib/analytics/repository.ts`

**Version**: 1.0.0

**Status**: ✅ Complete

---

## Features Implemented

### 1. **Single Event Insertion** (`insertAnalyticsEvent`)
- Validates event payload before insertion
- Validates error code format if present
- Inserts into `analytics_events` table
- Graceful error handling (logs without throwing)
- Supports all optional fields with null handling

### 2. **Batch Event Insertion** (`insertAnalyticsEvents`)
- Validates all events before transaction
- Skips invalid events but continues with valid ones
- Uses database transaction for atomicity
- Rolls back on any database error
- Provides success count logging

### 3. **Validation Integration**
- Integrates with `lib/analytics/validation.ts`
- Calls `validateEventPayload` for schema validation
- Calls `validateErrorCode` for error code format validation
- Filters out invalid events before database operations

### 4. **Error Handling**
- All database errors caught and logged
- No exceptions thrown to client (graceful degradation)
- Detailed error logging with context
- Postgres availability checking

### 5. **Database Features**
- Automatic table creation using global singleton pattern
- JSONB serialization for `props` field
- Prepared statement pattern for security
- Transaction support for batch operations
- Postgres connection detection via environment variables

---

## Key Implementation Details

### Type System
```typescript
export interface AnalyticsEvent extends Omit<ValidatedAnalyticsEvent, 'ts'> {
  id?: string;
  device_id: string;
  session_id?: string;
  props?: Record<string, unknown>;
  created_at?: Date;
}
```

### Database Schema Alignment
- Maps directly to `analytics_events` table schema
- JSONB type for `props` field
- UUID primary key with auto-generation
- TIMESTAMPTZ for `created_at`

### Validation Flow
```
Event Input
  ↓
validateErrorCode (if error_code present)
  ↓
validateEventPayload
  ↓
Database Insert (if valid)
  ↓
Success / Silent Failure
```

### Transaction Pattern
```typescript
await sql.begin(async (sql) => {
  for (const event of validatedEvents) {
    await sql`INSERT INTO ...`;
  }
});
```

---

## Usage Examples

### Insert Single Event
```typescript
import { insertAnalyticsEvent } from '@/lib/analytics/repository';

await insertAnalyticsEvent({
  event_name: 'scan_page_view',
  device_id: 'device_123',
  ts: Date.now()
});
```

### Insert Batch Events
```typescript
import { insertAnalyticsEvents } from '@/lib/analytics/repository';

await insertAnalyticsEvents([
  {
    event_name: 'scan_page_view',
    device_id: 'device_123',
    ts: Date.now()
  },
  {
    event_name: 'scan_result',
    device_id: 'device_123',
    status: 'success',
    duration_ms: 5000,
    ts: Date.now()
  }
]);
```

### With Optional Fields
```typescript
await insertAnalyticsEvent({
  id: 'custom-event-id',
  event_name: 'poster_save_clicked',
  scan_id: 'scan_456',
  device_id: 'device_789',
  session_id: 'session_abc',
  src: 'poster_qr',
  method: 'wechat',
  ts: Date.now(),
  props: {
    customProperty: 'value',
    nested: { key: 'value' }
  },
  created_at: new Date()
});
```

---

## Error Handling Examples

### Validation Failure (Logged, No Exception)
```typescript
// Invalid event name
await insertAnalyticsEvent({
  event_name: 'invalid_event', // Not in whitelist
  device_id: 'device_123',
  ts: Date.now()
});
// Logs: [analytics-repository] Event validation failed: [...]
// Returns: void (no error thrown)
```

### Database Error (Logged, No Exception)
```typescript
// Postgres connection issue
await insertAnalyticsEvent({ ... });
// Logs: [analytics-repository] Failed to insert analytics event: [error details]
// Returns: void (no error thrown)
```

### Mixed Validation Results
```typescript
await insertAnalyticsEvents([
  { event_name: 'valid_event', device_id: 'd1', ts: Date.now() }, // ✅ Inserted
  { event_name: 'invalid_event', device_id: 'd2', ts: Date.now() } // ❌ Skipped
]);
// Logs: [analytics-repository] Successfully inserted 1 events
// Returns: void (no error thrown)
```

---

## Dependencies

### Internal Dependencies
- `lib/analytics/validation.ts`: `validateEventPayload`, `validateErrorCode`

### External Dependencies
- `@vercel/postgres`: `sql` template

---

## Constraints & Guarantees

### What's Guaranteed
✅ Events are validated before insertion
✅ Database errors never propagate to client
✅ Batch operations use transactions
✅ Invalid events are logged and skipped
✅ JSONB fields properly serialized
✅ Table auto-created on first use

### What's Not Guaranteed
❌ Order preservation in batch inserts
❌ Idempotency (same event can be inserted multiple times)
❌ Real-time insertion (async, no acknowledgment)
❌ Persistence if Postgres unavailable

---

## Logging

All operations use prefixed console logging:
- `[analytics-repository] Postgres not configured, skipping insert`
- `[analytics-repository] Invalid error code: {code}`
- `[analytics-repository] Event validation failed: {errors}`
- `[analytics-repository] Failed to insert analytics event: {error}`
- `[analytics-repository] Successfully inserted {count} events`

---

## Testing

Unit tests available at: `tests/analytics-repository.test.ts`

Test coverage:
- ✅ Single event insertion
- ✅ Batch event insertion
- ✅ Validation failure handling
- ✅ Database error handling
- ✅ Empty array handling
- ✅ Mixed validation results

---

## Integration

### Exported from Module Index
```typescript
// lib/analytics/index.ts
export * from './repository';
```

### Usage in Application
```typescript
import { insertAnalyticsEvent, insertAnalyticsEvents } from '@/lib/analytics';
```

---

## Configuration

### Environment Variables
- `POSTGRES_URL`: Postgres connection string (optional)
- `DATABASE_URL`: Alternative Postgres connection string (optional)

### Postgres Configuration
If neither `POSTGRES_URL` nor `DATABASE_URL` is set:
- Insert operations are silently skipped
- Warning logged: `[analytics-repository] Postgres not configured`

---

## Future Enhancements

Potential improvements:
- [ ] Add query methods (get events by scan_id, device_id, etc.)
- [ ] Add aggregate functions (count, stats by event_name)
- [ ] Add deletion/cleanup functions
- [ ] Add retry logic for transient errors
- [ ] Add metrics/monitoring integration
- [ ] Add event deduplication
- [ ] Add time-based partitioning

---

## Notes

- Uses global singleton pattern for table initialization to prevent duplicate table creation
- Follows existing `report-repository.ts` patterns
- TypeScript types are comprehensive and exported
- No external state or side effects beyond database
- Fully async with proper Promise handling
