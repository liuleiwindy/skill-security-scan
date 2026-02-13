import { NextRequest } from 'next/server';
import {
  validateScanRequest,
  createSuccessResponse,
  createErrorResponse,
  ScanResponse,
} from '@/lib/validation';
import { createAndStoreReport } from '@/lib/store';
import { RepoFetchError } from '@/lib/scan/github';
import { abuseGuard } from '@/lib/scan/abuse-guard';

/**
 * 从 NextRequest 中提取客户端 IP
 * 优先级：x-forwarded-for > x-real-ip > fallback 'unknown'
 * @param request NextRequest
 * @returns 客户端 IP 字符串，缺失时返回 'unknown'
 */
function getClientIp(request: NextRequest): string {
  // 1. 检查 x-forwarded-for（Vercel/代理场景）
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // 取第一个 IP（客户端 IP）
    return forwardedFor.split(',')[0].trim();
  }

  // 2. 检查 x-real-ip
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }

  // 3. fallback（按 spec 要求，不抛错）
  return 'unknown';
}

/**
 * POST /api/scan
 *
 * Initiates a new security scan for a repository.
 *
 * Request body:
 * {
 *   "repoUrl": "https://github.com/org/repo"
 * }
 *
 * Response 200:
 * {
 *   "scanId": "scan_xxx",
 *   "status": "completed"
 * }
 *
 * Response 400:
 * {
 *   "error": "invalid_repo_url",
 *   "message": "Detailed error message"
 * }
 *
 * Response 429 (V0.2.3.5):
 * {
 *   "error": "rate_limited",
 *   "message": "Scan rate limit exceeded, please retry later"
 * }
 */
export async function POST(request: NextRequest) {
  // 标志位：是否已获取并发槽
  // 用于确保 finally 只对已加计数的请求执行释放
  let acquired = false;

  try {
    // V0.2.3.5 P2: 限流前移到 JSON 解析前
    // 避免无效 JSON 洪泛绕过限流统计
    const ip = getClientIp(request);
    const rateLimitResult = abuseGuard.checkRateLimit(ip);
    if (!rateLimitResult.allowed) {
      return createErrorResponse(
        { error: 'rate_limited', message: 'Scan rate limit exceeded, please retry later' },
        429,
      );
    }

    // Parse request body
    const body: unknown = await request.json();

    // Validate request
    const validation = validateScanRequest(body);
    if (!validation.valid) {
      return createErrorResponse(validation.error!, 400);
    }

    const { repoUrl } = body as { repoUrl: string };

    // 2. 尝试获取并发槽（未通过直接返回，未加计数）
    const acquiredSlot = abuseGuard.tryAcquireSlot();
    if (!acquiredSlot) {
      return createErrorResponse(
        { error: 'rate_limited', message: 'Too many concurrent scans, please retry later' },
        429,
      );
    }

    // 3. ✅ 只有通过两层检查后，才设置标志位
    acquired = true;

    const report = await createAndStoreReport(repoUrl);
    const response: ScanResponse = {
      scanId: report.id,
      status: 'completed',
    };

    return createSuccessResponse(response, 200);
  } catch (error) {
    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return createErrorResponse(
        {
          error: 'invalid_json',
          message: 'Request body must be valid JSON',
        },
        400
      );
    }

    if (error instanceof RepoFetchError) {
      const statusCode =
        error.code === "repo_not_found" || error.code === "npm_package_not_found"
          ? 404
          : error.code === "repo_private" || error.code === "repo_access_limited"
            ? 403
            : error.code === "github_rate_limited"
              ? 429
              : error.code === "invalid_package_input"
                ? 400
                : error.code === "npm_tarball_too_large" ||
                    error.code === "npm_extracted_files_exceeded" ||
                    error.code === "npm_extracted_file_too_large"
                  ? 413
                  : error.code === "scan_timeout"
                    ? 408
                    : 502;
      return createErrorResponse(
        {
          error: error.code,
          message: error.message,
        },
        statusCode
      );
    }

    // Vercel 未配置数据库时给出明确提示
    const message =
      error instanceof Error && 
      (error.message.includes('POSTGRES_URL') || error.message.includes('DATABASE_URL') || error.message.includes('Storage not configured'))
        ? error.message
        : 'An unexpected error occurred. Please try again.';
    console.error('Unexpected error in POST /api/scan:', error);
    console.error('Environment check:', {
      VERCEL: process.env.VERCEL,
      HAS_POSTGRES_URL: !!process.env.POSTGRES_URL,
      HAS_DATABASE_URL: !!process.env.DATABASE_URL,
      POSTGRES_URL_LENGTH: process.env.POSTGRES_URL?.length || 0,
      DATABASE_URL_LENGTH: process.env.DATABASE_URL?.length || 0,
    });
    return createErrorResponse(
      {
        error: 'internal_error',
        message,
      },
      500
    );
  } finally {
    // V0.2.3.5: ✅ 只对已获取槽的请求释放
    // 防止未加计数的请求（被限流拒绝）也执行释放
    if (acquired) {
      abuseGuard.releaseSlot();
    }
  }
}

/**
 * GET /api/scan
 *
 * Returns method not allowed for collection endpoint
 */
export async function GET() {
  return createErrorResponse(
    {
      error: 'method_not_allowed',
      message: 'GET is not supported on this endpoint. Use POST to create a scan.',
    },
    405
  );
}
