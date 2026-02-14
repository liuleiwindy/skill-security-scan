import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getColorForGrade, getGradeForScore, loadGradeConfig } from "@/lib/poster";

describe("v0.2.4.1 grade boundary mapping", () => {
  const configPath = path.resolve(
    __dirname,
    "../config/risk-grade.config.json"
  );

  it("maps score boundaries to expected grade from config", () => {
    expect(fs.existsSync(configPath)).toBe(true);
    const config = loadGradeConfig(configPath);

    const cases: Array<{ score: number; expected: "A" | "B" | "C" | "D" }> = [
      { score: 39, expected: "D" },
      { score: 40, expected: "C" },
      { score: 59, expected: "C" },
      { score: 60, expected: "B" },
      { score: 79, expected: "B" },
      { score: 80, expected: "A" },
      { score: 100, expected: "A" },
    ];

    for (const c of cases) {
      expect(getGradeForScore(c.score, config)).toBe(c.expected);
    }
  });

  it("resolves grade colors from config", () => {
    const config = loadGradeConfig(configPath);

    expect(getColorForGrade("A", config)).toBe("#7dffb1");
    expect(getColorForGrade("B", config)).toBe("#ffdd7d");
    expect(getColorForGrade("C", config)).toBe("#ffa57d");
    expect(getColorForGrade("D", config)).toBe("#ff7d7d");
  });
});
