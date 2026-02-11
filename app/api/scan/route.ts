import { NextRequest } from 'next/server';
import {
  validateScanRequest,
  createSuccessResponse,
  createErrorResponse,
  ScanResponse,
} from '@/lib/validation';
import { createAndStoreReport } from '@/lib/store';
import { RepoFetchError } from '@/lib/scan/github';

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
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: unknown = await request.json();

    // Validate request
    const validation = validateScanRequest(body);
    if (!validation.valid) {
      return createErrorResponse(validation.error!, 400);
    }

    const { repoUrl } = body as { repoUrl: string };
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
        error.code === "repo_not_found"
          ? 404
          : error.code === "repo_private" || error.code === "repo_access_limited"
            ? 403
            : error.code === "github_rate_limited"
              ? 429
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
