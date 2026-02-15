/**
 * Analytics API Route Tests
 * Tests for POST /api/analytics endpoint
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from '@/app/api/analytics/route';
import { NextRequest } from 'next/server';

// Mock the repository functions
vi.mock('@/lib/analytics/repository', () => ({
  insertAnalyticsEvents: vi.fn(),
}));

// Mock console methods to avoid cluttering test output
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

beforeEach(() => {
  console.warn = vi.fn();
  console.error = vi.fn();
  vi.clearAllMocks();
});

afterEach(() => {
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;
});

describe('POST /api/analytics', () => {
  describe('successful requests', () => {
    it('should accept valid events and return 202', async () => {
      const mockEvents = [
        {
          event_name: 'scan_page_view',
          ts: Date.now(),
        },
      ];

      const request = new NextRequest('http://localhost:3000/api/analytics', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-device-id': 'test-device-123',
        },
        body: JSON.stringify(mockEvents),
      });

      const { insertAnalyticsEvents } = await import('@/lib/analytics/repository');
      vi.mocked(insertAnalyticsEvents).mockResolvedValue(undefined);

      const response = await POST(request);

      expect(response.status).toBe(202);
      const body = await response.json();
      expect(body).toEqual({
        accepted: 1,
        rejected: 0,
      });
      expect(insertAnalyticsEvents).toHaveBeenCalledTimes(1);
    });

    it('should accept multiple valid events in a batch', async () => {
      const mockEvents = [
        {
          event_name: 'scan_page_view',
          ts: Date.now(),
        },
        {
          event_name: 'scan_submit_clicked',
          input_type: 'github_url',
          ts: Date.now(),
        },
        {
          event_name: 'scan_result',
          status: 'success',
          duration_ms: 5000,
          ts: Date.now(),
        },
      ];

      const request = new NextRequest('http://localhost:3000/api/analytics', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-device-id': 'test-device-123',
          'x-session-id': 'test-session-456',
        },
        body: JSON.stringify(mockEvents),
      });

      const { insertAnalyticsEvents } = await import('@/lib/analytics/repository');
      vi.mocked(insertAnalyticsEvents).mockResolvedValue(undefined);

      const response = await POST(request);

      expect(response.status).toBe(202);
      const body = await response.json();
      expect(body).toEqual({
        accepted: 3,
        rejected: 0,
      });

      // Verify that session_id is included
      const insertedEvents = vi.mocked(insertAnalyticsEvents).mock.calls[0][0];
      expect(insertedEvents).toHaveLength(3);
      expect(insertedEvents[0].device_id).toBe('test-device-123');
      expect(insertedEvents[0].session_id).toBe('test-session-456');
    });

    it('should partially accept valid events from mixed batch', async () => {
      const mockEvents = [
        {
          event_name: 'scan_page_view',
          ts: Date.now(),
        },
        {
          event_name: 'invalid_event',
          ts: Date.now(),
        }, // Invalid event name
        {
          event_name: 'scan_submit_clicked',
          input_type: 'github_url',
          ts: Date.now(),
        },
      ];

      const request = new NextRequest('http://localhost:3000/api/analytics', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-device-id': 'test-device-123',
        },
        body: JSON.stringify(mockEvents),
      });

      const { insertAnalyticsEvents } = await import('@/lib/analytics/repository');
      vi.mocked(insertAnalyticsEvents).mockResolvedValue(undefined);

      const response = await POST(request);

      expect(response.status).toBe(202);
      const body = await response.json();
      expect(body).toEqual({
        accepted: 2,
        rejected: 1,
      });

      // Only valid events should be inserted
      const insertedEvents = vi.mocked(insertAnalyticsEvents).mock.calls[0][0];
      expect(insertedEvents).toHaveLength(2);
    });

    it('should accept device/session identity from query params when headers are missing', async () => {
      const mockEvents = [
        {
          event_name: 'scan_page_view',
          ts: Date.now(),
        },
      ];

      const request = new NextRequest(
        'http://localhost:3000/api/analytics?device_id=query-device-123&session_id=query-session-456',
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify(mockEvents),
        }
      );

      const { insertAnalyticsEvents } = await import('@/lib/analytics/repository');
      vi.mocked(insertAnalyticsEvents).mockResolvedValue(undefined);

      const response = await POST(request);

      expect(response.status).toBe(202);
      const body = await response.json();
      expect(body).toEqual({
        accepted: 1,
        rejected: 0,
      });

      const insertedEvents = vi.mocked(insertAnalyticsEvents).mock.calls[0][0];
      expect(insertedEvents[0].device_id).toBe('query-device-123');
      expect(insertedEvents[0].session_id).toBe('query-session-456');
    });
  });

  describe('error handling', () => {
    it('should return 400 if x-device-id header is missing', async () => {
      const mockEvents = [
        {
          event_name: 'scan_page_view',
          ts: Date.now(),
        },
      ];

      const request = new NextRequest('http://localhost:3000/api/analytics', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(mockEvents),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toEqual({
        error: 'Missing device identifier',
      });
    });

    it('should return 400 for invalid JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/analytics', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-device-id': 'test-device-123',
        },
        body: 'invalid json{',
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toEqual({
        error: 'Invalid JSON format',
      });
    });

    it('should return 400 if payload is not an array', async () => {
      const request = new NextRequest('http://localhost:3000/api/analytics', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-device-id': 'test-device-123',
        },
        body: JSON.stringify({ event_name: 'scan_page_view' }),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('Invalid payload structure: expected array');
    });

    it('should return 400 if batch is empty', async () => {
      const request = new NextRequest('http://localhost:3000/api/analytics', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-device-id': 'test-device-123',
        },
        body: JSON.stringify([]),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('Batch too small: minimum 1 event required');
    });

    it('should return 400 if batch exceeds maximum size', async () => {
      const mockEvents = Array.from({ length: 51 }, () => ({
        event_name: 'scan_page_view',
        ts: Date.now(),
      }));

      const request = new NextRequest('http://localhost:3000/api/analytics', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-device-id': 'test-device-123',
        },
        body: JSON.stringify(mockEvents),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('Batch too large');
    });

    it('should return 413 if payload size exceeds limit', async () => {
      // Create a payload larger than 1MB
      const largePayload = Array.from({ length: 5 }, () => ({
        event_name: 'scan_page_view',
        ts: Date.now(),
        large_field: 'x'.repeat(300000), // ~300KB per event
      }));

      const request = new NextRequest('http://localhost:3000/api/analytics', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-device-id': 'test-device-123',
          'content-length': '1500000', // Simulate 1.5MB
        },
        body: JSON.stringify(largePayload),
      });

      const response = await POST(request);

      expect(response.status).toBe(413);
      const body = await response.json();
      expect(body).toEqual({
        error: 'Payload too large',
      });
    });

    it('should return 400 for invalid request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/analytics', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-device-id': 'test-device-123',
        },
        // Invalid body that will cause an error
        body: undefined as any,
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toEqual({
        error: 'Invalid JSON format',
      });
    });
  });

  describe('event validation', () => {
    it('should reject events with invalid event name', async () => {
      const mockEvents = [
        {
          event_name: 'invalid_event_name',
          ts: Date.now(),
        },
      ];

      const request = new NextRequest('http://localhost:3000/api/analytics', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-device-id': 'test-device-123',
        },
        body: JSON.stringify(mockEvents),
      });

      const response = await POST(request);

      expect(response.status).toBe(202);
      const body = await response.json();
      expect(body).toEqual({
        accepted: 0,
        rejected: 1,
      });
    });

    it('should reject events missing required fields', async () => {
      const mockEvents = [
        {
          // Missing input_type
          event_name: 'scan_submit_clicked',
          ts: Date.now(),
        },
      ];

      const request = new NextRequest('http://localhost:3000/api/analytics', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-device-id': 'test-device-123',
        },
        body: JSON.stringify(mockEvents),
      });

      const response = await POST(request);

      expect(response.status).toBe(202);
      const body = await response.json();
      expect(body.rejected).toBe(1);
    });

    it('should reject events with invalid error code format', async () => {
      const mockEvents = [
        {
          event_name: 'poster_download_result',
          scan_id: 'scan-123',
          status: 'error',
          duration_ms: 5000,
          error_code: 'invalid_error_code', // Should be {domain}_{type}
          ts: Date.now(),
        },
      ];

      const request = new NextRequest('http://localhost:3000/api/analytics', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-device-id': 'test-device-123',
        },
        body: JSON.stringify(mockEvents),
      });

      const response = await POST(request);

      expect(response.status).toBe(202);
      const body = await response.json();
      expect(body.rejected).toBe(1);
    });
  });

  describe('async processing', () => {
    it('should return 202 immediately without waiting for database insertion', async () => {
      const mockEvents = [
        {
          event_name: 'scan_page_view',
          ts: Date.now(),
        },
      ];

      const request = new NextRequest('http://localhost:3000/api/analytics', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-device-id': 'test-device-123',
        },
        body: JSON.stringify(mockEvents),
      });

      const { insertAnalyticsEvents } = await import('@/lib/analytics/repository');
      // Make insertAnalyticsEvents slow
      vi.mocked(insertAnalyticsEvents).mockImplementation(
        () =>
          new Promise((resolve) => setTimeout(resolve, 1000)) // 1 second delay
      );

      const startTime = Date.now();
      const response = await POST(request);
      const endTime = Date.now();

      // Should return quickly (< 100ms) despite slow database insertion
      expect(endTime - startTime).toBeLessThan(100);
      expect(response.status).toBe(202);
    });

    it('should handle database insertion errors gracefully', async () => {
      const mockEvents = [
        {
          event_name: 'scan_page_view',
          ts: Date.now(),
        },
      ];

      const request = new NextRequest('http://localhost:3000/api/analytics', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-device-id': 'test-device-123',
        },
        body: JSON.stringify(mockEvents),
      });

      const { insertAnalyticsEvents } = await import('@/lib/analytics/repository');
      // Make insertAnalyticsEvents reject
      vi.mocked(insertAnalyticsEvents).mockRejectedValue(
        new Error('Database error')
      );

      const response = await POST(request);

      // Should still return 202 despite database error
      expect(response.status).toBe(202);
      const body = await response.json();
      expect(body).toEqual({
        accepted: 1,
        rejected: 0,
      });
    });
  });

  describe('edge cases', () => {
    it('should handle batch at maximum size (50 events)', async () => {
      const mockEvents = Array.from({ length: 50 }, () => ({
        event_name: 'scan_page_view',
        ts: Date.now(),
      }));

      const request = new NextRequest('http://localhost:3000/api/analytics', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-device-id': 'test-device-123',
        },
        body: JSON.stringify(mockEvents),
      });

      const { insertAnalyticsEvents } = await import('@/lib/analytics/repository');
      vi.mocked(insertAnalyticsEvents).mockResolvedValue(undefined);

      const response = await POST(request);

      expect(response.status).toBe(202);
      const body = await response.json();
      expect(body).toEqual({
        accepted: 50,
        rejected: 0,
      });
    });

    it('should return 202 with all rejected if all events are invalid', async () => {
      const mockEvents = [
        { invalid: 'event1' },
        { invalid: 'event2' },
      ];

      const request = new NextRequest('http://localhost:3000/api/analytics', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-device-id': 'test-device-123',
        },
        body: JSON.stringify(mockEvents),
      });

      const { insertAnalyticsEvents } = await import('@/lib/analytics/repository');
      vi.mocked(insertAnalyticsEvents).mockResolvedValue(undefined);

      const response = await POST(request);

      expect(response.status).toBe(202);
      const body = await response.json();
      expect(body).toEqual({
        accepted: 0,
        rejected: 2,
      });

      // Should not attempt to insert any events
      expect(insertAnalyticsEvents).not.toHaveBeenCalled();
    });
  });
});
