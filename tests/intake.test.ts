import { describe, expect, it, vi } from "vitest";
import { runIntakeFromInput } from "@/lib/scan/intake";

describe("intake facade", () => {
  it("uses npm intake for regular npm command", async () => {
    const fetchRepoFiles = vi.fn(async () => ({
      files: [],
      workspaceDir: "/tmp/repo",
      filesSkipped: 0,
      cleanup: async () => {},
    }));
    const fetchNpmFiles = vi.fn(async () => ({
      files: [{ path: "src/index.ts", content: "export const ok = 1;\n" }],
      workspaceDir: "/tmp/npm",
      filesSkipped: 1,
      packageName: "demo",
      packageVersion: "1.0.0",
      cleanup: async () => {},
    }));
    const resolveSkillsAddGitHub = vi.fn(async () => null);

    const result = await runIntakeFromInput("npm i demo", {
      fetchRepoFiles,
      fetchNpmFiles,
      resolveSkillsAddGitHub,
    });

    expect(result.intake.kind).toBe("npm_command");
    expect(result.effectiveRepoUrl).toBe("npm i demo");
    expect(result.npmMeta?.packageName).toBe("demo");
    expect(fetchRepoFiles).not.toHaveBeenCalled();
    expect(fetchNpmFiles).toHaveBeenCalledOnce();
  });

  it("routes skills-add input to github intake with prioritized subpaths", async () => {
    const fetchRepoFiles = vi.fn(async (_repoUrl: string, _options?: { subPaths?: string[] }) => ({
      files: [{ path: "a/SKILL.md", content: "name: a" }],
      workspaceDir: "/tmp/repo",
      filesSkipped: 0,
      cleanup: async () => {},
    }));
    const fetchNpmFiles = vi.fn(async () => {
      throw new Error("npm intake should not run");
    });
    const resolveSkillsAddGitHub = vi.fn(async () => ({
      repoUrl: "https://github.com/acme/skills",
      skillRoots: ["z/deep/path", "a", "z/deep/path", "b/c"],
    }));

    const result = await runIntakeFromInput("npx skills add acme/skills", {
      fetchRepoFiles,
      fetchNpmFiles,
      resolveSkillsAddGitHub,
    });

    expect(result.intake.kind).toBe("github_url");
    expect(result.effectiveRepoUrl).toBe("https://github.com/acme/skills");
    expect(result.npmMeta).toBeNull();
    expect(fetchRepoFiles).toHaveBeenCalledOnce();
    expect(fetchRepoFiles).toHaveBeenCalledWith("https://github.com/acme/skills", {
      timeoutMs: 45000,
      subPaths: ["a", "b/c", "z/deep/path"],
    });
    expect(fetchNpmFiles).not.toHaveBeenCalled();
  });

  it("falls back to npm intake when skills target resolving fails", async () => {
    const fetchRepoFiles = vi.fn(async () => ({
      files: [],
      workspaceDir: "/tmp/repo",
      filesSkipped: 0,
      cleanup: async () => {},
    }));
    const fetchNpmFiles = vi.fn(async () => ({
      files: [{ path: "README.md", content: "# demo\n" }],
      workspaceDir: "/tmp/npm",
      filesSkipped: 0,
      packageName: "demo",
      packageVersion: "2.0.0",
      cleanup: async () => {},
    }));
    const resolveSkillsAddGitHub = vi.fn(async () => {
      throw new Error("network down");
    });

    const result = await runIntakeFromInput("npx demo", {
      fetchRepoFiles,
      fetchNpmFiles,
      resolveSkillsAddGitHub,
    });

    expect(result.intake.kind).toBe("npm_command");
    expect(result.npmMeta?.packageVersion).toBe("2.0.0");
    expect(fetchRepoFiles).not.toHaveBeenCalled();
    expect(fetchNpmFiles).toHaveBeenCalledOnce();
  });

  it("keeps unknown input behavior by routing to github intake path", async () => {
    const fetchRepoFiles = vi.fn(async (repoUrl: string) => ({
      files: [{ path: "src/index.ts", content: "ok\n" }],
      workspaceDir: "/tmp/repo",
      filesSkipped: 0,
      cleanup: async () => {},
    }));
    const fetchNpmFiles = vi.fn(async () => ({
      files: [],
      workspaceDir: "/tmp/npm",
      filesSkipped: 0,
      packageName: "x",
      packageVersion: "1.0.0",
      cleanup: async () => {},
    }));
    const resolveSkillsAddGitHub = vi.fn(async () => null);

    const result = await runIntakeFromInput("not-a-valid-url", {
      fetchRepoFiles,
      fetchNpmFiles,
      resolveSkillsAddGitHub,
    });

    expect(result.intake.kind).toBe("github_url");
    expect(result.effectiveRepoUrl).toBe("not-a-valid-url");
    expect(fetchRepoFiles).toHaveBeenCalledWith("not-a-valid-url");
    expect(fetchNpmFiles).not.toHaveBeenCalled();
  });
});
