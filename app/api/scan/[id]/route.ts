import { NextRequest } from 'next/server';
import {
  validateScanId,
  createSuccessResponse,
  createErrorResponse,
} from '@/lib/validation';
import { getStoredReport } from '@/lib/store';

/**
 * GET /api/scan/:id
 *
 * Retrieves a security scan report by ID.
 *
 * Response 200:
 * {
 *   "id": "scan_xxx",
 *   "repoUrl": "https://github.com/org/repo",
 *   "score": 91,
 *   "grade": "A",
 *   "status": "safe",
 *   "summary": { "critical": 0, "high": 0, "medium": 1, "low": 2 },
 *   "findings": [],
 *   "engineVersion": "v0.2.1",
 *   "scannedAt": "2026-02-10T16:00:00.000Z"
 * }
 *
 * Response 404:
 * {
 *   "error": "scan_not_found",
 *   "message": "Detailed error message"
 * }
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate scan ID format
    const validation = validateScanId(id);
    if (!validation.valid) {
      return createErrorResponse(validation.error!, 400);
    }

    const report = await getStoredReport(id);

    if (!report) {
      return createErrorResponse(
        {
          error: 'scan_not_found',
          message: `No scan found with ID: ${id}`,
        },
        404
      );
    }

    return createSuccessResponse(report, 200);
  } catch (error) {
    console.error('Unexpected error in GET /api/scan/:id:', error);
    return createErrorResponse(
      {
        error: 'internal_error',
        message: 'An unexpected error occurred. Please try again.',
      },
      500
    );
  }
}

/**
 * DELETE /api/scan/:id
 *
 * Not implemented in v0.2.1
 */
export async function DELETE() {
  return createErrorResponse(
    {
      error: 'method_not_allowed',
      message: 'DELETE is not supported in v0.2.1',
    },
    405
  );
}

/**
 * PATCH /api/scan/:id
 *
 * Not implemented in v0.2.1
 */
export async function PATCH() {
  return createErrorResponse(
    {
      error: 'method_not_allowed',
      message: 'PATCH is not supported in v0.2.1',
    },
    405
  );
}
