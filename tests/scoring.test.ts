import { describe, expect, it } from "vitest";
import { calculateScoreResult } from "@/lib/scan/scoring";
import type { Finding } from "@/lib/scan/rules";

function f(severity: Finding["severity"]): Finding {
  return {
    ruleId: `R_${severity}`,
    severity,
    title: severity,
    file: "a.ts",
    line: 1,
    snippet: "x",
    recommendation: "fix",
  };
}

describe("scoring", () => {
  it("returns safe A for empty findings", () => {
    const result = calculateScoreResult([]);
    expect(result.grade).toBe("A");
    expect(result.status).toBe("safe");
    expect(result.score).toBe(100);
  });

  it("returns risky when critical exists", () => {
    const result = calculateScoreResult([f("critical")]);
    expect(result.status).toBe("risky");
    expect(result.summary.critical).toBe(1);
  });

  it("keeps score in range", () => {
    const result = calculateScoreResult([
      f("critical"), f("critical"), f("critical"),
      f("high"), f("high"), f("high"), f("high"),
      f("medium"), f("medium"), f("medium"), f("medium"),
      f("low"), f("low"), f("low"), f("low"), f("low"), f("low"),
    ]);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});
