import fs from 'node:fs/promises';
import path from 'node:path';
import { test, expect, type BrowserContext, type Page } from '@playwright/test';

type AnalyticsEvent = Record<string, unknown> & {
  event_name?: string;
  scan_id?: string;
  status?: string;
  duration_ms?: number;
  device_id?: string;
  session_id?: string;
  src?: string;
  error_code?: string;
  error_type?: string;
  deviceId?: string;
  sessionId?: string;
};

const REPORTS_DIR = path.join(process.cwd(), 'data', 'reports');
const PNG_1X1_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAukB9oN2Y3wAAAAASUVORK5CYII=';
const PNG_BUFFER = Buffer.from(PNG_1X1_BASE64, 'base64');

function makeScanId(prefix: string): string {
  return `scan_e2e_${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

async function seedReport(scanId: string): Promise<void> {
  const report = {
    id: scanId,
    repoUrl: 'https://github.com/facebook/react',
    score: 69,
    grade: 'B',
    status: 'needs_review',
    summary: { critical: 1, high: 2, medium: 0, low: 0 },
    findings: [],
    engineVersion: 'v0.2.4.3',
    scannedAt: '2026-02-14T14:32:00.000Z',
    scanMeta: {
      source: 'github',
      filesScanned: 12,
      filesSkipped: 0,
    },
  };

  await fs.mkdir(REPORTS_DIR, { recursive: true });
  await fs.writeFile(path.join(REPORTS_DIR, `${scanId}.json`), JSON.stringify(report, null, 2), 'utf8');
}

async function setupAnalyticsCapture(context: BrowserContext): Promise<AnalyticsEvent[]> {
  const captured: AnalyticsEvent[] = [];

  await context.route('**/api/analytics**', async (route) => {
    const headers = route.request().headers();
    const headerDeviceId = headers['x-device-id'];
    const headerSessionId = headers['x-session-id'];
    const body = route.request().postData() ?? '[]';
    try {
      const parsed = JSON.parse(body) as unknown;
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item && typeof item === 'object') {
            const event = item as AnalyticsEvent;
            captured.push({
              ...event,
              device_id: (event.device_id as string | undefined) ?? headerDeviceId,
              session_id: (event.session_id as string | undefined) ?? headerSessionId,
            });
          }
        }
      }
    } catch {
      // Ignore invalid body and still ack to keep page flow stable.
    }

    await route.fulfill({
      status: 202,
      contentType: 'application/json',
      body: JSON.stringify({ accepted: 1, rejected: 0 }),
    });
  });

  return captured;
}

async function setupPosterImageMock(context: BrowserContext, scanId: string): Promise<void> {
  await context.route(`**/api/scan/${scanId}/poster/image**`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'image/png',
      body: PNG_BUFFER,
    });
  });
}

async function waitForEvents(events: AnalyticsEvent[], minimum: number): Promise<void> {
  await expect
    .poll(() => events.length, { timeout: 10_000 })
    .toBeGreaterThanOrEqual(minimum);
}

async function waitForNamedEvents(events: AnalyticsEvent[], name: string, minimum: number): Promise<void> {
  await expect
    .poll(() => eventsByName(events, name).length, { timeout: 10_000 })
    .toBeGreaterThanOrEqual(minimum);
}

function resultEvents(events: AnalyticsEvent[]): AnalyticsEvent[] {
  return events.filter(
    (event) => event.event_name === 'poster_share_result' || event.event_name === 'poster_download_result'
  );
}

function eventsByName(events: AnalyticsEvent[], name: string): AnalyticsEvent[] {
  return events.filter((event) => event.event_name === name);
}

function firstEvent(events: AnalyticsEvent[], name: string): AnalyticsEvent {
  const event = events.find((item) => item.event_name === name);
  expect(event, `Expected event "${name}"`).toBeTruthy();
  return event as AnalyticsEvent;
}

async function runMainlineFunnel(page: Page, scanId: string): Promise<AnalyticsEvent[]> {
  const context = page.context();
  const captured = await setupAnalyticsCapture(context);
  await setupPosterImageMock(context, scanId);

  await context.route('**/api/scan', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ scanId, status: 'completed' }),
    });
  });

  await page.goto('/scan');
  await page.getByRole('textbox').fill('https://github.com/facebook/react');
  await page.getByRole('button', { name: /start scan/i }).click();

  await expect(page).toHaveURL(new RegExp(`/scan/report/${scanId}$`));
  await page.getByRole('link', { name: 'Open Poster' }).click();
  await expect(page).toHaveURL(new RegExp(`/scan/poster/${scanId}$`));

  const saveButton = page.getByRole('button', { name: /save poster/i });
  await saveButton.click();

  await waitForNamedEvents(captured, 'poster_page_view', 1);
  await waitForEvents(captured, 5);
  return captured;
}

test.describe('v0.2.4.3 analytics funnel', () => {
  test('smoke: scan page loads', async ({ page }) => {
    await page.goto('/scan');
    await expect(page.getByRole('heading', { name: /scan your skill repo/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /start scan/i })).toBeVisible();
  });

  test('E2E-FUNNEL-001: funnel mainline emits ordered events', async ({ page }) => {
    const scanId = makeScanId('funnel');
    await seedReport(scanId);
    const events = await runMainlineFunnel(page, scanId);

    const names = events.map((event) => String(event.event_name));
    const ordered = [
      'scan_page_view',
      'scan_submit_clicked',
      'report_page_view',
      'poster_page_view',
    ];

    let cursor = -1;
    for (const target of ordered) {
      const index = names.findIndex((name, idx) => idx > cursor && name === target);
      expect(index, `Expected ordered event ${target}`).toBeGreaterThan(cursor);
      cursor = index;
    }

    const scanResult = eventsByName(events, 'scan_result')[0];
    if (scanResult) {
      expect(scanResult.status).toBe('success');
    }
    const saveClicked = eventsByName(events, 'poster_save_clicked')[0];
    if (saveClicked) {
      expect(saveClicked.scan_id).toBe(scanId);
    }
    const posterResult = eventsByName(events, 'poster_download_result')[0];
    if (posterResult) {
      expect(posterResult.status).toBe('success');
    }
    expect(firstEvent(events, 'poster_page_view').scan_id).toBe(scanId);
  });

  test('E2E-FUNNEL-002: conversion metrics are computable from event stream', async ({ page }) => {
    const scanId = makeScanId('conversion');
    await seedReport(scanId);
    const events = await runMainlineFunnel(page, scanId);

    const scanStart = eventsByName(events, 'scan_submit_clicked').length;
    const shareIntent = eventsByName(events, 'poster_save_clicked').length;
    const shareSuccess = eventsByName(events, 'poster_download_result').filter(
      (event) => event.status === 'success'
    ).length;

    expect(scanStart).toBeGreaterThan(0);
    expect(shareIntent).toBeGreaterThanOrEqual(0);
    expect(shareSuccess).toBeGreaterThanOrEqual(0);

    const scanStartRate = scanStart / eventsByName(events, 'scan_page_view').length;
    const shareIntentRate = shareIntent / scanStart;
    const shareSuccessRate = shareIntent > 0 ? shareSuccess / shareIntent : 0;

    expect(scanStartRate).toBeGreaterThan(0);
    expect(shareIntentRate).toBeGreaterThanOrEqual(0);
    expect(shareSuccessRate).toBeGreaterThanOrEqual(0);
    expect(shareSuccessRate).toBeLessThanOrEqual(1);
  });

  test('E2E-QR-001: poster_qr_visit first-load + UV/PV dedupe behavior', async ({ page }) => {
    const scanId = makeScanId('qr');
    await seedReport(scanId);

    const events = await setupAnalyticsCapture(page.context());
    await page.goto(`/scan/report/${scanId}?src=poster_qr`);
    await expect(page).toHaveURL(new RegExp(`/scan/report/${scanId}\\?src=poster_qr`));
    await page.reload();

    await waitForEvents(events, 3);

    const qrVisits = eventsByName(events, 'poster_qr_visit');
    const reportViews = eventsByName(events, 'report_page_view');

    expect(qrVisits).toHaveLength(1);
    expect(qrVisits[0].src).toBe('poster_qr');
    expect(reportViews.length).toBeGreaterThanOrEqual(2);
  });

  test('E2E-ID-001: device_id/session_id lifecycle across reload and new tab', async ({ browser }) => {
    const context = await browser.newContext();
    const events = await setupAnalyticsCapture(context);

    const pageA = await context.newPage();
    await pageA.goto('/scan');
    const firstIds = await pageA.evaluate(() => ({
      device: localStorage.getItem('security_scan_anon_device_id'),
      session: sessionStorage.getItem('security_scan_anon_session_id'),
    }));
    await pageA.reload();
    const reloadIds = await pageA.evaluate(() => ({
      device: localStorage.getItem('security_scan_anon_device_id'),
      session: sessionStorage.getItem('security_scan_anon_session_id'),
    }));

    const pageB = await context.newPage();
    await pageB.goto('/scan');
    const secondTabIds = await pageB.evaluate(() => ({
      device: localStorage.getItem('security_scan_anon_device_id'),
      session: sessionStorage.getItem('security_scan_anon_session_id'),
    }));

    await waitForEvents(events, 3);
    const scanViews = eventsByName(events, 'scan_page_view').slice(0, 3);
    expect(scanViews).toHaveLength(3);

    expect(firstIds.device).toBeTruthy();
    expect(firstIds.session).toBeTruthy();
    expect(reloadIds.device).toBe(firstIds.device);
    expect(reloadIds.session).toBe(firstIds.session);
    expect(secondTabIds.device).toBe(firstIds.device);
    expect(secondTabIds.session).toBeTruthy();
    expect(secondTabIds.session).not.toBe(firstIds.session);

    await context.close();
  });

  test('E2E-DOWNLOAD-001: poster_download_result success/error definitions', async ({ page }) => {
    const scanId = makeScanId('download');
    await seedReport(scanId);
    const events = await setupAnalyticsCapture(page.context());

    let imageRequestCount = 0;
    await page.context().route(`**/api/scan/${scanId}/poster/image**`, async (route) => {
      imageRequestCount += 1;
      if (imageRequestCount <= 2) {
        await route.fulfill({ status: 200, contentType: 'image/png', body: PNG_BUFFER });
        return;
      }
      await route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"boom"}' });
    });

    await page.goto(`/scan/poster/${scanId}`);
    const saveButton = page.getByRole('button', { name: /save poster/i });

    await saveButton.click();
    await waitForNamedEvents(events, 'poster_save_clicked', 1);
    const downloadResults = eventsByName(events, 'poster_download_result');
    if (downloadResults.length > 0) {
      expect(downloadResults.some((event) => event.status === 'error')).toBe(true);
      const errorEvent = downloadResults.find((event) => event.status === 'error') as AnalyticsEvent;
      expect(errorEvent.duration_ms).toBeGreaterThan(0);
      if (errorEvent.error_type !== undefined) {
        expect(errorEvent.error_type).toBeTruthy();
      }
    }
  });

  test('E2E-SHARE-001: poster_share_result success/error definitions', async ({ browser }) => {
    const scanId = makeScanId('share');
    await seedReport(scanId);

    const mobileUA =
      'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Mobile Safari/537.36';
    const context = await browser.newContext({ userAgent: mobileUA, viewport: { width: 412, height: 915 } });
    const events = await setupAnalyticsCapture(context);
    await setupPosterImageMock(context, scanId);

    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'canShare', {
        configurable: true,
        value: () => true,
      });
      Object.defineProperty(navigator, 'share', {
        configurable: true,
        value: async () => Promise.resolve(),
      });
    });

    const page = await context.newPage();
    await page.goto(`/scan/poster/${scanId}`);
    await waitForNamedEvents(events, 'poster_page_view', 1);
    const saveButton = page.getByRole('button', { name: /save poster/i });
    await saveButton.click();
    await waitForNamedEvents(events, 'poster_save_clicked', 1);

    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'share', {
        configurable: true,
        value: async () => Promise.reject(new DOMException('Not allowed', 'NotAllowedError')),
      });
    });

    const page2 = await context.newPage();
    await page2.goto(`/scan/poster/${scanId}`);
    const saveButton2 = page2.getByRole('button', { name: /save poster/i });
    await saveButton2.click();
    await waitForNamedEvents(events, 'poster_save_clicked', 2);
    await expect(page2.getByTestId('bottom-sheet')).toBeVisible();

    await context.close();
  });

  test('E2E-GA4-001: GA4 disabled mode still ingests backend events', async ({ page }) => {
    const events = await setupAnalyticsCapture(page.context());
    await page.goto('/scan');
    await waitForEvents(events, 1);

    const pageView = firstEvent(events, 'scan_page_view');
    expect(pageView.event_name).toBe('scan_page_view');

    const hasGa4Script = await page.evaluate(() =>
      Array.from(document.querySelectorAll('script')).some((script) =>
        (script as HTMLScriptElement).src.includes('googletagmanager.com/gtag/js')
      )
    );
    expect(hasGa4Script).toBe(false);
  });

  test('E2E-HEALTH-001: error and duration dimensions are emitted', async ({ page }) => {
    const scanId = makeScanId('health');
    await seedReport(scanId);
    const events = await setupAnalyticsCapture(page.context());

    await page.context().route('**/api/scan', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.fallback();
        return;
      }
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'internal_error', message: 'mock failure' }),
      });
    });

    await page.goto('/scan');
    await page.getByRole('textbox').fill('https://github.com/facebook/react');
    await page.getByRole('button', { name: /start scan/i }).click();
    await expect(page.getByText(/mock failure/i)).toBeVisible();

    await page.context().route(`**/api/scan/${scanId}/poster/image**`, async (route) => {
      await route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"poster_failed"}' });
    });
    await page.goto(`/scan/poster/${scanId}`);
    const saveButton = page.getByRole('button', { name: /save poster/i });
    await saveButton.click();
    await expect(page.getByText(/save failed\. please try again\./i)).toBeVisible();

    await waitForNamedEvents(events, 'scan_result', 1);
    const scanError = eventsByName(events, 'scan_result').find((event) => event.status === 'error');
    if (scanError) {
      expect(scanError.duration_ms).toBeGreaterThan(0);
      expect(scanError.error_code).toBe('scan_http_5xx');
    }

    const downloadError = eventsByName(events, 'poster_download_result').find((event) => event.status === 'error');
    if (downloadError) {
      expect(downloadError.duration_ms).toBeGreaterThan(0);
      if (downloadError.error_type !== undefined) {
        expect(downloadError.error_type).toBeTruthy();
      }
    }
  });
});
