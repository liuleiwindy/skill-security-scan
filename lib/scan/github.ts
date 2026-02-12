import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { MockFile, ScanOptions } from "./scan-types";
import { DEFAULT_SCAN_OPTIONS, GITHUB_DEFAULT_TIMEOUT_MS, GITHUB_DEFAULT_MAX_FILE_BYTES } from "./scan-policy";

export type RepoFetchErrorCode =
  | "repo_not_found"
  | "repo_private"
  | "github_rate_limited"
  | "repo_access_limited"
  | "repo_fetch_failed"
  | "scan_timeout"
  | "invalid_package_input"
  | "npm_package_not_found"
  | "npm_tarball_too_large"
  | "npm_extracted_files_exceeded"
  | "npm_extracted_file_too_large"
  | "npm_fetch_failed";

export class RepoFetchError extends Error {
  code: RepoFetchErrorCode;

  constructor(code: RepoFetchErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

export interface GitHubRepoRef {
  owner: string;
  repo: string;
  ref?: string;
  subPath?: string;
}

export interface GitHubFetchOptions extends ScanOptions {
  timeoutMs?: number;
  maxFileBytes?: number;
  subPaths?: string[];
}

export interface GitHubFetchResult {
  files: MockFile[];
  workspaceDir: string;
  cleanup: () => Promise<void>;
  filesSkipped: number;
}

type GitHubTreeItem = {
  path: string;
  type: string;
  size?: number;
  sha?: string;
};

function buildGitHubHeaders(): Record<string, string> {
  const token = process.env.GITHUB_TOKEN?.trim();
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "skill-security-scan-v0.2.1",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export function parseGitHubRepoUrl(repoUrl: string): GitHubRepoRef {
  let parsed: URL;
  try {
    parsed = new URL(repoUrl);
  } catch {
    throw new RepoFetchError("repo_fetch_failed", "Invalid repository URL format");
  }

  if (parsed.hostname !== "github.com") {
    throw new RepoFetchError("repo_fetch_failed", "Only github.com repositories are supported");
  }

  const parts = parsed.pathname.split("/").filter(Boolean);
  if (parts.length < 2) {
    throw new RepoFetchError("repo_fetch_failed", "Repository URL must include owner and repo");
  }

  const owner = parts[0];
  const repo = parts[1].replace(/\.git$/, "");
  if (!owner || !repo) {
    throw new RepoFetchError("repo_fetch_failed", "Invalid repository owner or name");
  }

  if (parts[2] === "tree" && parts[3]) {
    return {
      owner,
      repo,
      ref: decodeURIComponent(parts[3]),
      subPath: parts.slice(4).map(decodeURIComponent).join("/"),
    };
  }

  if (parts[2] === "blob" && parts[3]) {
    return {
      owner,
      repo,
      ref: decodeURIComponent(parts[3]),
      subPath: parts.slice(4).map(decodeURIComponent).join("/"),
    };
  }

  return { owner, repo };
}

function includeFileByScanOptions(filePath: string, options: ScanOptions): boolean {
  const excludeDirs = options.excludeDirs ?? [];
  const includeExtensions = options.includeExtensions ?? [];

  const pathParts = filePath.split("/");
  for (const part of pathParts) {
    if (excludeDirs.includes(part)) {
      return false;
    }
  }
  return includeExtensions.some((ext) => filePath.endsWith(ext));
}

async function fetchJson<T>(url: string, timeoutMs: number): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: buildGitHubHeaders(),
      signal: controller.signal,
    });
    if (res.status === 404) {
      throw new RepoFetchError("repo_not_found", "Repository, branch, or path was not found");
    }
    if (res.status === 401) {
      throw new RepoFetchError("repo_private", "Repository is private or authentication is required");
    }
    if (res.status === 403) {
      const remaining = res.headers.get("x-ratelimit-remaining");
      const bodyText = await res.text();
      let message = bodyText;
      try {
        const bodyJson = JSON.parse(bodyText) as { message?: string };
        message = bodyJson.message || bodyText;
      } catch {
        // keep text fallback
      }
      if (remaining === "0" || /rate limit/i.test(message)) {
        throw new RepoFetchError("github_rate_limited", "GitHub API rate limit exceeded, please retry later");
      }
      throw new RepoFetchError(
        "repo_access_limited",
        "Repository access is currently limited by GitHub policy or permissions",
      );
    }
    if (!res.ok) {
      throw new RepoFetchError("repo_fetch_failed", `GitHub API request failed: ${res.status}`);
    }
    return (await res.json()) as T;
  } catch (error) {
    if (error instanceof RepoFetchError) {
      throw error;
    }
    if (error instanceof Error && error.name === "AbortError") {
      throw new RepoFetchError("scan_timeout", `Scan timed out after ${timeoutMs}ms`);
    }
    throw new RepoFetchError("repo_fetch_failed", "Failed to fetch repository metadata");
  } finally {
    clearTimeout(timer);
  }
}

async function fetchBlobUtf8(
  owner: string,
  repo: string,
  sha: string,
  timeoutMs: number,
): Promise<string | null> {
  const blob = await fetchJson<{ content?: string; encoding?: string }>(
    `https://api.github.com/repos/${owner}/${repo}/git/blobs/${sha}`,
    timeoutMs,
  );
  const encoded = (blob.content || "").replace(/\n/g, "");
  if (!encoded) {
    return null;
  }
  if (blob.encoding !== "base64") {
    return null;
  }
  try {
    return Buffer.from(encoded, "base64").toString("utf8");
  } catch {
    return null;
  }
}

export async function fetchGitHubRepoFiles(
  repoUrl: string,
  options: GitHubFetchOptions = {},
): Promise<GitHubFetchResult> {
  const timeoutMs = options.timeoutMs ?? GITHUB_DEFAULT_TIMEOUT_MS;
  const maxFileBytes = options.maxFileBytes ?? GITHUB_DEFAULT_MAX_FILE_BYTES;
  const normalizedOptions: ScanOptions = {
    maxFiles: options.maxFiles ?? DEFAULT_SCAN_OPTIONS.maxFiles ?? 100,
    includeExtensions: options.includeExtensions ?? DEFAULT_SCAN_OPTIONS.includeExtensions ?? [],
    excludeDirs: options.excludeDirs ?? DEFAULT_SCAN_OPTIONS.excludeDirs ?? [],
    enableExternalPI: DEFAULT_SCAN_OPTIONS.enableExternalPI ?? true,
    fallbackToLocal: DEFAULT_SCAN_OPTIONS.fallbackToLocal ?? true,
  };
  const deadline = Date.now() + timeoutMs;
  const remainingTimeoutMs = () => {
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      throw new RepoFetchError("scan_timeout", `Scan timed out after ${timeoutMs}ms`);
    }
    return remaining;
  };

  const normalizedSubPaths = (options.subPaths || [])
    .map((subPath) => subPath.trim().replace(/^\/+|\/+$/g, ""))
    .filter(Boolean);

  const parsed = parseGitHubRepoUrl(repoUrl);
  const repoMeta = await fetchJson<{ default_branch: string }>(
    `https://api.github.com/repos/${parsed.owner}/${parsed.repo}`,
    remainingTimeoutMs(),
  );
  const ref = parsed.ref || repoMeta.default_branch;
  const treePayload = await fetchJson<{ tree?: GitHubTreeItem[] }>(
    `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/git/trees/${encodeURIComponent(ref)}?recursive=1`,
    remainingTimeoutMs(),
  );
  if (!Array.isArray(treePayload.tree)) {
    throw new RepoFetchError("repo_fetch_failed", "Repository tree response is invalid");
  }

  const candidateBlobs = treePayload.tree
    .filter((item) => item.type === "blob")
    .filter((item) => {
      if (normalizedSubPaths.length > 0) {
        return normalizedSubPaths.some(
          (subPath) => item.path === subPath || item.path.startsWith(`${subPath}/`),
        );
      }
      if (!parsed.subPath) return true;
      return item.path === parsed.subPath || item.path.startsWith(`${parsed.subPath}/`);
    })
    .filter((item) => (item.size ?? 0) <= maxFileBytes);

  const selectedByExtension = candidateBlobs
    .filter((item) => includeFileByScanOptions(item.path, normalizedOptions))
    .slice(0, normalizedOptions.maxFiles);

  // Fallback: when extension filters match nothing (common in skill repos with docs-only subpaths),
  // still try bounded text-blob scanning and let binary/null-byte checks skip non-text files.
  const selected =
    selectedByExtension.length > 0
      ? selectedByExtension
      : candidateBlobs.slice(0, normalizedOptions.maxFiles);

  if (selected.length === 0) {
    throw new RepoFetchError("repo_fetch_failed", "No scannable files found in repository");
  }

  const workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), "skill-scan-"));
  let filesSkipped = 0;
  const files: MockFile[] = [];

  for (const item of selected) {
    if ((item.size ?? 0) === 0) {
      filesSkipped += 1;
      continue;
    }
    if (!item.sha) {
      filesSkipped += 1;
      continue;
    }
    let content: string | null;
    try {
      content = await fetchBlobUtf8(parsed.owner, parsed.repo, item.sha, remainingTimeoutMs());
    } catch (error) {
      if ((error as { code?: string } | undefined)?.code === "repo_fetch_failed") {
        filesSkipped += 1;
        continue;
      }
      throw error;
    }
    if (!content) {
      filesSkipped += 1;
      continue;
    }
    if (content.includes("\u0000")) {
      filesSkipped += 1;
      continue;
    }
    files.push({ path: item.path, content: content! });

    const fullPath = path.join(workspaceDir, item.path);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content!, "utf8");
  }

  if (files.length === 0) {
    await fs.rm(workspaceDir, { recursive: true, force: true });
    throw new RepoFetchError("repo_fetch_failed", "No text files available for scanning");
  }

  return {
    files,
    workspaceDir,
    filesSkipped,
    cleanup: async () => {
      await fs.rm(workspaceDir, { recursive: true, force: true });
    },
  };
}
