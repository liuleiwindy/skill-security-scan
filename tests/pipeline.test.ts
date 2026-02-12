import { describe, it, expect, vi } from "vitest";
import { runFullScan } from "@/lib/scan/pipeline";
import type { Finding } from "@/lib/scan/rules";
import type { IntakeResult } from "@/lib/scan/intake";

const baseInternalFinding: Finding = {
  ruleId: "LOCAL_RULE",
  severity: "medium",
  title: "Local finding",
  file: "src/index.ts",
  line: 1,
  snippet: "danger()",
  recommendation: "fix",
};

const semgrepFinding: Finding = {
  ruleId: "SEMGREP_RULE",
  severity: "high",
  title: "Semgrep finding",
  file: "src/a.ts",
  line: 2,
  snippet: "secret",
  recommendation: "review",
};

const gitleaksFinding: Finding = {
  ruleId: "GITLEAKS_RULE",
  severity: "critical",
  title: "Gitleaks finding",
  file: ".env",
  line: 1,
  snippet: "TOKEN=xxx",
  recommendation: "rotate",
};

function makeIntake(kind: IntakeResult["kind"] = "github_url"): IntakeResult {
  if (kind === "npm_command") {
    return {
      kind,
      files: [{ path: "package.json", content: "{}" }],
      workspaceDir: "/tmp/scan",
      filesSkipped: 0,
      packageName: "demo",
      packageVersion: "1.0.0",
      cleanup: async () => {},
    };
  }

  return {
    kind,
    files: [{ path: "src/index.ts", content: "export const a = 1" }],
    workspaceDir: "/tmp/scan",
    filesSkipped: 0,
    effectiveRepoUrl: "https://github.com/acme/demo",
    cleanup: async () => {},
  };
}

describe("pipeline", () => {
  it("merges internal and external findings", async () => {
    const report = await runFullScan("https://github.com/acme/demo", makeIntake(), {
      runInternalScan: vi.fn(async () => ({
        id: "scan_1",
        repoUrl: "x",
        score: 90,
        grade: "A",
        status: "safe",
        summary: { critical: 0, high: 0, medium: 1, low: 0 },
        findings: [baseInternalFinding],
        engineVersion: "v0.2.3",
        scannedAt: new Date().toISOString(),
      })),
      runExternalScanners: vi.fn(async () => ({
        findings: [semgrepFinding, gitleaksFinding],
        scanners: [],
      })),
    });

    expect(report.findings.map((f) => f.ruleId)).toEqual([
      "GITLEAKS_RULE",
      "SEMGREP_RULE",
      "LOCAL_RULE",
    ]);
  });

  it("keeps scan flow when one external scanner has no findings", async () => {
    const report = await runFullScan("https://github.com/acme/demo", makeIntake(), {
      runInternalScan: vi.fn(async () => ({
        id: "scan_2",
        repoUrl: "x",
        score: 90,
        grade: "A",
        status: "safe",
        summary: { critical: 0, high: 0, medium: 1, low: 0 },
        findings: [baseInternalFinding],
        engineVersion: "v0.2.3",
        scannedAt: new Date().toISOString(),
      })),
      runExternalScanners: vi.fn(async () => ({
        findings: [semgrepFinding],
        scanners: [
          { scanner: "semgrep", status: "ok", findings: 1 },
          { scanner: "gitleaks", status: "failed", findings: 0, error: "gitleaks_failed" },
        ],
      })),
    });

    expect(report.findings.length).toBe(2);
    expect(report.findings.some((f) => f.ruleId === "LOCAL_RULE")).toBe(true);
  });

  it("still generates report when all external scanners fail", async () => {
    const report = await runFullScan("https://github.com/acme/demo", makeIntake(), {
      runInternalScan: vi.fn(async () => ({
        id: "scan_3",
        repoUrl: "x",
        score: 90,
        grade: "A",
        status: "safe",
        summary: { critical: 0, high: 0, medium: 1, low: 0 },
        findings: [baseInternalFinding],
        engineVersion: "v0.2.3",
        scannedAt: new Date().toISOString(),
      })),
      runExternalScanners: vi.fn(async () => ({
        findings: [],
        scanners: [
          { scanner: "semgrep", status: "failed", findings: 0, error: "semgrep_failed" },
          { scanner: "gitleaks", status: "failed", findings: 0, error: "gitleaks_failed" },
        ],
      })),
    });

    expect(report.id).toBe("scan_3");
    expect(report.findings).toHaveLength(1);
    expect(report.findings[0].ruleId).toBe("LOCAL_RULE");
  });

  it("fills npm scanMeta correctly", async () => {
    const report = await runFullScan("npm i demo", makeIntake("npm_command"), {
      runInternalScan: vi.fn(async () => ({
        id: "scan_4",
        repoUrl: "x",
        score: 90,
        grade: "A",
        status: "safe",
        summary: { critical: 0, high: 0, medium: 1, low: 0 },
        findings: [baseInternalFinding],
        engineVersion: "v0.2.3",
        scannedAt: new Date().toISOString(),
      })),
      runExternalScanners: vi.fn(async () => ({ findings: [], scanners: [] })),
    });

    expect(report.scanMeta).toMatchObject({
      source: "npm_registry",
      packageName: "demo",
      packageVersion: "1.0.0",
    });
  });
});
