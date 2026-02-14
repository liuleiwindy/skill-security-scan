import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

type VisualCase = {
  name: string;
  model: { id?: string };
};

describe("v0.2.4.2 fixture readiness", () => {
  it("has required baseline fixture ids for poster page integration", () => {
    const root = path.resolve(__dirname, "..");
    const visualCasesPath = path.join(
      root,
      "tests/fixtures/poster/expected/visual-cases.json"
    );

    expect(fs.existsSync(visualCasesPath)).toBe(true);
    const cases = JSON.parse(
      fs.readFileSync(visualCasesPath, "utf8")
    ) as VisualCase[];

    const requiredModelIds = new Set([
      "scan_fixture_v0240_b69",
      "scan_fixture_v0240_a90",
      "scan_edge_d0",
    ]);

    const modelIds = new Set(cases.map((c) => c.model?.id).filter(Boolean));
    for (const requiredId of requiredModelIds) {
      expect(modelIds.has(requiredId), `missing fixture id: ${requiredId}`).toBe(
        true
      );
    }
  });
});
