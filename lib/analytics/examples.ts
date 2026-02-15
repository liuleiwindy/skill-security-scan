/**
 * Analytics Track Module - 使用示例
 * 演示如何在项目中使用 track 函数进行事件跟踪
 */

import { track, isAllowedEvent, getAllowedEvents } from './track';

// ============================================================================
// 示例 1: 基本事件跟踪
// ============================================================================

function example1_basicTracking() {
  console.log('示例 1: 基本事件跟踪\n');

  // 跟踪页面浏览
  track('scan_page_view');

  // 跟踪按钮点击
  track('scan_submit_clicked', { input_type: 'github_url' });

  console.log('✅ 基本事件跟踪完成\n');
}

example1_basicTracking();

// ============================================================================
// 示例 2: 跟带完整属性的事件
// ============================================================================

function example2_trackingWithProperties() {
  console.log('示例 2: 跟踪带完整属性的事件\n');

  // 跟踪扫描结果
  track('scan_result', {
    status: 'success',
    duration_ms: 1500,
    scan_id: 'scan_12345',
  });

  // 跟踪海报保存
  track('poster_save_clicked', {
    scan_id: 'scan_12345',
    method: 'wechat',
  });

  // 跟踪海报下载结果
  track('poster_download_result', {
    scan_id: 'scan_12345',
    status: 'success',
    duration_ms: 2345,
  });

  console.log('✅ 带属性的事件跟踪完成\n');
}

example2_trackingWithProperties();

// ============================================================================
// 示例 3: 跟踪错误事件
// ============================================================================

function example3_trackingErrorEvents() {
  console.log('示例 3: 跟踪错误事件\n');

  // 跟踪下载失败
  track('poster_download_result', {
    scan_id: 'scan_67890',
    status: 'error',
    duration_ms: 5000,
    error_code: 'download_timeout',
    error_message: 'Request timed out after 5 seconds',
    error_details: { retry_count: 3, timeout_ms: 5000 },
  });

  // 跟踪分享失败
  track('poster_share_result', {
    scan_id: 'scan_67890',
    status: 'error',
    duration_ms: 1200,
    error_code: 'share_aborted',
    error_message: 'User cancelled the share operation',
  });

  console.log('✅ 错误事件跟踪完成\n');
}

example3_trackingErrorEvents();

// ============================================================================
// 示例 4: 在 React 组件中使用
// ============================================================================

function example4_reactComponentUsage() {
  console.log('示例 4: 在 React 组件中使用\n');

  // 模拟 React 组件中的使用
  console.log(`
  import { track } from '@/lib/analytics/track';

  function ScanPage() {
    useEffect(() => {
      // 页面加载时跟踪浏览
      track('scan_page_view');
    }, []);

    const handleSubmit = () => {
      // 提交时跟踪点击
      track('scan_submit_clicked', { input_type: 'github_url' });
    };

    const handleScanComplete = (result: ScanResult) => {
      // 扫描完成时跟踪结果
      track('scan_result', {
        status: result.status,
        duration_ms: result.duration,
        scan_id: result.id,
      });
    };

    return <div>Scan Page</div>;
  }
  `);

  console.log('✅ React 组件使用示例完成\n');
}

example4_reactComponentUsage();

// ============================================================================
// 示例 5: 在 Next.js 页面中使用
// ============================================================================

function example5_nextjsPageUsage() {
  console.log('示例 5: 在 Next.js 页面中使用\n');

  console.log(`
  // app/scan/page.tsx
  import { track } from '@/lib/analytics/track';

  export default function ScanPage() {
    useEffect(() => {
      track('scan_page_view');
    }, []);

    return <div>Scan Page</div>;
  }

  // app/report/[scanId]/page.tsx
  import { track } from '@/lib/analytics/track';

  export default function ReportPage({ params }: { params: { scanId: string } }) {
    useEffect(() => {
      track('report_page_view', { scan_id: params.scanId });
    }, [params.scanId]);

    return <div>Report Page</div>;
  }
  `);

  console.log('✅ Next.js 页面使用示例完成\n');
}

example5_nextjsPageUsage();

// ============================================================================
// 示例 6: 在 API 路由中使用
// ============================================================================

function example6_apiRouteUsage() {
  console.log('示例 6: 在 API 路由中使用\n');

  console.log(`
  // app/api/scan/route.ts
  import { NextRequest, NextResponse } from 'next/server';
  import { track } from '@/lib/analytics/track';

  export async function POST(request: NextRequest) {
    const body = await request.json();
    const startTime = Date.now();

    try {
      // 执行扫描逻辑
      const result = await performScan(body);

      // 跟踪成功结果
      track('scan_result', {
        status: 'success',
        duration_ms: Date.now() - startTime,
        scan_id: result.id,
      });

      return NextResponse.json(result);
    } catch (error) {
      // 跟踪错误结果
      track('scan_result', {
        status: 'error',
        duration_ms: Date.now() - startTime,
        error_code: 'scan_unknown',
        error_message: error instanceof Error ? error.message : 'Unknown error',
      });

      return NextResponse.json({ error: 'Scan failed' }, { status: 500 });
    }
  }
  `);

  console.log('✅ API 路由使用示例完成\n');
}

example6_apiRouteUsage();

// ============================================================================
// 示例 7: 事件名称验证
// ============================================================================

function example7_eventNameValidation() {
  console.log('示例 7: 事件名称验证\n');

  // 检查事件名称是否允许
  const eventsToCheck = ['scan_page_view', 'invalid_event', 'scan_submit_clicked'];

  eventsToCheck.forEach((eventName) => {
    if (isAllowedEvent(eventName)) {
      console.log(`✅ "${eventName}" 是有效的事件名称`);
    } else {
      console.log(`❌ "${eventName}" 不是有效的事件名称`);
    }
  });

  console.log('\n所有允许的事件名称:');
  const allowedEvents = getAllowedEvents();
  allowedEvents.forEach((event) => console.log(`  - ${event}`));

  console.log('\n✅ 事件名称验证完成\n');
}

example7_eventNameValidation();

// ============================================================================
// 示例 8: 完整的用户流程跟踪
// ============================================================================

function example8_completeUserFlow() {
  console.log('示例 8: 完整的用户流程跟踪\n');

  console.log(`
  模拟完整用户流程：
  1. 用户访问扫描页面
  2. 用户输入 URL 并提交
  3. 扫描完成
  4. 用户查看报告
  5. 用户生成海报
  6. 用户保存海报
  7. 用户下载海报
  `);

  // 1. 用户访问扫描页面
  track('scan_page_view');

  // 2. 用户输入 URL 并提交
  track('scan_submit_clicked', { input_type: 'github_url' });

  // 3. 扫描完成
  setTimeout(() => {
    track('scan_result', {
      status: 'success',
      duration_ms: 1200,
      scan_id: 'scan_complete_001',
    });
  }, 100);

  // 4. 用户查看报告
  setTimeout(() => {
    track('report_page_view', { scan_id: 'scan_complete_001' });
  }, 200);

  // 5. 用户生成海报
  setTimeout(() => {
    track('poster_page_view', { scan_id: 'scan_complete_001' });
  }, 300);

  // 6. 用户保存海报
  setTimeout(() => {
    track('poster_save_clicked', {
      scan_id: 'scan_complete_001',
      method: 'image',
    });
  }, 400);

  // 7. 用户下载海报
  setTimeout(() => {
    track('poster_download_result', {
      scan_id: 'scan_complete_001',
      status: 'success',
      duration_ms: 800,
    });

    console.log('✅ 完整用户流程跟踪完成\n');
  }, 500);
}

example8_completeUserFlow();

// ============================================================================
// 示例 9: QR 码来源跟踪
// ============================================================================

function example9_qrSourceTracking() {
  console.log('示例 9: QR 码来源跟踪\n');

  console.log(`
  当用户通过 QR 码访问海报时，URL 会包含 src 参数：
  例如: https://example.com/poster/scan_123?src=poster_qr

  track 函数会自动从 URL 中提取 src 参数并添加到事件中。
  `);

  // 跟踪 QR 码访问
  track('poster_qr_visit', {
    scan_id: 'scan_from_qr_001',
    src: 'poster_qr',
    ua_basic: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
  });

  console.log('✅ QR 码来源跟踪完成\n');
}

example9_qrSourceTracking();

// ============================================================================
// 示例 10: 错误处理和降级
// ============================================================================

function example10_errorHandlingAndFallback() {
  console.log('示例 10: 错误处理和降级\n');

  console.log(`
  track 函数具有以下错误处理特性：

  1. 永不抛出异常 - 即使所有 sinks 失败
  2. 自动记录错误到控制台
  3. 使用 requestIdleCallback 避免阻塞主线程
  4. GA4 配置失败时不影响后端跟踪
  5. 后端失败时不影响业务逻辑
  6. 上下文丰富失败时使用默认值

  示例场景：
  `);

  // 场景 1: 无效的事件名称
  console.log('场景 1: 跟踪无效的事件名称');
  track('invalid_event_name');
  console.log('✅ 函数正常返回，不会抛出异常\n');

  // 场景 2: 正常事件跟踪
  console.log('场景 2: 正常事件跟踪');
  track('scan_page_view');
  console.log('✅ 事件正常发送到 GA4 和后端\n');

  // 场景 3: 上下文失败时的降级
  console.log('场景 3: 即使上下文丰富失败，仍然尝试发送事件');
  track('scan_result', {
    status: 'success',
    duration_ms: 1000,
  });
  console.log('✅ 使用默认值继续跟踪\n');

  console.log('✅ 错误处理和降级演示完成\n');
}

example10_errorHandlingAndFallback();

// ============================================================================
// 运行所有示例
// ============================================================================

console.log('='.repeat(60));
console.log('Analytics Track Module - 使用示例');
console.log('='.repeat(60));
console.log('');
