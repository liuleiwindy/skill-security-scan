import { afterEach, describe, expect, it } from "vitest";
import { POST as createScan } from "@/app/api/scan/route";
import { GET as getPosterImage } from "@/app/api/scan/[id]/poster/image/route";
import { __resetScanRuntimeDepsForTest, __setScanRuntimeDepsForTest, getStoredReport } from "@/lib/store";
import { abuseGuard } from "@/lib/scan/abuse-guard";

const runRealRepoSmoke = process.env.POSTER_REAL_REPO_SMOKE === "1";
const describeRealRepo = runRealRepoSmoke ? describe : describe.skip;

describeRealRepo("v0.2.4.2 real repo smoke", () => {
  afterEach(() => {
    __resetScanRuntimeDepsForTest();
    abuseGuard.resetInFlight();
    abuseGuard.clearIp("test-client-ip");
  });

  it("scans a real GitHub repo and renders poster image without errors", async () => {
    // Keep real GitHub intake path, but stub external scanners for stability/speed.
    __setScanRuntimeDepsForTest({
      runSemgrep: async () => ({ findings: [] }),
      runGitleaks: async () => ({ findings: [] }),
    });

    const createReq = new Request("http://localhost/api/scan", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "test-client-ip",
      },
      body: JSON.stringify({ repoUrl: "https://github.com/octocat/Hello-World" }),
    });

    const created = await createScan(createReq as never);
    expect(created.status).toBe(200);

    const payload = (await created.json()) as { scanId: string; status: string };
    expect(payload.scanId.startsWith("scan_")).toBe(true);
    expect(payload.status).toBe("completed");

    const stored = await getStoredReport(payload.scanId);
    expect(stored).toBeTruthy();
    expect(stored?.repoUrl).toContain("github.com/octocat/Hello-World");
    expect(typeof stored?.score).toBe("number");
    expect(stored?.summary).toBeTruthy();

    const posterReq = Object.assign(
      new Request(`http://localhost/api/scan/${payload.scanId}/poster/image`),
      { nextUrl: new URL(`http://localhost/api/scan/${payload.scanId}/poster/image`) }
    ) as Request;

    const posterRes = await getPosterImage(posterReq as never, {
      params: Promise.resolve({ id: payload.scanId }),
    });

    expect(posterRes.status).toBe(200);
    expect(posterRes.headers.get("content-type")).toContain("image/png");
    expect(posterRes.headers.get("cache-control")).toBe(
      "public, max-age=60, s-maxage=300"
    );

    const bytes = new Uint8Array(await posterRes.arrayBuffer());
    expect(bytes.length).toBeGreaterThan(1000);
    // PNG signature
    expect(Array.from(bytes.slice(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  }, 120_000);
});
