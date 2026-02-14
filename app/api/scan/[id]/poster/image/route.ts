/**
 * Poster Image API Endpoint
 *
 * GET /api/scan/:id/poster/image
 *
 * Renders and returns a PNG image of the security scan poster.
 * V0.2.4.1 - Data and API Integration
 *
 * Response types:
 * - 200: PNG image (Content-Type: image/png)
 * - 400: Invalid query parameters
 * - 404: Scan not found
 * - 500: Render failure
 */

import { NextRequest } from 'next/server';
import { validateScanId } from '@/lib/validation';
import { getStoredReport } from '@/lib/store';
import { renderPoster } from '@/lib/poster/render-poster';
import {
  type RenderOptions,
  getGradeForScore,
  getColorForGrade,
  loadGradeConfig,
} from '@/lib/poster/render-options';
import { createPosterModelFromScanReport } from '@/lib/poster/model-mapper';
import type { PosterRenderModel } from '@/lib/poster/poster-types';
import {
  parsePosterQueryOverrides,
  generateRequestId,
  type ImageQueryOverrides,
  type PosterApiError,
} from '@/lib/poster/query-parser';

// ============================================================================
// Helpers
// ============================================================================

/**
 * Create a poster API error response
 */
function createPosterErrorResponse(
  code: string,
  message: string,
  requestId: string,
  status: number
): Response {
  const errorBody: PosterApiError = { code, message, requestId };
  return Response.json(errorBody, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

/**
 * Convert ImageQueryOverrides to RenderOptions.
 *
 * When score is overridden, this also:
 * - Updates ringPercent to match the score
 * - Recalculates grade and theme color for progressBarColor
 */
function queryOverridesToRenderOptions(
  overrides: ImageQueryOverrides
): RenderOptions {
  const options: RenderOptions = {};

  // If score is provided, derive ringPercent and theme color from it
  if (overrides.score !== undefined) {
    const score = overrides.score;
    const gradeConfig = loadGradeConfig();
    const grade = getGradeForScore(score, gradeConfig);
    const color = getColorForGrade(grade, gradeConfig);

    // Set ringPercent based on score (unless explicitly overridden)
    options.ringPercent = overrides.ringPercent ?? score;

    // Set progressBarColor based on score-derived grade (unless explicitly overridden)
    options.progressBarColor = overrides.progressBarColor ?? color;

    // Set score text override
    options.textOverrides = {
      QmvPl: `SCORE\\n${Math.round(score)}/100`,
    };
  } else {
    // No score override, use individual overrides if provided
    if (overrides.ringPercent !== undefined) {
      options.ringPercent = overrides.ringPercent;
    }
    if (overrides.progressBarColor !== undefined) {
      options.progressBarColor = overrides.progressBarColor;
    }
  }

  // Apply other text overrides
  if (overrides.beatsRatio !== undefined) {
    options.textOverrides = {
      ...options.textOverrides,
      nrEJR: overrides.beatsRatio,
    };
  }

  if (overrides.proof !== undefined) {
    options.textOverrides = {
      ...options.textOverrides,
      pWzXq: overrides.proof,
    };
  }

  if (overrides.short !== undefined) {
    options.textOverrides = {
      ...options.textOverrides,
      A56m7: overrides.short,
    };
  }

  return options;
}

// ============================================================================
// Route Handler
// ============================================================================

/**
 * GET /api/scan/:id/poster/image
 *
 * Renders and returns a PNG poster image for a security scan.
 *
 * Query parameters (allowlist per spec):
 * - score: Override the score display (0-100)
 * - beatsRatio: Override the beats ratio text
 * - proof: Override the proof text
 * - short: Override the short brand text
 * - ringPercent: Override progress ring percentage (0-100)
 * - progressBarColor: Override progress bar color (hex format #xxxxxx)
 *
 * Success response:
 * - Status: 200
 * - Content-Type: image/png
 * - Cache-Control: public, max-age=60, s-maxage=300
 * - Body: PNG image bytes
 *
 * Error responses (all with Cache-Control: no-store):
 * - 400 POSTER_INVALID_QUERY: Unsupported or invalid query parameter
 * - 404 SCAN_NOT_FOUND: Scan ID does not exist
 * - 500 POSTER_RENDER_FAILED: Rendering failed
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const requestId = generateRequestId();

  try {
    const { id } = await params;

    // Validate scan ID format
    const validation = validateScanId(id);
    if (!validation.valid) {
      return createPosterErrorResponse(
        'POSTER_INVALID_QUERY',
        validation.error?.message ?? 'Invalid scan ID format',
        requestId,
        400
      );
    }

    // Parse and validate query parameters using query-parser
    const parseResult = parsePosterQueryOverrides(request);
    if (!parseResult.ok) {
      return createPosterErrorResponse(
        parseResult.error.code,
        parseResult.error.message,
        requestId,
        400
      );
    }

    // Fetch the stored report
    const report = await getStoredReport(id);
    if (!report) {
      return createPosterErrorResponse(
        'SCAN_NOT_FOUND',
        `No scan found with ID: ${id}`,
        requestId,
        404
      );
    }

    // Map report to poster model
    const posterModel: PosterRenderModel =
      createPosterModelFromScanReport(report);
    const protocol = request.headers.get("x-forwarded-proto") || "https";
    const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
    if (host) {
      posterModel.qrUrl = `${protocol}://${host}/scan/report/${id}`;
    } else if (typeof posterModel.qrUrl === "string" && posterModel.qrUrl.startsWith("/")) {
      posterModel.qrUrl = `https://localhost:3000${posterModel.qrUrl}`;
    }

    // Convert query overrides to render options (with score consistency)
    const renderOptions = queryOverridesToRenderOptions(parseResult.overrides);

    // Render the poster
    const result = await renderPoster(posterModel, renderOptions);

    if (!result.success || !result.buffer) {
      console.error(
        `[poster] Render failed for scan ${id}:`,
        result.error
      );
      return createPosterErrorResponse(
        'POSTER_RENDER_FAILED',
        result.error ?? 'Failed to render poster image',
        requestId,
        500
      );
    }

    // Return PNG with cache headers per spec 4.4
    return new Response(new Uint8Array(result.buffer), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=60, s-maxage=300',
      },
    });
  } catch (error) {
    console.error('[poster] Unexpected error in poster image endpoint:', error);
    return createPosterErrorResponse(
      'POSTER_RENDER_FAILED',
      error instanceof Error ? error.message : 'An unexpected error occurred',
      requestId,
      500
    );
  }
}
