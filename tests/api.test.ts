import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { POST as createScan } from "@/app/api/scan/route";
import { GET as getScan } from "@/app/api/scan/[id]/route";
import { GET as getPoster } from "@/app/api/scan/[id]/poster/route";

describe("api routes", () => {
  it("creates scan and reads report/poster", async () => {
    const req = new Request("http://localhost/api/scan", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ repoUrl: "https://github.com/org/repo" }),
    });
    const created = await createScan(req as any);
    expect(created.status).toBe(200);
    const payload = (await created.json()) as { scanId: string };
    expect(payload.scanId.startsWith("scan_")).toBe(true);
    const reportPath = path.join(process.cwd(), "data", "reports", `${payload.scanId}.json`);
    expect(fs.existsSync(reportPath)).toBe(true);

    const reportResp = await getScan({} as any, { params: Promise.resolve({ id: payload.scanId }) });
    expect(reportResp.status).toBe(200);
    const report = (await reportResp.json()) as { id: string };
    expect(report.id).toBe(payload.scanId);

    const posterResp = await getPoster(
      new Request("http://localhost/api/scan/x/poster") as any,
      { params: Promise.resolve({ id: payload.scanId }) },
    );
    expect(posterResp.status).toBe(200);
    const poster = (await posterResp.json()) as { id: string; qrUrl: string };
    expect(poster.id).toBe(payload.scanId);
    expect(poster.qrUrl.includes(`/scan/report/${payload.scanId}`)).toBe(true);
  });

  it("rejects invalid repo url", async () => {
    const req = new Request("http://localhost/api/scan", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ repoUrl: "invalid" }),
    });
    const res = await createScan(req as any);
    expect(res.status).toBe(400);
  });
});
