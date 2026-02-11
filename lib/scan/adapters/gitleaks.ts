import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { Finding } from "../rules";

const execFileAsync = promisify(execFile);

type GitleaksFinding = {
  RuleID?: string;
  Description?: string;
  File?: string;
  StartLine?: number;
  Match?: string;
};

function severityFromRuleId(ruleId: string): Finding["severity"] {
  const id = ruleId.toLowerCase();
  if (id.includes("private") || id.includes("rsa") || id.includes("aws")) return "critical";
  if (id.includes("token") || id.includes("secret") || id.includes("password")) return "high";
  return "medium";
}

export function parseGitleaksJson(payload: string): Finding[] {
  let parsed: GitleaksFinding[];
  try {
    parsed = JSON.parse(payload) as GitleaksFinding[];
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  return parsed.map((item) => {
    const ruleId = item.RuleID || "GITLEAKS_UNKNOWN";
    return {
      ruleId,
      severity: severityFromRuleId(ruleId),
      title: item.Description || "Potential secret detected by Gitleaks",
      file: item.File || "unknown",
      line: item.StartLine || 1,
      snippet: (item.Match || "").slice(0, 200),
      recommendation: "Move secrets to secure environment variables and rotate exposed credentials.",
    };
  });
}

export async function runGitleaksScan(targetDir: string): Promise<{ findings: Finding[]; error?: string }> {
  const reportDir = await fs.mkdtemp(path.join(os.tmpdir(), "gitleaks-report-"));
  const reportPath = path.join(reportDir, "report.json");
  try {
    await execFileAsync("gitleaks", [
      "detect",
      "--source",
      targetDir,
      "--report-format",
      "json",
      "--report-path",
      reportPath,
      "--no-git",
      "--redact",
    ]);
  } catch (error: unknown) {
    const err = error as { code?: string };
    if (err.code === "ENOENT") {
      await fs.rm(reportDir, { recursive: true, force: true });
      return { findings: [], error: "gitleaks_not_available" };
    }
    // gitleaks returns non-zero when leaks are found; continue to report parsing.
  }

  try {
    const payload = await fs.readFile(reportPath, "utf8");
    return { findings: parseGitleaksJson(payload) };
  } catch {
    return { findings: [], error: "gitleaks_failed" };
  } finally {
    await fs.rm(reportDir, { recursive: true, force: true });
  }
}
