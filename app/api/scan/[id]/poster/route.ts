import { NextRequest } from 'next/server';
import {
  validateScanId,
  createSuccessResponse,
  createErrorResponse,
  PosterResponse,
  ScanReport,
} from '@/lib/validation';
import { getStoredReport } from '@/lib/store';

/**
 * GET /api/scan/:id/poster
 *
 * Retrieves poster data for social sharing.
 *
 * Response 200:
 * {
 *   "id": "scan_xxx",
 *   "headline": "Security Pass",
 *   "score": 91,
 *   "grade": "A",
 *   "status": "safe",
 *   "qrUrl": "https://domain.com/scan/report/scan_xxx",
 *   "brandText": "BRAND_TBD"
 * }
 *
 * Response 404:
 * {
 *   "error": "scan_not_found",
 *   "message": "Detailed error message"
 * }
 */
export async function GET(
  request: NextRequest,
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

    // Generate poster data from report
    const posterData = generatePosterData(report, request);

    return createSuccessResponse(posterData, 200);
  } catch (error) {
    console.error('Unexpected error in GET /api/scan/:id/poster:', error);
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
 * Generate poster data from scan report
 */
function generatePosterData(
  report: ScanReport,
  request: NextRequest
): PosterResponse {
  // Generate headline based on grade/status
  const headline = getHeadline(report.grade, report.status);

  // Generate report URL for QR code
  const protocol = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost:3000';
  const reportUrl = `${protocol}://${host}/scan/report/${report.id}`;

  return {
    id: report.id,
    headline,
    score: report.score,
    grade: report.grade,
    status: report.status,
    qrUrl: reportUrl,
    brandText: 'BRAND_TBD', // Will be updated with actual brand
  };
}

/**
 * Generate poster headline based on grade and status
 */
function getHeadline(
  grade: 'A' | 'B' | 'C',
  status: 'safe' | 'needs_review' | 'risky'
): string {
  if (status === 'safe') {
    return 'Security Pass';
  }
  if (status === 'needs_review') {
    return 'Needs Review';
  }
  if (status === 'risky') {
    return 'Security Alert';
  }
  return 'Security Scan';
}

/**
 * POST /api/scan/:id/poster
 *
 * Not implemented - use GET to retrieve poster data
 */
export async function POST() {
  return createErrorResponse(
    {
      error: 'method_not_allowed',
      message: 'POST is not supported on this endpoint. Use GET to retrieve poster data.',
    },
    405
  );
}
