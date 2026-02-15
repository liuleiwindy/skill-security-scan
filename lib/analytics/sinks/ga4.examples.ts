/**
 * GA4 Sink Module - 使用示例
 * 演示如何在项目中使用 GA4 sink 发送分析事件
 */

import { sendToGA4, isGA4Configured } from './ga4';

// ============================================================================
// 示例 1: 基本事件发送
// ============================================================================

async function sendScanPageView() {
  console.log('示例 1: 发送扫描页面浏览事件');

  // 检查 GA4 是否配置
  if (!isGA4Configured()) {
    console.log('⚠️  GA4 未配置，事件将不会被发送');
    return;
  }

  await sendToGA4('scan_page_view', {
    ts: Date.now(),
  });

  console.log('✅ 事件已发送到 GA4');
}

sendScanPageView();

// ============================================================================
// 示例 2: 发送带参数的事件
// ============================================================================

async function sendScanSubmitClicked() {
  console.log('\n示例 2: 发送扫描提交点击事件');

  // 检查 GA4 是否配置
  if (!isGA4Configured()) {
    console.log('⚠️  GA4 未配置，事件将不会被发送');
    return;
  }

  await sendToGA4('scan_submit_clicked', {
    input_type: 'url',
    ts: Date.now(),
  });

  console.log('✅ 事件已发送到 GA4');
}

sendScanSubmitClicked();

// ============================================================================
// 示例 3: 发送带结果的事件
// ============================================================================

async function sendScanResult() {
  console.log('\n示例 3: 发送扫描结果事件');

  await sendToGA4('scan_result', {
    status: 'success',
    duration_ms: 1234,
    ts: Date.now(),
  });

  console.log('✅ 事件已发送到 GA4');
}

sendScanResult();

// ============================================================================
// 示例 4: 发送带错误详情的事件
// ============================================================================

async function sendPosterDownloadResultWithError() {
  console.log('\n示例 4: 发送带错误详情的海报下载结果事件');

  await sendToGA4('poster_download_result', {
    scan_id: 'scan_123',
    status: 'error',
    duration_ms: 5678,
    ts: Date.now(),
    error_code: 'download_timeout',
    error_message: 'Request timed out',
    error_details: {
      retry_count: 3,
      timeout_ms: 30000,
    },
  });

  console.log('✅ 事件已发送到 GA4');
}

sendPosterDownloadResultWithError();

// ============================================================================
// 示例 5: 发送海报保存点击事件
// ============================================================================

async function sendPosterSaveClicked() {
  console.log('\n示例 5: 发送海报保存点击事件');

  await sendToGA4('poster_save_clicked', {
    scan_id: 'scan_456',
    method: 'wechat',
    ts: Date.now(),
  });

  console.log('✅ 事件已发送到 GA4');
}

sendPosterSaveClicked();

// ============================================================================
// 示例 6: 发送海报分享结果事件
// ============================================================================

async function sendPosterShareResult() {
  console.log('\n示例 6: 发送海报分享结果事件');

  await sendToGA4('poster_share_result', {
    scan_id: 'scan_789',
    status: 'success',
    duration_ms: 2345,
    ts: Date.now(),
  });

  console.log('✅ 事件已发送到 GA4');
}

sendPosterShareResult();

// ============================================================================
// 示例 7: 发送海报二维码访问事件
// ============================================================================

async function sendPosterQrVisit() {
  console.log('\n示例 7: 发送海报二维码访问事件');

  await sendToGA4('poster_qr_visit', {
    scan_id: 'scan_999',
    src: 'https://example.com/qr',
    ua_basic: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
    ts: Date.now(),
  });

  console.log('✅ 事件已发送到 GA4');
}

sendPosterQrVisit();

// ============================================================================
// 示例 8: 发送报告页面浏览事件
// ============================================================================

async function sendReportPageView() {
  console.log('\n示例 8: 发送报告页面浏览事件');

  await sendToGA4('report_page_view', {
    scan_id: 'scan_123',
    ts: Date.now(),
  });

  console.log('✅ 事件已发送到 GA4');
}

sendReportPageView();

// ============================================================================
// 示例 9: 批量发送事件
// ============================================================================

async function sendMultipleEvents() {
  console.log('\n示例 9: 批量发送事件');

  // 发送多个事件
  await Promise.all([
    sendToGA4('scan_page_view', { ts: Date.now() }),
    sendToGA4('scan_submit_clicked', { input_type: 'url', ts: Date.now() }),
    sendToGA4('scan_result', { status: 'success', duration_ms: 1234, ts: Date.now() }),
  ]);

  console.log('✅ 所有事件已发送到 GA4');
}

sendMultipleEvents();

// ============================================================================
// 示例 10: 在 React 组件中使用
// ============================================================================

/**
 * 在 React 组件中使用 GA4 sink
 *
 * ```tsx
 * import { useEffect } from 'react';
 * import { sendToGA4 } from '@/lib/analytics/sinks/ga4';
 *
 * function ScanPage() {
 *   useEffect(() => {
 *     // 页面加载时发送事件
 *     sendToGA4('scan_page_view', { ts: Date.now() });
 *   }, []);
 *
 *   const handleSubmit = async () => {
 *     // 用户提交时发送事件
 *     await sendToGA4('scan_submit_clicked', {
 *       input_type: 'url',
 *       ts: Date.now(),
 *     });
 *   };
 *
 *   return <button onClick={handleSubmit}>Submit</button>;
 * }
 * ```
 */

// ============================================================================
// 示例 11: 在 API 路由中使用
// ============================================================================

/**
 * 在 API 路由中使用 GA4 sink
 *
 * ```tsx
 * import { NextRequest, NextResponse } from 'next/server';
 * import { sendToGA4 } from '@/lib/analytics/sinks/ga4';
 *
 * export async function POST(request: NextRequest) {
 *   const body = await request.json();
 *
 *   // 发送事件到 GA4
 *   await sendToGA4('scan_submit_clicked', {
 *     input_type: body.input_type,
 *     ts: Date.now(),
 *   });
 *
 *   // 处理业务逻辑
 *   const result = await handleScan(body);
 *
 *   // 发送结果事件
 *   await sendToGA4('scan_result', {
 *     status: result.status,
 *     duration_ms: result.duration_ms,
 *     ts: Date.now(),
 *   });
 *
 *   return NextResponse.json(result);
 * }
 * ```
 */

// ============================================================================
// 示例 12: 错误处理
// ============================================================================

async function sendEventWithErrorHandling() {
  console.log('\n示例 12: 错误处理');

  try {
    // 即使 GA4 未配置或出错，也不会抛出异常
    await sendToGA4('scan_page_view', { ts: Date.now() });
    console.log('✅ 事件发送成功或 GA4 未配置（预期行为）');
  } catch (error) {
    // 不应该到达这里，因为 sendToGA4 不会抛出异常
    console.error('❌ 意外的错误:', error);
  }
}

sendEventWithErrorHandling();

// ============================================================================
// 示例 13: 条件发送（基于配置）
// ============================================================================

async function sendEventConditionally() {
  console.log('\n示例 13: 条件发送事件');

  if (isGA4Configured()) {
    console.log('📊 GA4 已配置，将发送事件');
    await sendToGA4('scan_page_view', { ts: Date.now() });
  } else {
    console.log('⚠️  GA4 未配置，跳过事件发送');
    // 可以在这里添加其他分析逻辑，例如发送到后端
  }
}

sendEventConditionally();

// ============================================================================
// 示例 14: 带自定义参数的事件
// ============================================================================

async function sendEventWithCustomParams() {
  console.log('\n示例 14: 发送带自定义参数的事件');

  await sendToGA4('scan_page_view', {
    ts: Date.now(),
    // 自定义参数（会被转换为 GA4 兼容格式）
    page_title: document.title,
    page_path: window.location.pathname,
    user_agent: navigator.userAgent,
    // 布尔值会被转换为 'true'/'false'
    is_mobile: true,
    // 对象会被转换为 JSON 字符串
    metadata: {
      version: '1.0.0',
      source: 'web',
    },
  });

  console.log('✅ 事件已发送到 GA4');
}

sendEventWithCustomParams();

// ============================================================================
// 运行所有示例
// ============================================================================

console.log('='.repeat(60));
console.log('GA4 Sink Module - 使用示例');
console.log('='.repeat(60));
console.log('\n注意：这些示例在浏览器环境中运行。');
console.log('如果 NEXT_PUBLIC_GA4_MEASUREMENT_ID 未配置，事件将不会被发送。');
console.log('如果 GA4 已配置，事件将被发送到 Google Analytics 4。');
