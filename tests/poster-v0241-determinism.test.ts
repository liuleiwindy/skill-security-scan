import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { renderPoster } from "@/lib/poster";

type PosterModelFixture = Record<string, unknown>;

function sha256(data: Buffer): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

describe("v0.2.4.1 render determinism", () => {
  it("returns identical image hash for identical input", async () => {
    const root = path.resolve(__dirname, "..");
    const templatePath = path.join(root, "assets/poster/template/scan-poster.pen");
    const fixturePath = path.join(
      root,
      "tests/fixtures/poster/smoke-render-model.json"
    );

    const model = JSON.parse(
      fs.readFileSync(fixturePath, "utf8")
    ) as PosterModelFixture;

    const [r1, r2] = await Promise.all([
      renderPoster(model as never, {}, { templatePath }),
      renderPoster(model as never, {}, { templatePath }),
    ]);

    expect(r1.success, `first render failed: ${r1.error}`).toBe(true);
    expect(r2.success, `second render failed: ${r2.error}`).toBe(true);
    expect(r1.buffer).toBeTruthy();
    expect(r2.buffer).toBeTruthy();

    const h1 = sha256(r1.buffer!);
    const h2 = sha256(r2.buffer!);
    expect(h1).toBe(h2);
  }, 90_000);
});
