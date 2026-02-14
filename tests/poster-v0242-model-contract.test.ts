import { describe, expect, it } from "vitest";
import { createPosterModelFromScanReport } from "@/lib/poster";

describe("v0.2.4.2 poster model contract", () => {
  it("maps scan report fields into required poster model fields", () => {
    const report = {
      id: "scan_realrepo_abc123",
      repoUrl: "https://github.com/octocat/Hello-World",
      score: 72,
      grade: "B",
      status: "needs_review",
      summary: { critical: 1, high: 2, medium: 0, low: 1 },
      engineVersion: "v0.2.4",
      scannedAt: "2026-02-14T14:32:00Z",
    };

    const model = createPosterModelFromScanReport(report as never);

    const requiredStringFields = [
      "id",
      "header",
      "proof",
      "repoLabel",
      "repoValue",
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
    ] as const;

    for (const key of requiredStringFields) {
      expect(typeof model[key]).toBe("string");
      expect(String(model[key]).length).toBeGreaterThan(0);
    }

    expect(model.grade).toMatch(/^[ABCD]$/);
    expect(model.scoreText).toContain("72/100");
    expect(model.repoValue).toBe("octocat/Hello-World");
    expect(model.qrUrl).toBe("/scan/report/scan_realrepo_abc123");
    expect(model.proof).toContain("2026-02-14 14:32 UTC");
  });

  it("formats proof time in UTC regardless of input timezone offset", () => {
    const report = {
      id: "scan_tz_case",
      repoUrl: "https://github.com/octocat/Hello-World",
      score: 80,
      summary: { critical: 0, high: 0, medium: 0, low: 0 },
      engineVersion: "v0.2.4",
      scannedAt: "2026-02-14T22:32:00+08:00",
    };

    const model = createPosterModelFromScanReport(report as never);
    expect(model.proof).toContain("2026-02-14 14:32 UTC");
  });

  it("uses packageName@version for npm scans and packageName when version missing", () => {
    const withVersion = createPosterModelFromScanReport({
      id: "scan_npm_1",
      repoUrl: "npm i react",
      score: 65,
      summary: { critical: 0, high: 1, medium: 0, low: 0 },
      engineVersion: "v0.2.4",
      scannedAt: "2026-02-14T14:32:00Z",
      scanMeta: { source: "npm_registry", packageName: "react", packageVersion: "19.0.0" },
    } as never);
    expect(withVersion.repoValue).toBe("react@19.0.0");

    const withoutVersion = createPosterModelFromScanReport({
      id: "scan_npm_2",
      repoUrl: "npm i lodash",
      score: 65,
      summary: { critical: 0, high: 1, medium: 0, low: 0 },
      engineVersion: "v0.2.4",
      scannedAt: "2026-02-14T14:32:00Z",
      scanMeta: { source: "npm_registry", packageName: "lodash" },
    } as never);
    expect(withoutVersion.repoValue).toBe("lodash");
  });

  it("normalizes GitHub deep links to owner/repo", () => {
    const model = createPosterModelFromScanReport({
      id: "scan_gh_deep",
      repoUrl: "https://github.com/facebook/react/tree/main/packages/react",
      score: 69,
      summary: { critical: 1, high: 2, medium: 0, low: 0 },
      engineVersion: "v0.2.4",
      scannedAt: "2026-02-14T14:32:00Z",
    } as never);

    expect(model.repoValue).toBe("facebook/react");
  });

  it("generates proof id from scan id payload instead of static SCAN prefix", () => {
    const model = createPosterModelFromScanReport({
      id: "scan_realrepo_abc123",
      repoUrl: "https://github.com/octocat/Hello-World",
      score: 72,
      summary: { critical: 1, high: 2, medium: 0, low: 1 },
      engineVersion: "v0.2.4",
      scannedAt: "2026-02-14T14:32:00Z",
    } as never);

    expect(model.proof).toContain("PROOF ID:");
    expect(model.proof).not.toContain("PROOF ID: SCAN");
  });
});
