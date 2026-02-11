import { describe, expect, it, vi } from "vitest";

vi.mock("node:child_process", () => ({
  execFile: (_cmd: string, _args: string[], cb: (err: NodeJS.ErrnoException | null) => void) => {
    const err = new Error("not found") as NodeJS.ErrnoException;
    err.code = "ENOENT";
    cb(err);
  },
}));

import { parseSemgrepJson, runSemgrepScan } from "@/lib/scan/adapters/semgrep";
import { parseGitleaksJson, runGitleaksScan } from "@/lib/scan/adapters/gitleaks";
import { dedupeAndSortFindings } from "@/lib/scan/adapters/normalize";

describe("scanner adapters", () => {
  it("parses semgrep payload", () => {
    const findings = parseSemgrepJson(
      JSON.stringify({
        results: [
          {
            check_id: "rule.id",
            path: "src/a.ts",
            start: { line: 5 },
            extra: { severity: "WARNING", message: "msg", lines: "danger();" },
          },
        ],
      }),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0].ruleId).toBe("rule.id");
    expect(findings[0].file).toBe("src/a.ts");
  });

  it("parses gitleaks payload", () => {
    const findings = parseGitleaksJson(
      JSON.stringify([
        {
          RuleID: "aws-access-token",
          Description: "AWS key",
          File: "src/secrets.ts",
          StartLine: 2,
          Match: "AKIA...",
        },
      ]),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0].severity).toBe("critical");
  });

  it("falls back safely when scanner binary is missing", async () => {
    const semgrep = await runSemgrepScan("/tmp/project");
    const gitleaks = await runGitleaksScan("/tmp/project");
    expect(semgrep.error).toBe("semgrep_not_available");
    expect(gitleaks.error).toBe("gitleaks_not_available");
  });

  it("dedupes findings by stable key", () => {
    const merged = dedupeAndSortFindings([
      {
        ruleId: "A",
        severity: "high",
        title: "x",
        file: "a.ts",
        line: 1,
        snippet: "x",
        recommendation: "fix",
      },
      {
        ruleId: "A",
        severity: "high",
        title: "x",
        file: "a.ts",
        line: 1,
        snippet: "x",
        recommendation: "fix",
      },
    ]);
    expect(merged).toHaveLength(1);
  });
});
