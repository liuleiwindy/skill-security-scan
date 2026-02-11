import { afterEach, describe, expect, it, vi } from "vitest";
import {
  __resetNpmDepsForTest,
  __setNpmDepsForTest,
  classifyScanInput,
  fetchNpmPackageFiles,
  parseNpmCommand,
  resolveSkillsAddGitHubTarget,
} from "@/lib/scan/npm";

describe("npm intake", () => {
  afterEach(() => {
    __resetNpmDepsForTest();
    vi.unstubAllGlobals();
  });

  it("classifies scan input and parses command", () => {
    expect(classifyScanInput("https://github.com/org/repo")).toBe("github_url");
    expect(classifyScanInput("npx create-next-app@14 my-app")).toBe("npm_command");
    expect(classifyScanInput("random")).toBe("unknown");

    expect(parseNpmCommand("npm i @types/node@20.11.30")).toEqual({
      command: "npm",
      packageName: "@types/node",
      packageSpec: "20.11.30",
    });
  });

  it("fetches npm package files from metadata and tar entries", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string) => {
        if (input.startsWith("https://registry.npmjs.org/")) {
          return new Response(
            JSON.stringify({
              "dist-tags": { latest: "1.2.3" },
              versions: {
                "1.2.3": { dist: { tarball: "https://registry.npmjs.org/foo/-/foo-1.2.3.tgz" } },
              },
            }),
            { status: 200 },
          );
        }
        if (input.includes("foo-1.2.3.tgz")) {
          return new Response(Buffer.from("fake tgz bytes"), { status: 200 });
        }
        return new Response("not found", { status: 404 });
      }),
    );

    __setNpmDepsForTest({
      execFile: ((
        _cmd: string,
        args: string[],
        _opts: unknown,
        cb: (error: Error | null, stdout: string | Buffer, stderr: string | Buffer) => void,
      ) => {
        if (args[0] === "-tvzf") {
          cb(
            null,
            [
              "-rw-r--r-- 0 root root 40 Feb 11 00:00 package/src/index.ts",
              "-rw-r--r-- 0 root root 20 Feb 11 00:00 package/README.md",
            ].join("\n"),
            "",
          );
          return;
        }

        const entry = args[2];
        if (entry === "package/src/index.ts") {
          cb(null, Buffer.from("export const ok = true;\n"), Buffer.from(""));
          return;
        }
        if (entry === "package/README.md") {
          cb(null, Buffer.from("# demo\n"), Buffer.from(""));
          return;
        }

        cb(new Error("unexpected tar command"), "", "");
      }) as any,
    });

    const result = await fetchNpmPackageFiles("npm i foo");
    expect(result.packageName).toBe("foo");
    expect(result.packageVersion).toBe("1.2.3");
    expect(result.files.length).toBeGreaterThan(0);
    await result.cleanup();
  });

  it("throws typed error when extracted files exceed limit", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string) => {
        if (input.startsWith("https://registry.npmjs.org/")) {
          return new Response(
            JSON.stringify({
              "dist-tags": { latest: "1.0.0" },
              versions: {
                "1.0.0": { dist: { tarball: "https://registry.npmjs.org/foo/-/foo-1.0.0.tgz" } },
              },
            }),
            { status: 200 },
          );
        }
        return new Response(Buffer.from("fake tgz bytes"), { status: 200 });
      }),
    );

    __setNpmDepsForTest({
      execFile: ((
        _cmd: string,
        args: string[],
        _opts: unknown,
        cb: (error: Error | null, stdout: string | Buffer, stderr: string | Buffer) => void,
      ) => {
        if (args[0] === "-tvzf") {
          const lines = Array.from({ length: 301 }).map(
            (_, i) => `-rw-r--r-- 0 root root 10 Feb 11 00:00 package/src/f${i}.ts`,
          );
          cb(null, lines.join("\n"), "");
          return;
        }
        cb(new Error("unexpected tar command"), "", "");
      }) as any,
    });

    await expect(fetchNpmPackageFiles("npx foo")).rejects.toMatchObject({
      code: "npm_extracted_files_exceeded",
    });
  });

  it("throws typed error when a tarball file exceeds per-file size", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string) => {
        if (input.startsWith("https://registry.npmjs.org/")) {
          return new Response(
            JSON.stringify({
              "dist-tags": { latest: "1.0.0" },
              versions: {
                "1.0.0": { dist: { tarball: "https://registry.npmjs.org/foo/-/foo-1.0.0.tgz" } },
              },
            }),
            { status: 200 },
          );
        }
        return new Response(Buffer.from("fake tgz bytes"), { status: 200 });
      }),
    );

    __setNpmDepsForTest({
      execFile: ((
        _cmd: string,
        args: string[],
        _opts: unknown,
        cb: (error: Error | null, stdout: string | Buffer, stderr: string | Buffer) => void,
      ) => {
        if (args[0] === "-tvzf") {
          cb(null, "-rw-r--r-- 0 root root 500000 Feb 11 00:00 package/src/big.ts", "");
          return;
        }
        if (args[0] === "-xOzf") {
          cb(null, Buffer.alloc(300 * 1024 + 1, "a"), Buffer.from(""));
          return;
        }
        cb(new Error("unexpected tar command"), "", "");
      }) as any,
    });

    await expect(fetchNpmPackageFiles("npm install foo")).rejects.toMatchObject({
      code: "npm_extracted_file_too_large",
    });
  });

  it("throws typed error when tarball exceeds size limit", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string) => {
        if (input.startsWith("https://registry.npmjs.org/")) {
          return new Response(
            JSON.stringify({
              "dist-tags": { latest: "1.0.0" },
              versions: {
                "1.0.0": { dist: { tarball: "https://registry.npmjs.org/foo/-/foo-1.0.0.tgz" } },
              },
            }),
            { status: 200 },
          );
        }
        return new Response(Buffer.from("large tarball payload"), { status: 200 });
      }),
    );

    await expect(fetchNpmPackageFiles("npm install foo", { maxTarballBytes: 5 })).rejects.toMatchObject({
      code: "npm_tarball_too_large",
    });
  });

  it("resolves npx skills add owner/repo to github target with discovered skill roots", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string) => {
        if (input.includes("/repos/openclaw/openclaw") && !input.includes("/git/trees/")) {
          return new Response(JSON.stringify({ default_branch: "main" }), { status: 200 });
        }
        if (input.includes("/repos/openclaw/openclaw/git/trees/main")) {
          return new Response(
            JSON.stringify({
              tree: [
                { path: "skills/a/SKILL.md", type: "blob" },
                { path: ".agents/skills/b/SKILL.md", type: "blob" },
                { path: "README.md", type: "blob" },
              ],
            }),
            { status: 200 },
          );
        }
        return new Response("not found", { status: 404 });
      }),
    );

    const resolved = await resolveSkillsAddGitHubTarget("npx skills add openclaw/openclaw");
    expect(resolved).toEqual({
      repoUrl: "https://github.com/openclaw/openclaw",
      skillRoots: ["skills/a", ".agents/skills/b"],
    });
  });
});
