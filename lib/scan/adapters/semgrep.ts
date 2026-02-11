import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { Finding } from "../rules";
import { severityFromExternal } from "./normalize";

const execFileAsync = promisify(execFile);

type SemgrepResult = {
  check_id?: string;
  path?: string;
  start?: { line?: number };
  extra?: {
    severity?: string;
    message?: string;
    lines?: string;
  };
};

type SemgrepPayload = {
  results?: SemgrepResult[];
};

export function parseSemgrepJson(payload: string): Finding[] {
  let parsed: SemgrepPayload;
  try {
    parsed = JSON.parse(payload) as SemgrepPayload;
  } catch {
    return [];
  }
  if (!Array.isArray(parsed.results)) return [];

  return parsed.results.map((result) => {
    const severity = severityFromExternal(result.extra?.severity);
    return {
      ruleId: result.check_id || "SEMGREP_UNKNOWN",
      severity,
      title: result.extra?.message || "Semgrep finding",
      file: result.path || "unknown",
      line: result.start?.line || 1,
      snippet: (result.extra?.lines || "").trim().slice(0, 200),
      recommendation: "Review this code path and apply Semgrep rule guidance.",
    };
  });
}

export async function runSemgrepScan(targetDir: string): Promise<{ findings: Finding[]; error?: string }> {
  try {
    const { stdout } = await execFileAsync("semgrep", [
      "--config",
      "auto",
      "--json",
      "--quiet",
      targetDir,
    ]);
    return { findings: parseSemgrepJson(stdout) };
  } catch (error: unknown) {
    const err = error as { code?: string; stdout?: string };
    if (typeof err.stdout === "string" && err.stdout.trim().length > 0) {
      return { findings: parseSemgrepJson(err.stdout) };
    }
    if (err.code === "ENOENT") {
      return { findings: [], error: "semgrep_not_available" };
    }
    return { findings: [], error: "semgrep_failed" };
  }
}
