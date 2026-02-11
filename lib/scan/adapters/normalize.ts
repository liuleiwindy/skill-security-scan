import type { Finding } from "../rules";
import { sortFindings } from "../engine";

export function severityFromExternal(value: string | undefined): Finding["severity"] {
  const normalized = (value || "").toLowerCase();
  if (normalized.includes("critical") || normalized === "error") return "critical";
  if (normalized.includes("high") || normalized === "warning") return "high";
  if (normalized.includes("medium")) return "medium";
  return "low";
}

export function dedupeAndSortFindings(findings: Finding[]): Finding[] {
  const map = new Map<string, Finding>();
  for (const finding of findings) {
    const key = `${finding.ruleId}|${finding.file}|${finding.line}|${finding.title}|${finding.snippet}`;
    if (!map.has(key)) {
      map.set(key, finding);
    }
  }
  return sortFindings(Array.from(map.values()));
}
