# Analytics Context Module - Usage Guide

## Overview

The analytics-context module provides automatic enrichment of event payloads with shared tracking context. This ensures consistent event data across the application without requiring manual context addition in business code.

## Installation

```typescript
import { enrichEventContext, getCurrentPageContext, getSourceAttribution } from '@/lib/analytics/context';
```

## Core Functions

### `enrichEventContext(eventName, props)`

The main function for enriching events with tracking context.

#### Parameters

- `eventName` (string): The name of the event being tracked
- `props` (Record<string, unknown>): Custom event properties (optional)

#### Returns

`EnrichedEventContext` - An object containing:

- `event_name`: The event name
- `ts`: Event timestamp in milliseconds
- `device_id`: Anonymous device identifier (UUID v4)
- `session_id`: Anonymous session identifier (UUID v4)
- `page_path`: Current page path
- `page_referrer`: HTTP referrer (if available)
- `src`: Traffic source from URL parameter (if present)
- `ua_basic`: Truncated user agent string
- `...props`: All custom properties passed in

#### Examples

```typescript
// Track a button click event
const enrichedEvent = enrichEventContext('button_click', {
  button_id: 'submit',
  button_text: 'Submit Form',
  button_color: 'primary',
});

// Result structure:
{
  event_name: 'button_click',
  ts: 1707657600000,
  device_id: '550e8400-e29b-41d4-a716-446655440000',
  session_id: '660e8400-e29b-41d4-a716-446655440001',
  page_path: '/dashboard/settings',
  page_referrer: 'https://example.com/landing',
  src: 'poster_qr',
  ua_basic: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...',
  button_id: 'submit',
  button_text: 'Submit Form',
  button_color: 'primary'
}

// Track a form submission event
const formEvent = enrichEventContext('form_submit', {
  form_name: 'contact_form',
  form_fields: 5,
  validation_errors: 0,
});

// Track a page view event (minimal context)
const pageViewEvent = enrichEventContext('page_view', {});
```

### `getCurrentPageContext()`

Get the current page context information.

#### Returns

`PageContext` - An object containing:

- `page_path`: Current page path
- `page_referrer`: HTTP referrer (if available)

#### Examples

```typescript
const pageContext = getCurrentPageContext();
console.log(pageContext.page_path); // '/dashboard/analytics'
console.log(pageContext.page_referrer); // 'https://example.com/landing'
```

### `getSourceAttribution()`

Get traffic source attribution from URL parameters.

#### Returns

`string | null` - The `src` parameter value or null if not present

#### Examples

```typescript
// URL: https://example.com?src=poster_qr&utm_medium=social
const src = getSourceAttribution();
console.log(src); // 'poster_qr'

// URL: https://example.com (no src parameter)
const src2 = getSourceAttribution();
console.log(src2); // null
```

### `clearContextCache()`

Clear all cached values. Useful for testing or when you need to force refresh of cached data.

#### Example

```typescript
// Clear all caches
clearContextCache();

// Next enrichEventContext call will fetch fresh data
const event = enrichEventContext('test_event', {});
```

## Performance Optimization

The module implements several performance optimizations:

### 1. Device ID Caching

Device ID is cached after the first retrieval to avoid repeated localStorage and cookie access.

```typescript
// First call - reads from storage
const event1 = enrichEventContext('event1', {});

// Second call - uses cached device_id
const event2 = enrichEventContext('event2', {});
```

### 2. Session ID Caching

Session ID is cached after the first retrieval to avoid repeated sessionStorage access.

```typescript
// First call - reads from sessionStorage
const event1 = enrichEventContext('event1', {});

// Second call - uses cached session_id
const event2 = enrichEventContext('event2', {});
```

### 3. Page Context Caching

Page context (path and referrer) is cached with a 5-minute TTL to minimize DOM reads.

```typescript
// First call - reads from DOM
const context1 = getCurrentPageContext();

// Within 5 minutes - uses cached value
const context2 = getCurrentPageContext();

// After 5 minutes - refreshes from DOM
```

### 4. Traffic Source Caching

The `src` parameter from URL is cached with a 5-minute TTL to avoid repeated URL parsing.

```typescript
// First call - parses URL
const src1 = getSourceAttribution();

// Within 5 minutes - uses cached value
const src2 = getSourceAttribution();
```

## Error Handling

The module implements graceful error handling:

### Browser API Unavailability

If browser APIs are unavailable (e.g., in server-side rendering), sensible fallback values are used:

```typescript
// Without browser APIs
const enriched = enrichEventContext('test_event', {});

// Result:
{
  event_name: 'test_event',
  ts: 1707657600000,
  device_id: 'unknown_device',  // Fallback
  session_id: 'unknown_session',  // Fallback
  page_path: '/unknown',  // Fallback
  page_referrer: null,
  src: null,
  ua_basic: 'unknown_ua',  // Fallback
}
```

### Never Throws Errors

The enrichment functions never throw errors. They always return a valid context object with fallback values.

```typescript
// Even if something fails, this won't throw
const enriched = enrichEventContext('test_event', {});
expect(enriched).toBeDefined();
```

## Best Practices

### 1. Always Use `enrichEventContext`

Never manually add context fields to events. Always use `enrichEventContext`:

```typescript
// ❌ Bad - manually adding context
const badEvent = {
  event_name: 'button_click',
  device_id: getDeviceId(),  // Don't do this
  session_id: getSessionId(),  // Don't do this
  ts: Date.now(),  // Don't do this
  button_id: 'submit',
};

// ✅ Good - use enrichEventContext
const goodEvent = enrichEventContext('button_click', {
  button_id: 'submit',
});
```

### 2. Cache Your Tracking Configuration

If you have a tracking system (e.g., Google Analytics, custom analytics), create a wrapper:

```typescript
// analytics.ts
import { enrichEventContext } from '@/lib/analytics/context';

export function trackEvent(eventName: string, props: Record<string, unknown>) {
  const enriched = enrichEventContext(eventName, props);

  // Send to your analytics backend
  fetch('/api/analytics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(enriched),
  });
}

// Usage in components
trackEvent('button_click', { button_id: 'submit' });
```

### 3. Use Descriptive Event Names

Choose clear, descriptive event names that follow a naming convention:

```typescript
// Good examples
enrichEventContext('user_signup', { method: 'email' });
enrichEventContext('form_submit', { form_name: 'contact' });
enrichEventContext('purchase_complete', { amount: 99.99, currency: 'USD' });
enrichEventContext('error_occurred', { error_type: 'network', error_message: 'Timeout' });

// Bad examples
enrichEventContext('click', { what: 'button' });  // Too generic
enrichEventContext('e1', { v: 123 });  // Cryptic
```

### 4. Include Relevant Context in Custom Props

Add custom properties that provide meaningful context for the event:

```typescript
enrichEventContext('product_view', {
  product_id: 'prod_123',
  product_name: 'Premium Plan',
  product_category: 'subscription',
  price: 29.99,
  currency: 'USD',
});
```

## Integration Example

Here's a complete example of integrating the analytics context module with a custom tracking system:

```typescript
// lib/analytics/tracker.ts
import { enrichEventContext } from './context';

class AnalyticsTracker {
  private queue: EnrichedEventContext[] = [];
  private isFlushing = false;

  track(eventName: string, props: Record<string, unknown> = {}) {
    const enriched = enrichEventContext(eventName, props);
    this.queue.push(enriched);

    // Auto-flush when queue reaches 10 events
    if (this.queue.length >= 10) {
      this.flush();
    }
  }

  async flush() {
    if (this.isFlushing || this.queue.length === 0) {
      return;
    }

    this.isFlushing = true;

    try {
      const events = [...this.queue];
      this.queue = [];

      await fetch('/api/analytics/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events }),
      });
    } finally {
      this.isFlushing = false;
    }
  }
}

export const tracker = new AnalyticsTracker();
```

## Testing

The module includes comprehensive tests. Run them with:

```bash
npm test -- tests/context.test.ts
```

All 30 tests cover:

- Page context retrieval
- Traffic source extraction
- Event enrichment
- Caching behavior
- Error handling
- Performance optimization
- Integration with device-id and session-id modules

## Migration Guide

If you're currently manually adding context to events:

### Before (Manual Context)

```typescript
const event = {
  event_name: 'button_click',
  ts: Date.now(),
  device_id: getDeviceId(),
  session_id: getSessionId(),
  page_path: window.location.pathname,
  page_referrer: document.referrer,
  src: new URLSearchParams(window.location.search).get('src'),
  ua_basic: navigator.userAgent.substring(0, 200),
  button_id: 'submit',
};
```

### After (Using enrichEventContext)

```typescript
const event = enrichEventContext('button_click', {
  button_id: 'submit',
});
```

## Type Definitions

```typescript
interface PageContext {
  page_path: string;
  page_referrer: string | null;
}

interface EnrichedEventContext {
  event_name: string;
  ts: number;
  device_id: string;
  session_id: string;
  page_path: string;
  page_referrer: string | null;
  src: string | null;
  ua_basic: string;
  [key: string]: unknown;  // Custom properties
}
```

## Notes

- Device ID is persistent across sessions (stored in localStorage and cookie)
- Session ID is tab-scoped (stored in sessionStorage)
- All IDs are anonymous UUID v4 format strings
- User agent is truncated to 200 characters to avoid oversized payloads
- Cache TTL is 5 minutes for page context and traffic source
- The module never throws errors - always returns valid context with fallbacks
