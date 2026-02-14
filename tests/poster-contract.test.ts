import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

type PenNode = {
  id: string;
  name?: string;
  type: string;
  children?: PenNode[];
};

type PenDoc = {
  children: PenNode[];
};

function readJson<T>(p: string): T {
  return JSON.parse(fs.readFileSync(p, "utf8")) as T;
}

function collectNodes(nodes: PenNode[]): PenNode[] {
  const out: PenNode[] = [];
  const stack = [...nodes];
  while (stack.length) {
    const node = stack.pop();
    if (!node) continue;
    out.push(node);
    if (node.children?.length) stack.push(...node.children);
  }
  return out;
}

describe("poster v0.2.4.0 contract fixtures", () => {
  const root = path.resolve(__dirname, "..");
  const penPath = path.join(root, "assets/poster/template/scan-poster.pen");
  const smokeFixturePath = path.join(root, "tests/fixtures/poster/smoke-render-model.json");
  const qrFixturePath = path.join(root, "tests/fixtures/poster/qr-test-urls.json");
  const validGradePath = path.join(root, "tests/fixtures/poster/risk-grade.config.valid.json");

  it("keeps required .pen node mappings for render injection", () => {
    const pen = readJson<PenDoc>(penPath);
    const all = collectNodes(pen.children ?? []);

    const requiredByName: Record<string, string> = {
      "progress-track": "XXSGi",
      "progress-background": "cKx8m",
      "progress-bar": "usy8R",
      qrcode: "2VtpU",
      "BEATS text": "ANZlB",
      "BEATS ratio": "nrEJR",
    };

    const requiredTextById: string[] = [
      "ECJzv",
      "pWzXq",
      "0xiLo",
      "TCqtL",
      "MnBcS",
      "QmvPl",
      "oFXT6",
      "ei9oQ",
      "Dq11K",
      "srQLh",
      "J8PGm",
      "SyUkn",
      "hNP49",
      "F8674",
      "aYAuH",
      "A56m7",
    ];

    for (const [name, expectedId] of Object.entries(requiredByName)) {
      const node = all.find((n) => n.name === name);
      expect(node, `missing node by name: ${name}`).toBeTruthy();
      expect(node?.id).toBe(expectedId);
    }

    for (const id of requiredTextById) {
      const node = all.find((n) => n.id === id);
      expect(node, `missing text node id: ${id}`).toBeTruthy();
      expect(node?.type).toBe("text");
    }
  });

  it("validates smoke render fixture has mandatory fields", () => {
    const fixture = readJson<Record<string, unknown>>(smokeFixturePath);
    const requiredKeys = [
      "id",
      "header",
      "proof",
      "repoLabel",
      "repoValue",
      "grade",
      "scoreText",
      "beatsText",
      "beatsRatio",
      "criticalLabel",
      "criticalNumber",
      "highLabel",
      "highNumber",
      "mediumLabel",
      "mediumNumber",
      "lowLabel",
      "lowNumber",
      "cta",
      "short",
      "qrUrl",
    ];

    for (const key of requiredKeys) {
      expect(typeof fixture[key]).toBe("string");
      expect((fixture[key] as string).length).toBeGreaterThan(0);
    }

    expect(fixture.grade).toMatch(/^[ABCD]$/);
    expect(String(fixture.scoreText)).toContain("\\n");
    expect(String(fixture.qrUrl)).toMatch(/^https:\/\//);
  });

  it("validates qr test url fixtures", () => {
    const fixture = readJson<Record<string, string>>(qrFixturePath);
    expect(fixture.default).toMatch(/^https:\/\//);
    expect(fixture.secondary).toMatch(/^https:\/\//);
  });

  it("validates risk-grade valid fixture coverage", () => {
    const fixture = readJson<{
      version: string;
      grades: Array<{ grade: string; min: number; max: number; color: string }>;
    }>(validGradePath);

    expect(fixture.version).toBeTruthy();
    expect(fixture.grades).toHaveLength(4);

    const gradesSorted = [...fixture.grades].sort((a, b) => a.min - b.min);
    expect(gradesSorted[0].min).toBe(0);
    expect(gradesSorted[gradesSorted.length - 1].max).toBe(100);

    for (let i = 0; i < gradesSorted.length; i += 1) {
      const g = gradesSorted[i];
      expect(g.min).toBeLessThanOrEqual(g.max);
      expect(g.color).toMatch(/^#[0-9a-fA-F]{6}$/);

      if (i > 0) {
        const prev = gradesSorted[i - 1];
        expect(g.min).toBe(prev.max + 1);
      }
    }
  });
});
