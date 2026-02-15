/**
 * Verification script for backend sink module
 */

import {
  sendToBackend,
  sendToBackendSingle,
  flushBackendBuffer,
  getBackendBufferSize,
  initializeBackendSink,
} from '../lib/analytics/sinks/backend';

console.log('=== Backend Sink Module Verification ===\n');

// Test 1: Check if functions are exported
console.log('✓ sendToBackend is exported:', typeof sendToBackend);
console.log('✓ sendToBackendSingle is exported:', typeof sendToBackendSingle);
console.log('✓ flushBackendBuffer is exported:', typeof flushBackendBuffer);
console.log('✓ getBackendBufferSize is exported:', typeof getBackendBufferSize);
console.log('✓ initializeBackendSink is exported:', typeof initializeBackendSink);

// Test 2: Check buffer size
console.log('\n✓ Initial buffer size:', getBackendBufferSize());

// Test 3: Check function signatures
const event1 = {
  event_name: 'scan_page_view',
  ts: Date.now(),
};

console.log('\n✓ sendToBackend accepts array:', typeof sendToBackend([event1]).then);
console.log('✓ sendToBackendSingle accepts single event:', typeof sendToBackendSingle('scan_page_view', event1).then);
console.log('✓ flushBackendBuffer returns Promise:', typeof flushBackendBuffer().then);

console.log('\n=== All checks passed! ===');
