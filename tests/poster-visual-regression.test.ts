import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
import { renderPoster } from "@/lib/poster";

type Case = {
  name: string;
  baseline: string;
  model: Record<string, unknown>;
  options: Record<string, unknown>;
  maxDiffRatio: number;
};

function ensureDir(p: string): void {
  fs.mkdirSync(p, { recursive: true });
}

type Region = {
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  maxDiffRatio: number;
};

const KEY_REGIONS: Region[] = [
  { name: "header", x: 80, y: 60, w: 530, h: 90, maxDiffRatio: 0.03 },
  { name: "repo", x: 60, y: 170, w: 560, h: 120, maxDiffRatio: 0.01 },
  { name: "ringGrade", x: 40, y: 300, w: 380, h: 380, maxDiffRatio: 0.005 },
  { name: "riskPanel", x: 420, y: 320, w: 210, h: 330, maxDiffRatio: 0.02 },
  { name: "cta", x: 120, y: 680, w: 450, h: 60, maxDiffRatio: 0.005 },
  { name: "qr", x: 230, y: 720, w: 220, h: 250, maxDiffRatio: 0.005 },
];

function cropRegion(src: PNG, region: Region): PNG {
  const out = new PNG({ width: region.w, height: region.h });
  PNG.bitblt(src, out, region.x, region.y, region.w, region.h, 0, 0);
  return out;
}

describe("poster visual regression", () => {
  const root = path.resolve(__dirname, "..");
  const casesPath = path.join(root, "tests/fixtures/poster/expected/visual-cases.json");
  const outDir = path.join(root, "tmp/visual-diff");

  const cases = JSON.parse(fs.readFileSync(casesPath, "utf8")) as Case[];

  for (const c of cases) {
    it(`matches baseline: ${c.name}`, async () => {
      const baselinePath = path.join(root, c.baseline);
      expect(fs.existsSync(baselinePath), `baseline missing: ${baselinePath}`).toBe(true);

      const result = await renderPoster(c.model as never, c.options as never, {
        templatePath: path.join(root, "assets/poster/template/scan-poster.pen"),
      });

      expect(result.success, `render failed: ${result.error}`).toBe(true);
      expect(result.buffer).toBeTruthy();

      const actual = PNG.sync.read(result.buffer!);
      const expected = PNG.sync.read(fs.readFileSync(baselinePath));

      expect(actual.width).toBe(expected.width);
      expect(actual.height).toBe(expected.height);

      const diff = new PNG({ width: expected.width, height: expected.height });
      const diffPixels = pixelmatch(
        expected.data,
        actual.data,
        diff.data,
        expected.width,
        expected.height,
        {
          threshold: 0.15,
          includeAA: false,
        }
      );

      const totalPixels = expected.width * expected.height;
      const diffRatio = diffPixels / totalPixels;
      const regionResults: Array<{ name: string; diffRatio: number; maxDiffRatio: number }> = [];

      for (const region of KEY_REGIONS) {
        const expectedRegion = cropRegion(expected, region);
        const actualRegion = cropRegion(actual, region);
        const regionDiff = new PNG({ width: region.w, height: region.h });
        const regionDiffPixels = pixelmatch(
          expectedRegion.data,
          actualRegion.data,
          regionDiff.data,
          region.w,
          region.h,
          {
            threshold: 0.15,
            includeAA: false,
          }
        );
        const regionRatio = regionDiffPixels / (region.w * region.h);
        regionResults.push({
          name: region.name,
          diffRatio: regionRatio,
          maxDiffRatio: region.maxDiffRatio,
        });
      }

      const shouldWriteOutput =
        process.env.POSTER_VISUAL_WRITE_OUTPUT === "1" ||
        diffRatio > c.maxDiffRatio ||
        regionResults.some((r) => r.diffRatio > r.maxDiffRatio);

      if (shouldWriteOutput) {
        ensureDir(outDir);
        fs.writeFileSync(path.join(outDir, `${c.name}.actual.png`), PNG.sync.write(actual));
        fs.writeFileSync(path.join(outDir, `${c.name}.expected.png`), PNG.sync.write(expected));
        fs.writeFileSync(path.join(outDir, `${c.name}.diff.png`), PNG.sync.write(diff));
      }

      expect(diffRatio).toBeLessThanOrEqual(c.maxDiffRatio);
      for (const region of regionResults) {
        expect(
          region.diffRatio,
          `region diff too high [${c.name}:${region.name}] expected <= ${region.maxDiffRatio}, got ${region.diffRatio}`
        ).toBeLessThanOrEqual(region.maxDiffRatio);
      }
    }, 60_000);
  }
});
