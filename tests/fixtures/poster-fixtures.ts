/**
 * Poster Test Fixtures for V0.2.4.2
 *
 * This module provides stable test fixtures for poster page integration tests.
 * These fixtures cover different grade baselines and edge cases for testing
 * `/scan/poster/[id]` page and `/api/scan/:id/poster/image` endpoint.
 *
 * @module tests/fixtures/poster-fixtures
 */

/**
 * Poster test fixture interface
 *
 * Defines the structure for test fixtures used in poster page tests.
 * Each fixture represents a scan with expected behavior and output.
 */
export interface PosterTestFixture {
  /** Unique identifier for the fixture scan */
  id: string;

  /** Human-readable description of the fixture's purpose */
  description: string;

  /** Expected grade for this scan (A, B, C, or D) */
  expectedGrade: "A" | "B" | "C" | "D" | undefined;

  /** Expected score for this scan */
  expectedScore: number | undefined;

  /** Expected QR code URL encoded in the poster */
  expectedQrUrl: string | undefined;

  /** Whether this fixture should resolve successfully (true) or return 404 (false) */
  shouldSucceed: boolean;

  /** Optional: Expected HTTP status code */
  expectedStatus?: number;

  /** Optional: Expected content type for the poster image */
  expectedContentType?: string;
}

/**
 * Grade range configuration
 *
 * This mapping defines score ranges for each risk grade based on
 * the configuration in config/risk-grade.config.json.
 */
const GRADE_MAPPING: Record<string, { min: number; max: number }> = {
  A: { min: 80, max: 100 },
  B: { min: 60, max: 79 },
  C: { min: 40, max: 59 },
  D: { min: 0, max: 39 },
};

/**
 * Test fixture collection
 *
 * A complete set of fixtures covering all required test scenarios:
 * - B grade baseline (medium risk mix)
 * - A grade high score baseline
 * - D grade edge baseline
 * - 404 not found case
 */
export const POSTER_FIXTURES: PosterTestFixture[] = [
  {
    id: "scan_fixture_v0240_b69",
    description: "B grade baseline, medium risk mix",
    expectedGrade: "B",
    expectedScore: 69,
    expectedQrUrl: "/scan/report/scan_fixture_v0240_b69",
    shouldSucceed: true,
    expectedStatus: 200,
    expectedContentType: "image/png",
  },
  {
    id: "scan_fixture_v0240_a90",
    description: "A grade high score baseline",
    expectedGrade: "A",
    expectedScore: 90,
    expectedQrUrl: "/scan/report/scan_fixture_v0240_a90",
    shouldSucceed: true,
    expectedStatus: 200,
    expectedContentType: "image/png",
  },
  {
    id: "scan_edge_d0",
    description: "D grade edge baseline",
    expectedGrade: "D",
    expectedScore: 0,
    expectedQrUrl: "/scan/report/scan_edge_d0",
    shouldSucceed: true,
    expectedStatus: 200,
    expectedContentType: "image/png",
  },
  {
    id: "scan_not_found_case",
    description: "Non-existent id for 404 path",
    expectedGrade: undefined,
    expectedScore: undefined,
    expectedQrUrl: undefined,
    shouldSucceed: false,
    expectedStatus: 404,
    expectedContentType: undefined,
  },
];

/**
 * Fixture environment configuration
 *
 * Defines the environment for running fixture validation tests.
 * This includes base URL, timeout settings, and other runtime parameters.
 */
export const FIXTURE_ENVIRONMENT = {
  /**
   * Base URL for API requests
   * Defaults to localhost for development, can be overridden with env variable
   */
  baseUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000",

  /**
   * Request timeout in milliseconds
   * 10 seconds is reasonable for poster image generation
   */
  timeout: 10000,

  /**
   * Number of retries for failed requests
   */
  maxRetries: 2,

  /**
   * Delay between retries in milliseconds
   */
  retryDelay: 1000,
};

/**
 * Get all valid fixtures (those that should succeed)
 *
 * @returns Array of fixtures that should resolve successfully
 */
export function getValidFixtures(): PosterTestFixture[] {
  return POSTER_FIXTURES.filter((f) => f.shouldSucceed);
}

/**
 * Get a specific fixture by ID
 *
 * @param id - The fixture ID to look up
 * @returns The fixture if found, undefined otherwise
 */
export function getFixtureById(id: string): PosterTestFixture | undefined {
  return POSTER_FIXTURES.find((f) => f.id === id);
}

/**
 * Get the 404 test fixture
 *
 * @returns The fixture that should return a 404 error
 * @throws Error if no 404 fixture is defined
 */
export function get404Fixture(): PosterTestFixture {
  const fixture = POSTER_FIXTURES.find((f) => !f.shouldSucceed);
  if (!fixture) {
    throw new Error("No 404 fixture defined in POSTER_FIXTURES");
  }
  return fixture;
}

/**
 * Get all fixtures for a specific grade
 *
 * @param grade - The grade to filter by (A, B, C, or D)
 * @returns Array of fixtures matching the specified grade
 */
export function getFixturesByGrade(grade: "A" | "B" | "C" | "D"): PosterTestFixture[] {
  return POSTER_FIXTURES.filter((f) => f.expectedGrade === grade);
}

/**
 * Get the API endpoint URL for a poster image
 *
 * @param fixtureId - The ID of the fixture/scan
 * @returns Full URL to the poster image API endpoint
 */
export function getFixtureImageUrl(fixtureId: string): string {
  return `${FIXTURE_ENVIRONMENT.baseUrl}/api/scan/${fixtureId}/poster/image`;
}

/**
 * Get the report URL for a fixture
 *
 * @param fixtureId - The ID of the fixture/scan
 * @returns URL to the report page (used for QR code)
 */
export function getFixtureReportUrl(fixtureId: string): string {
  return `/scan/report/${fixtureId}`;
}

/**
 * Validate that a score matches the expected grade
 *
 * @param score - The score to validate
 * @param expectedGrade - The expected grade
 * @returns true if the score falls within the grade's range
 */
export function validateScoreForGrade(
  score: number,
  expectedGrade: "A" | "B" | "C" | "D"
): boolean {
  const range = GRADE_MAPPING[expectedGrade];
  if (!range) {
    return false;
  }
  return score >= range.min && score <= range.max;
}

/**
 * Get fixtures that need backend data support
 *
 * @returns Array of fixture IDs that require actual scan data in the backend
 */
export function getFixturesNeedingBackendData(): string[] {
  return getValidFixtures().map((f) => f.id);
}

/**
 * Calculate the expected filename for a saved poster
 *
 * Follows the naming convention from V0.2.4.2 spec:
 * - lowercase
 * - replace non [a-z0-9-_] chars with `-`
 * - max 32 chars
 *
 * @param fixtureId - The ID of the fixture/scan
 * @returns Sanitized filename without extension
 */
export function getExpectedPosterFileName(fixtureId: string): string {
  // Convert to lowercase
  let filename = fixtureId.toLowerCase();

  // Replace non-alphanumeric and non-hyphen/underscore chars with hyphen
  // Note: The spec mentions [a-z0-9-_] which means alphanumeric plus hyphen/underscore
  filename = filename.replace(/[^a-z0-9_\-]/g, "-");

  // Remove consecutive hyphens
  filename = filename.replace(/-+/g, "-");

  // Remove leading/trailing hyphens
  filename = filename.replace(/^-+|-+$/g, "");

  // Truncate to max 32 chars
  filename = filename.slice(0, 32);

  return filename;
}

/**
 * Check if a fixture is valid according to its expectations
 *
 * Validates that the fixture's expected properties are consistent:
 * - Score should be within grade range
 * - Grade D fixtures should have score < 40
 * - Grade A fixtures should have score >= 80
 *
 * @param fixture - The fixture to validate
 * @returns true if the fixture is internally consistent
 */
export function isFixtureValid(fixture: PosterTestFixture): boolean {
  if (!fixture.shouldSucceed) {
    // 404 fixture doesn't need score/grade validation
    return true;
  }

  if (fixture.expectedGrade && fixture.expectedScore !== undefined) {
    return validateScoreForGrade(fixture.expectedScore, fixture.expectedGrade);
  }

  return false;
}

/**
 * Validate all fixtures for internal consistency
 *
 * @throws Error if any fixture is invalid
 */
export function validateAllFixtures(): void {
  for (const fixture of POSTER_FIXTURES) {
    if (!isFixtureValid(fixture)) {
      throw new Error(
        `Invalid fixture: ${fixture.id} - score ${fixture.expectedScore} does not match grade ${fixture.expectedGrade}`
      );
    }
  }
}

// Validate all fixtures on module load to catch errors early
validateAllFixtures();
