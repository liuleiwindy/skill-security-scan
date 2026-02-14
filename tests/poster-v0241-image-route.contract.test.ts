import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/store", () => ({
  getStoredReport: vi.fn(),
}));

vi.mock("@/lib/poster/render-options", () => ({
  getGradeForScore: vi.fn((score: number) => {
    if (score >= 80) return "A";
    if (score >= 60) return "B";
    if (score >= 40) return "C";
    return "D";
  }),
  getColorForGrade: vi.fn((grade: string) => {
    if (grade === "A") return "#7dffb1";
    if (grade === "B") return "#ffdd7d";
    if (grade === "C") return "#ffa57d";
    return "#ff7d7d";
  }),
  loadGradeConfig: vi.fn(() => ({
    version: "1.0",
    grades: [
      { grade: "A", min: 80, max: 100, color: "#7dffb1" },
      { grade: "B", min: 60, max: 79, color: "#ffdd7d" },
      { grade: "C", min: 40, max: 59, color: "#ffa57d" },
      { grade: "D", min: 0, max: 39, color: "#ff7d7d" },
    ],
  })),
}));

vi.mock("@/lib/poster/model-mapper", () => ({
  createPosterModelFromScanReport: vi.fn(),
}));

vi.mock("@/lib/poster/render-poster", () => ({
  renderPoster: vi.fn(),
}));

const routeFilePath = path.resolve(
  __dirname,
  "../app/api/scan/[id]/poster/image/route.ts"
);

const describeIfRouteExists = fs.existsSync(routeFilePath) ? describe : describe.skip;

function makeNextRequest(url: string, init?: RequestInit): Request {
  const req = new Request(url, init);
  return Object.assign(req, { nextUrl: new URL(url) }) as Request;
}

describeIfRouteExists("v0.2.4.1 poster image route contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 + image/png + cache header on success", async () => {
    const storeModule = await import("@/lib/store");
    const mapperModule = await import("@/lib/poster/model-mapper");
    const renderModule = await import("@/lib/poster/render-poster");
    const { GET } = await import("@/app/api/scan/[id]/poster/image/route");

    const mockGetStoredReport = vi.mocked(storeModule.getStoredReport);
    const mockCreatePosterModel = vi.mocked(mapperModule.createPosterModelFromScanReport);
    const mockRenderPoster = vi.mocked(renderModule.renderPoster);

    mockGetStoredReport.mockResolvedValue({
      id: "scan_contract",
      repoUrl: "https://github.com/facebook/react",
      score: 69,
      summary: { critical: 1, high: 2, medium: 0, low: 0 },
      findings: [],
      engineVersion: "v0.2.4",
      scannedAt: "2026-02-14 14:32 UTC",
      grade: "B",
      status: "needs_review",
    } as never);

    mockCreatePosterModel.mockReturnValue({
      id: "scan_contract",
      header: "SYSTEM INTEGRITY CHECK // REPORT",
      proof: "PROOF ID: X9K2 · 2026-02-14 14:32 UTC",
      repoLabel: "REPO:",
      repoValue: "facebook/react",
      grade: "B",
      scoreText: "SCORE\\n69/100",
      beatsText: "BEATS\\nOF REPOS",
      beatsRatio: "78%",
      criticalLabel: "CRITICAL",
      criticalNumber: "[ 1 ]",
      highLabel: "HIGH",
      highNumber: "[ 2 ]",
      mediumLabel: "MEDIUM",
      mediumNumber: "[ 0 ]",
      lowLabel: "LOW",
      lowNumber: "[ 0 ]",
      cta: "> SCAN TO VERIFY REPORT DETAILS <",
      short: "POWERED BY MYSKILL.AI",
      qrUrl: "https://secscan.dev/r/scan_contract",
    } as never);

    mockRenderPoster.mockResolvedValue({
      success: true,
      buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
      dimensions: { width: 687, height: 1024 },
    });

    const req = makeNextRequest(
      "http://localhost/api/scan/scan_contract/poster/image"
    );

    const res = await GET(req as never, {
      params: Promise.resolve({ id: "scan_contract" }),
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("image/png");
    expect(res.headers.get("cache-control")).toBe(
      "public, max-age=60, s-maxage=300"
    );
  });

  it("keeps score text and ring progress consistent when ?score=90", async () => {
    const storeModule = await import("@/lib/store");
    const mapperModule = await import("@/lib/poster/model-mapper");
    const renderModule = await import("@/lib/poster/render-poster");
    const { GET } = await import("@/app/api/scan/[id]/poster/image/route");

    const mockGetStoredReport = vi.mocked(storeModule.getStoredReport);
    const mockCreatePosterModel = vi.mocked(mapperModule.createPosterModelFromScanReport);
    const mockRenderPoster = vi.mocked(renderModule.renderPoster);

    mockGetStoredReport.mockResolvedValue({
      id: "scan_contract",
      repoUrl: "https://github.com/facebook/react",
      score: 69,
      summary: { critical: 1, high: 2, medium: 0, low: 0 },
      findings: [],
      engineVersion: "v0.2.4",
      scannedAt: "2026-02-14 14:32 UTC",
      grade: "B",
      status: "needs_review",
    } as never);

    mockCreatePosterModel.mockReturnValue({
      id: "scan_contract",
      header: "SYSTEM INTEGRITY CHECK // REPORT",
      proof: "PROOF ID: X9K2 · 2026-02-14 14:32 UTC",
      repoLabel: "REPO:",
      repoValue: "facebook/react",
      grade: "B",
      scoreText: "SCORE\\n69/100",
      beatsText: "BEATS\\nOF REPOS",
      beatsRatio: "78%",
      criticalLabel: "CRITICAL",
      criticalNumber: "[ 1 ]",
      highLabel: "HIGH",
      highNumber: "[ 2 ]",
      mediumLabel: "MEDIUM",
      mediumNumber: "[ 0 ]",
      lowLabel: "LOW",
      lowNumber: "[ 0 ]",
      cta: "> SCAN TO VERIFY REPORT DETAILS <",
      short: "POWERED BY MYSKILL.AI",
      qrUrl: "https://secscan.dev/r/scan_contract",
    } as never);

    mockRenderPoster.mockResolvedValue({
      success: true,
      buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
      dimensions: { width: 687, height: 1024 },
    });

    const req = makeNextRequest(
      "http://localhost/api/scan/scan_contract/poster/image?score=90"
    );

    const res = await GET(req as never, {
      params: Promise.resolve({ id: "scan_contract" }),
    });

    expect(res.status).toBe(200);
    expect(mockRenderPoster).toHaveBeenCalledOnce();

    const renderOptions = mockRenderPoster.mock.calls[0]?.[1] as
      | { ringPercent?: number; progressBarColor?: string; textOverrides?: Record<string, string> }
      | undefined;

    expect(renderOptions?.ringPercent).toBe(90);
    expect(renderOptions?.textOverrides?.QmvPl).toBe("SCORE\\n90/100");
    expect(renderOptions?.progressBarColor).toBe("#7dffb1");
  });

  it("overrides model qrUrl to absolute report URL using request host", async () => {
    const storeModule = await import("@/lib/store");
    const mapperModule = await import("@/lib/poster/model-mapper");
    const renderModule = await import("@/lib/poster/render-poster");
    const { GET } = await import("@/app/api/scan/[id]/poster/image/route");

    const mockGetStoredReport = vi.mocked(storeModule.getStoredReport);
    const mockCreatePosterModel = vi.mocked(mapperModule.createPosterModelFromScanReport);
    const mockRenderPoster = vi.mocked(renderModule.renderPoster);

    mockGetStoredReport.mockResolvedValue({
      id: "scan_contract",
      repoUrl: "https://github.com/facebook/react",
      score: 69,
      summary: { critical: 1, high: 2, medium: 0, low: 0 },
      findings: [],
      engineVersion: "v0.2.4",
      scannedAt: "2026-02-14 14:32 UTC",
      grade: "B",
      status: "needs_review",
    } as never);

    mockCreatePosterModel.mockReturnValue({
      id: "scan_contract",
      header: "SYSTEM INTEGRITY CHECK // REPORT",
      proof: "PROOF ID: X9K2 · 2026-02-14 14:32 UTC",
      repoLabel: "REPO:",
      repoValue: "facebook/react",
      grade: "B",
      scoreText: "SCORE\\n69/100",
      beatsText: "BEATS\\nOF REPOS",
      beatsRatio: "78%",
      criticalLabel: "CRITICAL",
      criticalNumber: "[ 1 ]",
      highLabel: "HIGH",
      highNumber: "[ 2 ]",
      mediumLabel: "MEDIUM",
      mediumNumber: "[ 0 ]",
      lowLabel: "LOW",
      lowNumber: "[ 0 ]",
      cta: "> SCAN TO VERIFY REPORT DETAILS <",
      short: "POWERED BY MYSKILL.AI",
      qrUrl: "/scan/report/scan_contract",
    } as never);

    mockRenderPoster.mockResolvedValue({
      success: true,
      buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
      dimensions: { width: 687, height: 1024 },
    });

    const req = makeNextRequest(
      "http://localhost/api/scan/scan_contract/poster/image",
      {
        headers: {
          "x-forwarded-proto": "https",
          "x-forwarded-host": "skill-security-scan.vercel.app",
        },
      }
    );

    const res = await GET(req as never, {
      params: Promise.resolve({ id: "scan_contract" }),
    });

    expect(res.status).toBe(200);
    const modelArg = mockRenderPoster.mock.calls[0]?.[0] as { qrUrl?: string } | undefined;
    expect(modelArg?.qrUrl).toBe(
      "https://skill-security-scan.vercel.app/scan/report/scan_contract"
    );
  });

  it("applies explicit ?progressBarColor override", async () => {
    const storeModule = await import("@/lib/store");
    const mapperModule = await import("@/lib/poster/model-mapper");
    const renderModule = await import("@/lib/poster/render-poster");
    const { GET } = await import("@/app/api/scan/[id]/poster/image/route");

    const mockGetStoredReport = vi.mocked(storeModule.getStoredReport);
    const mockCreatePosterModel = vi.mocked(mapperModule.createPosterModelFromScanReport);
    const mockRenderPoster = vi.mocked(renderModule.renderPoster);

    mockGetStoredReport.mockResolvedValue({
      id: "scan_contract",
      repoUrl: "https://github.com/facebook/react",
      score: 69,
      summary: { critical: 1, high: 2, medium: 0, low: 0 },
      findings: [],
      engineVersion: "v0.2.4",
      scannedAt: "2026-02-14 14:32 UTC",
      grade: "B",
      status: "needs_review",
    } as never);

    mockCreatePosterModel.mockReturnValue({
      id: "scan_contract",
      header: "SYSTEM INTEGRITY CHECK // REPORT",
      proof: "PROOF ID: X9K2 · 2026-02-14 14:32 UTC",
      repoLabel: "REPO:",
      repoValue: "facebook/react",
      grade: "B",
      scoreText: "SCORE\\n69/100",
      beatsText: "BEATS\\nOF REPOS",
      beatsRatio: "78%",
      criticalLabel: "CRITICAL",
      criticalNumber: "[ 1 ]",
      highLabel: "HIGH",
      highNumber: "[ 2 ]",
      mediumLabel: "MEDIUM",
      mediumNumber: "[ 0 ]",
      lowLabel: "LOW",
      lowNumber: "[ 0 ]",
      cta: "> SCAN TO VERIFY REPORT DETAILS <",
      short: "POWERED BY MYSKILL.AI",
      qrUrl: "https://secscan.dev/r/scan_contract",
    } as never);

    mockRenderPoster.mockResolvedValue({
      success: true,
      buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
      dimensions: { width: 687, height: 1024 },
    });

    const req = makeNextRequest(
      "http://localhost/api/scan/scan_contract/poster/image?progressBarColor=%237dffb1"
    );

    const res = await GET(req as never, {
      params: Promise.resolve({ id: "scan_contract" }),
    });

    expect(res.status).toBe(200);
    expect(mockRenderPoster).toHaveBeenCalledOnce();
    const renderOptions = mockRenderPoster.mock.calls[0]?.[1] as
      | { progressBarColor?: string }
      | undefined;
    expect(renderOptions?.progressBarColor).toBe("#7dffb1");
  });

  it("returns 400 for unsupported query params with typed payload + no-store", async () => {
    const { GET } = await import("@/app/api/scan/[id]/poster/image/route");
    const req = makeNextRequest(
      "http://localhost/api/scan/scan_contract/poster/image?foo=bar"
    );

    const res = await GET(req as never, {
      params: Promise.resolve({ id: "scan_contract" }),
    });

    expect(res.status).toBe(400);
    expect(res.headers.get("cache-control")).toBe("no-store");

    const body = (await res.json()) as {
      code?: string;
      message?: string;
      requestId?: string;
    };

    expect(body.code).toBe("POSTER_INVALID_QUERY");
    expect(body.message).toContain("foo");
    expect(body.requestId).toBeTruthy();
  });

  it("returns 500 + no-store when render fails", async () => {
    const storeModule = await import("@/lib/store");
    const mapperModule = await import("@/lib/poster/model-mapper");
    const renderModule = await import("@/lib/poster/render-poster");
    const { GET } = await import("@/app/api/scan/[id]/poster/image/route");

    const mockGetStoredReport = vi.mocked(storeModule.getStoredReport);
    const mockCreatePosterModel = vi.mocked(mapperModule.createPosterModelFromScanReport);
    const mockRenderPoster = vi.mocked(renderModule.renderPoster);

    mockGetStoredReport.mockResolvedValue({
      id: "scan_contract",
      repoUrl: "https://github.com/facebook/react",
      score: 69,
      summary: { critical: 1, high: 2, medium: 0, low: 0 },
      findings: [],
      engineVersion: "v0.2.4",
      scannedAt: "2026-02-14 14:32 UTC",
      grade: "B",
      status: "needs_review",
    } as never);
    mockCreatePosterModel.mockReturnValue({ id: "scan_contract" } as never);
    mockRenderPoster.mockResolvedValue({
      success: false,
      error: "renderer failed",
    });

    const req = makeNextRequest(
      "http://localhost/api/scan/scan_contract/poster/image"
    );

    const res = await GET(req as never, {
      params: Promise.resolve({ id: "scan_contract" }),
    });

    expect(res.status).toBe(500);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const body = (await res.json()) as { code?: string };
    expect(body.code).toBe("POSTER_RENDER_FAILED");
  });

  it("returns 404 + no-store when scan id does not exist", async () => {
    const storeModule = await import("@/lib/store");
    const { GET } = await import("@/app/api/scan/[id]/poster/image/route");
    const mockGetStoredReport = vi.mocked(storeModule.getStoredReport);
    mockGetStoredReport.mockResolvedValue(null);

    const req = makeNextRequest(
      "http://localhost/api/scan/scan_missing/poster/image"
    );

    const res = await GET(req as never, {
      params: Promise.resolve({ id: "scan_missing" }),
    });

    expect(res.status).toBe(404);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const body = (await res.json()) as { code?: string; message?: string };
    expect(body.code).toBe("SCAN_NOT_FOUND");
    expect(body.message).toContain("scan_missing");
  });
});
