import { describe, expect, it } from "vitest";
import { getPosterUrl, getReportUrl } from "@/lib/qr";

describe("qr url builders", () => {
  it("uses explicit baseUrl when provided", () => {
    expect(getReportUrl("scan_123", "https://skill-security-scan.vercel.app")).toBe(
      "https://skill-security-scan.vercel.app/scan/report/scan_123",
    );
    expect(getPosterUrl("scan_123", "https://skill-security-scan.vercel.app/")).toBe(
      "https://skill-security-scan.vercel.app/scan/poster/scan_123",
    );
  });

  it("normalizes host-only baseUrl to https", () => {
    expect(getReportUrl("scan_123", "skill-security-scan.vercel.app")).toBe(
      "https://skill-security-scan.vercel.app/scan/report/scan_123",
    );
  });

  it("falls back to VERCEL_URL when explicit baseUrl is empty", () => {
    const original = process.env.VERCEL_URL;
    process.env.VERCEL_URL = "skill-security-scan.vercel.app";
    expect(getReportUrl("scan_123")).toBe("https://skill-security-scan.vercel.app/scan/report/scan_123");
    if (original === undefined) {
      delete process.env.VERCEL_URL;
    } else {
      process.env.VERCEL_URL = original;
    }
  });
});

