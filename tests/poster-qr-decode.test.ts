import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PNG } from "pngjs";
import jsQR from "jsqr";
import { renderPoster } from "@/lib/poster";

type SmokeModel = {
  qrUrl: string;
  [key: string]: unknown;
};

type PenNode = {
  id: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  children?: PenNode[];
};

type PenDoc = {
  children: PenNode[];
};

function findNodeById(nodes: PenNode[], id: string): PenNode | undefined {
  const stack = [...nodes];
  while (stack.length) {
    const node = stack.pop();
    if (!node) continue;
    if (node.id === id) return node;
    if (node.children?.length) stack.push(...node.children);
  }
  return undefined;
}

describe("poster qr decode", () => {
  it("decodes QR payload from rendered poster and matches model qrUrl", async () => {
    const root = path.resolve(__dirname, "..");
    const modelPath = path.join(root, "tests/fixtures/poster/smoke-render-model.json");
    const templatePath = path.join(root, "assets/poster/template/scan-poster.pen");

    const model = JSON.parse(fs.readFileSync(modelPath, "utf8")) as SmokeModel;
    const pen = JSON.parse(fs.readFileSync(templatePath, "utf8")) as PenDoc;

    const qrRect = findNodeById(pen.children, "2VtpU");
    expect(qrRect).toBeTruthy();

    const result = await renderPoster(model as never, {}, { templatePath });
    expect(result.success, `render failed: ${result.error}`).toBe(true);
    expect(result.buffer).toBeTruthy();

    const png = PNG.sync.read(result.buffer!);

    const x = Math.max(0, Math.floor(qrRect?.x ?? 0));
    const y = Math.max(0, Math.floor(qrRect?.y ?? 0));
    const w = Math.min(png.width - x, Math.floor(qrRect?.width ?? 0));
    const h = Math.min(png.height - y, Math.floor(qrRect?.height ?? 0));

    expect(w).toBeGreaterThan(0);
    expect(h).toBeGreaterThan(0);

    const qrCrop = new PNG({ width: w, height: h });
    PNG.bitblt(png, qrCrop, x, y, w, h, 0, 0);

    const data = new Uint8ClampedArray(qrCrop.data.buffer, qrCrop.data.byteOffset, qrCrop.data.byteLength);
    const decoded = jsQR(data, w, h, {
      inversionAttempts: "attemptBoth",
    });

    expect(decoded, "failed to decode qr from rendered poster").toBeTruthy();
    expect(decoded?.data).toBe(String(model.qrUrl));
  }, 30_000);
});
