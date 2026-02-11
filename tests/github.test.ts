import { describe, expect, it, vi } from "vitest";
import { fetchGitHubRepoFiles, parseGitHubRepoUrl, RepoFetchError } from "@/lib/scan/github";

describe("github intake", () => {
  it("parses root and tree urls", () => {
    expect(parseGitHubRepoUrl("https://github.com/acme/skill-repo")).toEqual({
      owner: "acme",
      repo: "skill-repo",
    });

    expect(parseGitHubRepoUrl("https://github.com/acme/skill-repo/tree/main/skills/demo")).toEqual({
      owner: "acme",
      repo: "skill-repo",
      ref: "main",
      subPath: "skills/demo",
    });
  });

  it("fetches files from github api responses", async () => {
    const fetchMock = vi.fn(async (input: string) => {
      if (input.includes("/git/blobs/sha_index")) {
        return new Response(
          JSON.stringify({
            encoding: "base64",
            content: Buffer.from("export const ok = true;\n").toString("base64"),
          }),
          { status: 200 },
        );
      }
      if (input.includes("/git/blobs/sha_readme")) {
        return new Response(
          JSON.stringify({
            encoding: "base64",
            content: Buffer.from("# Skill Repo\n").toString("base64"),
          }),
          { status: 200 },
        );
      }
      if (input.includes("/repos/acme/skill-repo") && !input.includes("/git/trees/")) {
        return new Response(JSON.stringify({ default_branch: "main" }), { status: 200 });
      }
      if (input.includes("/git/trees/main")) {
        return new Response(
          JSON.stringify({
            tree: [
              { path: "src/index.ts", type: "blob", size: 40, sha: "sha_index" },
              { path: "README.md", type: "blob", size: 20, sha: "sha_readme" },
            ],
          }),
          { status: 200 },
        );
      }
      return new Response("{}", { status: 404 });
    });

    vi.stubGlobal("fetch", fetchMock);
    const result = await fetchGitHubRepoFiles("https://github.com/acme/skill-repo");
    expect(result.files.length).toBe(2);
    expect(result.files[0].path).toBe("src/index.ts");
    expect(result.files[1].path).toBe("README.md");
    await result.cleanup();
    vi.unstubAllGlobals();
  });

  it("maps timeout-like failures to RepoFetchError", async () => {
    const abortError = new Error("aborted");
    abortError.name = "AbortError";
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw abortError;
    }));

    await expect(fetchGitHubRepoFiles("https://github.com/acme/skill-repo")).rejects.toBeInstanceOf(
      RepoFetchError,
    );
    vi.unstubAllGlobals();
  });

  it("falls back to bounded text blobs when extension filters match nothing", async () => {
    const fetchMock = vi.fn(async (input: string) => {
      if (input.includes("/git/blobs/sha_plain")) {
        return new Response(
          JSON.stringify({
            encoding: "base64",
            content: Buffer.from("plain text content").toString("base64"),
          }),
          { status: 200 },
        );
      }
      if (input.includes("/repos/acme/skill-repo") && !input.includes("/git/trees/")) {
        return new Response(JSON.stringify({ default_branch: "main" }), { status: 200 });
      }
      if (input.includes("/git/trees/main")) {
        return new Response(
          JSON.stringify({
            tree: [{ path: "notes/risk.txt", type: "blob", size: 18, sha: "sha_plain" }],
          }),
          { status: 200 },
        );
      }
      return new Response("{}", { status: 404 });
    });

    vi.stubGlobal("fetch", fetchMock);
    const result = await fetchGitHubRepoFiles("https://github.com/acme/skill-repo");
    expect(result.files).toHaveLength(1);
    expect(result.files[0].path).toBe("notes/risk.txt");
    await result.cleanup();
    vi.unstubAllGlobals();
  });

  it("maps github rate limit to typed error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ message: "API rate limit exceeded" }), {
          status: 403,
          headers: { "x-ratelimit-remaining": "0" },
        }),
      ),
    );
    await expect(fetchGitHubRepoFiles("https://github.com/acme/skill-repo")).rejects.toMatchObject({
      code: "github_rate_limited",
    });
    vi.unstubAllGlobals();
  });

  it("sends authorization header when GITHUB_TOKEN is set", async () => {
    const original = process.env.GITHUB_TOKEN;
    process.env.GITHUB_TOKEN = "test_token";

    const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
      const headers = init?.headers as Record<string, string> | undefined;
      if (input.includes("/git/blobs/sha_index")) {
        expect(headers?.Authorization).toBe("Bearer test_token");
        return new Response(
          JSON.stringify({
            encoding: "base64",
            content: Buffer.from("export const ok = true;\n").toString("base64"),
          }),
          { status: 200 },
        );
      }
      if (input.includes("/repos/acme/skill-repo") && !input.includes("/git/trees/")) {
        expect(headers?.Authorization).toBe("Bearer test_token");
        return new Response(JSON.stringify({ default_branch: "main" }), { status: 200 });
      }
      if (input.includes("/git/trees/main")) {
        expect(headers?.Authorization).toBe("Bearer test_token");
        return new Response(
          JSON.stringify({
            tree: [{ path: "src/index.ts", type: "blob", size: 40, sha: "sha_index" }],
          }),
          { status: 200 },
        );
      }
      return new Response("{}", { status: 404 });
    });

    vi.stubGlobal("fetch", fetchMock);
    const result = await fetchGitHubRepoFiles("https://github.com/acme/skill-repo");
    expect(result.files).toHaveLength(1);
    await result.cleanup();
    vi.unstubAllGlobals();
    if (original === undefined) {
      delete process.env.GITHUB_TOKEN;
    } else {
      process.env.GITHUB_TOKEN = original;
    }
  });
});
