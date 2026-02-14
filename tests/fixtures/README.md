# Poster Test Fixtures

This directory contains test fixtures for poster page integration tests in V0.2.4.2.

## Files

### `poster-fixtures.ts`

Main fixture definitions and helper functions.

**Key Exports:**

- `POSTER_FIXTURES` - Array of all test fixtures
- `getValidFixtures()` - Get fixtures that should succeed
- `getFixtureById(id)` - Get a specific fixture
- `get404Fixture()` - Get the 404 test fixture
- `getFixturesByGrade(grade)` - Filter fixtures by grade
- `getFixtureImageUrl(fixtureId)` - Get API endpoint URL for a fixture
- `getFixtureReportUrl(fixtureId)` - Get report URL for a fixture
- `validateScoreForGrade(score, grade)` - Validate score matches grade range
- `getFixturesNeedingBackendData()` - Get fixtures requiring backend data
- `getExpectedPosterFileName(fixtureId)` - Calculate expected filename
- `isFixtureValid(fixture)` - Check if fixture is internally consistent
- `validateAllFixtures()` - Validate all fixtures (throws on error)

**Defined Fixtures:**

1. `scan_fixture_v0240_b69` - B grade baseline (score: 69)
2. `scan_fixture_v0240_a90` - A grade high score (score: 90)
3. `scan_edge_d0` - D grade edge case (score: 0)
4. `scan_not_found_case` - Non-existent ID (should return 404)

### `validate-fixtures.ts`

Fixture validation script for checking fixture data and API endpoints.

**Key Functions:**

- `validateFixture(fixture)` - Validate a single fixture
- `validateAll()` - Validate all fixtures
- `printSummary(results)` - Print validation summary
- `validateFixtures()` - Main validation function

**Validation Checks:**

For successful fixtures:
- Fixture data integrity (score matches grade range)
- Fixture ID is non-empty
- HTTP status is 200
- Content type is `image/png`
- Response body is not empty
- Expected grade is defined
- Expected score is defined
- Expected QR URL is defined
- QR URL format is correct

For 404 fixtures:
- Returns 404 status

## Usage

### Running Validation

To validate all fixtures:

```bash
npx tsx tests/fixtures/validate-fixtures.ts
```

Or using Node (if compiled):

```bash
node dist/tests/fixtures/validate-fixtures.js
```

### Using Fixtures in Tests

```typescript
import {
  POSTER_FIXTURES,
  getValidFixtures,
  getFixtureById,
  getFixtureImageUrl,
  getExpectedPosterFileName,
} from "@/fixtures/poster-fixtures";

// Get all fixtures
for (const fixture of POSTER_FIXTURES) {
  console.log(fixture.id, fixture.description);
}

// Get only valid fixtures
const validFixtures = getValidFixtures();

// Get specific fixture
const fixture = getFixtureById("scan_fixture_v0240_b69");
if (fixture) {
  console.log(fixture.expectedGrade, fixture.expectedScore);
}

// Get API endpoint URL
const imageUrl = getFixtureImageUrl("scan_fixture_v0240_b69");

// Get expected poster filename
const fileName = getExpectedPosterFileName("scan_fixture_v0240_b69");
// Expected: "scan-fixture-v0240-b69.png"
```

### Environment Configuration

The fixtures use the following environment variable:

- `NEXT_PUBLIC_API_URL` - Base URL for API requests (default: `http://localhost:3000`)

Example:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3000 npx tsx tests/fixtures/validate-fixtures.ts
```

## Grade Ranges

The fixtures use the following score-to-grade mapping:

| Grade | Score Range |
|-------|-------------|
| A     | 80 - 100    |
| B     | 60 - 79      |
| C     | 40 - 59      |
| D     | 0 - 39       |

This matches the configuration in `config/risk-grade.config.json`.

## Backend Data Requirements

The following fixtures require actual scan data in the backend:

1. `scan_fixture_v0240_b69`
2. `scan_fixture_v0240_a90`
3. `scan_edge_d0`

The fixture `scan_not_found_case` does not require backend data (should return 404).

Use `getFixturesNeedingBackendData()` to programmatically get this list:

```typescript
import { getFixturesNeedingBackendData } from "@/fixtures/poster-fixtures";

const fixtureIds = getFixturesNeedingBackendData();
console.log("Fixtures needing backend data:", fixtureIds);
```

## Validation Output Example

```
Validating poster fixtures...

Validating fixture: scan_fixture_v0240_b69
✅ scan_fixture_v0240_b69: PASSED

Validating fixture: scan_fixture_v0240_a90
✅ scan_fixture_v0240_a90: PASSED

Validating fixture: scan_edge_d0
✅ scan_edge_d0: PASSED

Validating fixture: scan_not_found_case
✅ scan_not_found_case: PASSED

============================================================
Fixture Validation Summary
============================================================
Total fixtures: 4
Passed: 4 ✅
Failed: 0
============================================================

✅ All fixtures validated successfully!
```

## Notes

- Fixtures are validated on module load to catch errors early
- The `validateAllFixtures()` function throws an error if any fixture is invalid
- Use `isFixtureValid()` for non-throwing validation
- QR URL format can be either relative (`/scan/report/...`) or absolute (`https://...`)
