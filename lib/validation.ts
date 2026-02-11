/**
 * Validation utilities for security scan API
 */

// Error response type
export interface ApiError {
  error: string;
  message?: string;
}

// Scan request types
export interface ScanRequest {
  repoUrl: string;
}

export interface ScanResponse {
  scanId: string;
  status: string;
}

export interface ScanReport {
  id: string;
  repoUrl: string;
  score: number;
  grade: 'A' | 'B' | 'C';
  status: 'safe' | 'needs_review' | 'risky';
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  findings: Finding[];
  engineVersion: string;
  scannedAt: string;
}

export interface Finding {
  ruleId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  file: string;
  line: number;
  snippet: string;
  recommendation: string;
}

export interface PosterResponse {
  id: string;
  headline: string;
  score: number;
  grade: 'A' | 'B' | 'C';
  status: 'safe' | 'needs_review' | 'risky';
  qrUrl: string;
  brandText: string;
}

/**
 * Validate GitHub repository URL
 * Supports both HTTPS and SSH formats, including tree/blob deep links.
 */
export function validateRepoUrl(url: string): { valid: boolean; error?: string } {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'Repository URL is required' };
  }

  const trimmedUrl = url.trim();

  // GitHub HTTPS URL pattern (supports repo root and deep links under the repo)
  // Examples:
  // - https://github.com/org/repo
  // - https://github.com/org/repo/
  // - https://github.com/org/repo/tree/main/path
  // - https://github.com/org/repo/blob/main/file.ts
  const httpsPattern = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+(?:\/.*)?$/;
  // GitHub SSH pattern:
  // - git@github.com:org/repo.git
  // - git@github.com:org/repo
  const sshPattern = /^git@github\.com:[\w.-]+\/[\w.-]+(?:\.git)?$/;

  if (!httpsPattern.test(trimmedUrl) && !sshPattern.test(trimmedUrl)) {
    return {
      valid: false,
      error: 'Invalid repository URL. Must be a valid GitHub URL (e.g., https://github.com/org/repo or /tree/main/...)'
    };
  }

  // Extra path-level validation for HTTPS URLs to avoid accepting org-only paths.
  if (trimmedUrl.startsWith('https://github.com/')) {
    try {
      const { pathname } = new URL(trimmedUrl);
      const parts = pathname.split('/').filter(Boolean);
      if (parts.length < 2) {
        return {
          valid: false,
          error: 'Invalid repository URL. Include owner and repository name.'
        };
      }
    } catch {
      return {
        valid: false,
        error: 'Invalid repository URL format'
      };
    }
  }

  return { valid: true };
}

/**
 * Validate scan request body
 */
export function validateScanRequest(body: unknown): { valid: boolean; error?: ApiError } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: { error: 'invalid_request_body', message: 'Request body is required' } };
  }

  const { repoUrl } = body as ScanRequest;

  const urlValidation = validateRepoUrl(repoUrl);
  if (!urlValidation.valid) {
    return { valid: false, error: { error: 'invalid_repo_url', message: urlValidation.error } };
  }

  return { valid: true };
}

/**
 * Validate scan ID format
 */
export function validateScanId(id: string): { valid: boolean; error?: ApiError } {
  if (!id || typeof id !== 'string') {
    return { valid: false, error: { error: 'invalid_scan_id', message: 'Scan ID is required' } };
  }

  // Scan ID should start with 'scan_' prefix
  if (!id.startsWith('scan_')) {
    return { valid: false, error: { error: 'invalid_scan_id', message: 'Invalid scan ID format' } };
  }

  return { valid: true };
}

/**
 * Create a JSON response with error
 */
export function createErrorResponse(error: ApiError, status: number = 400): Response {
  return Response.json(error, { status });
}

/**
 * Create a successful JSON response
 */
export function createSuccessResponse<T>(data: T, status: number = 200): Response {
  return Response.json(data, { status });
}

/**
 * Validate that repo URL is from allowed domains
 * Currently only GitHub is supported
 */
export const ALLOWED_GIT_DOMAINS = ['github.com'] as const;

export function isAllowedDomain(url: string): boolean {
  try {
    // Handle both HTTPS and SSH URLs
    let hostname: string;

    if (url.startsWith('git@')) {
      // SSH format: git@github.com:org/repo.git
      const match = url.match(/git@([^:]+):/);
      hostname = match ? match[1] : '';
    } else {
      // HTTPS format
      const urlObj = new URL(url);
      hostname = urlObj.hostname;
    }

    return (ALLOWED_GIT_DOMAINS as readonly string[]).includes(hostname);
  } catch {
    return false;
  }
}

/**
 * Sanitize file paths to prevent directory traversal
 */
export function sanitizeFilePath(path: string): string {
  // Remove any directory traversal attempts
  return path.replace(/\.\./g, '').replace(/~/g, '');
}
