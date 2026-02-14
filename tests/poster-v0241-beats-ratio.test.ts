import { describe, expect, it } from "vitest";
import {
  createPosterModelFromScanReport,
  deriveDeterministicBeatsRatio,
  getGradeForScore,
  loadGradeConfig,
} from "@/lib/poster";

function parsePercent(value: string): number {
  return Number(value.replace("%", ""));
}

describe("v0.2.4.1 deterministic beatsRatio", () => {
  it("is deterministic for the same scan id/score/grade", () => {
    const a = deriveDeterministicBeatsRatio("scan_same", 90, "A");
    const b = deriveDeterministicBeatsRatio("scan_same", 90, "A");
    expect(a).toBe(b);
  });

  it("falls into grade range buckets", () => {
    const cases: Array<{ grade: "A" | "B" | "C" | "D"; min: number; max: number }> = [
      { grade: "A", min: 85, max: 99 },
      { grade: "B", min: 65, max: 84 },
      { grade: "C", min: 35, max: 64 },
      { grade: "D", min: 5, max: 34 },
    ];

    for (const c of cases) {
      const value = parsePercent(deriveDeterministicBeatsRatio(`scan_${c.grade}`, 70, c.grade));
      expect(value).toBeGreaterThanOrEqual(c.min);
      expect(value).toBeLessThanOrEqual(c.max);
    }
  });

  it("integrates into poster model mapping using score-derived grade", () => {
    const config = loadGradeConfig();
    const report = {
      id: "scan_map_1",
      repoUrl: "https://github.com/octocat/Hello-World",
      score: 90,
      summary: { critical: 0, high: 1, medium: 0, low: 0 },
      engineVersion: "v0.2.4",
      scannedAt: "2026-02-14 14:32 UTC",
    };

    const model = createPosterModelFromScanReport(report as never);
    const expectedGrade = getGradeForScore(report.score, config);
    const beats = parsePercent(model.beatsRatio);

    expect(model.beatsRatio).toMatch(/^\d+%$/);
    expect(expectedGrade).toBe("A");
    expect(beats).toBeGreaterThanOrEqual(85);
    expect(beats).toBeLessThanOrEqual(99);
  });
});
