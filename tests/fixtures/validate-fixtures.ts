/**
 * Fixture Validation Script for V0.2.4.2
 *
 * This script validates poster fixtures by checking:
 * - Fixture data integrity
 * - API endpoint availability (HTTP status and content type)
 * - QR code decode verification (optional, requires backend)
 *
 * @module tests/fixtures/validate-fixtures
 */

import {
  POSTER_FIXTURES,
  FIXTURE_ENVIRONMENT,
  getFixtureImageUrl,
  isFixtureValid,
} from "./poster-fixtures";

/**
 * Validation result for a single fixture
 */
export interface FixtureValidationResult {
  fixtureId: string;
  success: boolean;
  checks: {
    name: string;
    passed: boolean;
    message?: string;
  }[];
}

/**
 * Sleep utility for delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry utility for fetch requests
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries: number = FIXTURE_ENVIRONMENT.maxRetries,
  delayMs: number = FIXTURE_ENVIRONMENT.retryDelay
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(FIXTURE_ENVIRONMENT.timeout),
      });

      return response;
    } catch (error) {
      lastError = error as Error;

      // Don't retry on certain errors
      if (
        error instanceof TypeError ||
        error instanceof DOMException ||
        (error as Error).name === "AbortError"
      ) {
        break;
      }

      // Wait before retrying (except on last attempt)
      if (attempt < maxRetries) {
        await sleep(delayMs);
      }
    }
  }

  throw lastError || new Error("Request failed after retries");
}

/**
 * Validate a single fixture
 *
 * @param fixture - The fixture to validate
 * @returns Validation result with detailed checks
 */
export async function validateFixture(
  fixture: typeof POSTER_FIXTURES[0]
): Promise<FixtureValidationResult> {
  const checks: FixtureValidationResult["checks"] = [];
  let success = true;

  // Check 1: Fixture data integrity
  checks.push({
    name: "Fixture data integrity",
    passed: isFixtureValid(fixture),
    message: isFixtureValid(fixture)
      ? undefined
      : `Score ${fixture.expectedScore} does not match grade ${fixture.expectedGrade}`,
  });

  // Check 2: Fixture ID is non-empty
  checks.push({
    name: "Fixture ID is non-empty",
    passed: !!fixture.id && fixture.id.length > 0,
    message: !fixture.id || fixture.id.length === 0
      ? "Fixture ID is missing or empty"
      : undefined,
  });

  if (!fixture.shouldSucceed) {
    // For 404 fixtures, verify they return 404
    try {
      const imageUrl = getFixtureImageUrl(fixture.id);
      const response = await fetchWithRetry(imageUrl, {
        method: "HEAD",
      });

      checks.push({
        name: "Returns 404 status",
        passed: response.status === 404,
        message:
          response.status === 404
            ? undefined
            : `Expected 404, got ${response.status}`,
      });
    } catch (error) {
      checks.push({
        name: "Returns 404 status",
        passed: false,
        message: `Request failed: ${(error as Error).message}`,
      });
      success = false;
    }

    return {
      fixtureId: fixture.id,
      success: success && checks.every((c) => c.passed),
      checks,
    };
  }

  // For successful fixtures, validate API endpoint
  try {
    const imageUrl = getFixtureImageUrl(fixture.id);
    const response = await fetchWithRetry(imageUrl);

    // Check 3: HTTP status is 200
    checks.push({
      name: "HTTP status is 200",
      passed: response.status === 200,
      message:
        response.status === 200
          ? undefined
          : `Expected 200, got ${response.status}`,
    });

    if (response.status === 200) {
      // Check 4: Content type is image/png
      const contentType = response.headers.get("content-type");
      const expectedContentType = fixture.expectedContentType || "image/png";
      const isCorrectContentType = contentType?.includes(expectedContentType) ?? false;

      checks.push({
        name: "Content type is image/png",
        passed: isCorrectContentType,
        message: isCorrectContentType
          ? undefined
          : `Expected ${expectedContentType}, got ${contentType}`,
      });

      // Check 5: Response body is not empty
      try {
        const blob = await response.blob();
        checks.push({
          name: "Response body is not empty",
          passed: blob.size > 0,
          message: blob.size > 0
            ? undefined
            : `Response body is empty (size: ${blob.size} bytes)`,
        });
      } catch (error) {
        checks.push({
          name: "Response body is not empty",
          passed: false,
          message: `Failed to read response body: ${(error as Error).message}`,
        });
        success = false;
      }
    }

    // Check 6: Expected grade is defined
    checks.push({
      name: "Expected grade is defined",
      passed: !!fixture.expectedGrade,
      message: !fixture.expectedGrade
        ? "Expected grade is undefined"
        : undefined,
    });

    // Check 7: Expected score is defined
    checks.push({
      name: "Expected score is defined",
      passed: typeof fixture.expectedScore === "number",
      message: typeof fixture.expectedScore !== "number"
        ? `Expected score is not a number: ${typeof fixture.expectedScore}`
        : undefined,
    });

    // Check 8: Expected QR URL is defined
    checks.push({
      name: "Expected QR URL is defined",
      passed: !!fixture.expectedQrUrl,
      message: !fixture.expectedQrUrl
        ? "Expected QR URL is undefined"
        : undefined,
    });

    // Check 9: QR URL format is correct
    if (fixture.expectedQrUrl) {
      const isValidQrUrl =
        fixture.expectedQrUrl.startsWith("/scan/report/") ||
        fixture.expectedQrUrl.startsWith("https://");
      checks.push({
        name: "QR URL format is correct",
        passed: isValidQrUrl,
        message: isValidQrUrl
          ? undefined
          : `QR URL has unexpected format: ${fixture.expectedQrUrl}`,
      });
    }

    success = success && response.status === 200;
  } catch (error) {
    checks.push({
      name: "API endpoint is accessible",
      passed: false,
      message: `Request failed: ${(error as Error).message}`,
    });
    success = false;
  }

  return {
    fixtureId: fixture.id,
    success: success && checks.every((c) => c.passed),
    checks,
  };
}

/**
 * Validate all fixtures
 *
 * @returns Array of validation results for all fixtures
 */
export async function validateAll(): Promise<FixtureValidationResult[]> {
  console.log("Validating poster fixtures...\n");

  const results: FixtureValidationResult[] = [];

  for (const fixture of POSTER_FIXTURES) {
    console.log(`Validating fixture: ${fixture.id}`);
    const result = await validateFixture(fixture);
    results.push(result);

    // Print summary for this fixture
    const statusIcon = result.success ? "✅" : "❌";
    console.log(`${statusIcon} ${fixture.id}: ${result.success ? "PASSED" : "FAILED"}\n`);

    // Print failed checks
    const failedChecks = result.checks.filter((c) => !c.passed);
    if (failedChecks.length > 0) {
      console.log("  Failed checks:");
      for (const check of failedChecks) {
        console.log(`    - ${check.name}${check.message ? `: ${check.message}` : ""}`);
      }
    }
  }

  return results;
}

/**
 * Print validation summary
 *
 * @param results - Validation results from validateAll()
 */
export function printSummary(results: FixtureValidationResult[]): void {
  const total = results.length;
  const passed = results.filter((r) => r.success).length;
  const failed = total - passed;

  console.log("\n" + "=".repeat(60));
  console.log("Fixture Validation Summary");
  console.log("=".repeat(60));
  console.log(`Total fixtures: ${total}`);
  console.log(`Passed: ${passed} ✅`);
  console.log(`Failed: ${failed} ${failed > 0 ? "❌" : ""}`);
  console.log("=".repeat(60));

  if (failed > 0) {
    console.log("\nFailed fixtures:");
    for (const result of results) {
      if (!result.success) {
        console.log(`  - ${result.fixtureId}`);
      }
    }
  }
}

/**
 * Main validation function
 *
 * Validates all fixtures and prints summary
 */
export async function validateFixtures(): Promise<void> {
  try {
    const results = await validateAll();
    printSummary(results);

    const hasFailures = results.some((r) => !r.success);
    if (hasFailures) {
      console.log("\n⚠️  Some fixtures failed validation.");
      process.exit(1);
    } else {
      console.log("\n✅ All fixtures validated successfully!");
      process.exit(0);
    }
  } catch (error) {
    console.error("\n❌ Fixture validation failed with error:", error);
    process.exit(1);
  }
}

// Run validation if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  validateFixtures();
}
