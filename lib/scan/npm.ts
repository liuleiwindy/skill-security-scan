import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { gunzipSync } from "node:zlib";
import type { MockFile, ScanOptions } from "./scan-types";
import {
  DEFAULT_SCAN_OPTIONS,
  NPM_DEFAULT_MAX_TARBALL_BYTES,
  NPM_DEFAULT_MAX_EXTRACTED_FILES,
  NPM_DEFAULT_MAX_FILE_BYTES,
  getDefaultIntakeTimeoutMs,
} from "./scan-policy";
import { RepoFetchError } from "./github";

type TarEntry = {
  entryPath: string;
  type: "file" | "dir" | "symlink" | "other";
  content: Buffer;
};

type NpmDeps = {
  extractTarEntries: (tarball: Buffer, timeoutMs: number) => Promise<TarEntry[]>;
};

export type ScanInputKind = "github_url" | "npm_command" | "unknown";

export interface ParsedNpmCommand {
  command: "npx" | "npm";
  packageName: string;
  packageSpec?: string;
}

export interface SkillsAddGitHubTarget {
  repoUrl: string;
  skillRoots: string[];
}

export interface NpmFetchOptions extends ScanOptions {
  timeoutMs?: number;
  maxTarballBytes?: number;
  maxExtractedFiles?: number;
  maxFileBytes?: number;
}

export interface NpmFetchResult {
  files: MockFile[];
  workspaceDir: string;
  cleanup: () => Promise<void>;
  filesSkipped: number;
  packageName: string;
  packageVersion: string;
}

type NpmRegistryResponse = {
  "dist-tags"?: Record<string, string>;
  versions?: Record<string, { version?: string; dist?: { tarball?: string } }>;
};

function withTimeoutError<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return promise.catch((error) => {
    const err = error as { name?: string; killed?: boolean; signal?: string };
    if (err?.name === "AbortError" || err?.killed || err?.signal === "SIGTERM") {
      throw new RepoFetchError("scan_timeout", `Scan timed out after ${timeoutMs}ms`);
    }
    throw error;
  });
}

function parseSemverParts(version: string): number[] | null {
  if (!/^\d+\.\d+\.\d+$/.test(version)) return null;
  return version.split(".").map((part) => Number(part));
}

function compareSemver(a: string, b: string): number {
  const aParts = parseSemverParts(a);
  const bParts = parseSemverParts(b);
  if (!aParts || !bParts) return a.localeCompare(b);
  for (let i = 0; i < 3; i += 1) {
    if (aParts[i] !== bParts[i]) return aParts[i] - bParts[i];
  }
  return 0;
}

function looksLikePreRelease(version: string): boolean {
  return version.includes("-");
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

function tokenizeCommand(input: string): string[] {
  return input.trim().split(/\s+/).filter(Boolean);
}

function extractPackageToken(tokens: string[]): string | null {
  const head = tokens[0];
  if (head === "npx") {
    for (let i = 1; i < tokens.length; i += 1) {
      if (!tokens[i].startsWith("-")) return tokens[i];
    }
    return null;
  }

  if (head === "npm" && (tokens[1] === "i" || tokens[1] === "install")) {
    for (let i = 2; i < tokens.length; i += 1) {
      if (!tokens[i].startsWith("-")) return tokens[i];
    }
    return null;
  }

  return null;
}

function parsePackageToken(token: string): { name: string; spec?: string } {
  if (!token) {
    throw new RepoFetchError("invalid_package_input", "Unsupported npm/npx command format");
  }

  if (token.startsWith("@")) {
    const slashIndex = token.indexOf("/");
    if (slashIndex <= 1 || slashIndex === token.length - 1) {
      throw new RepoFetchError("invalid_package_input", "Invalid scoped package format");
    }
    const specIndex = token.lastIndexOf("@");
    if (specIndex > slashIndex + 1) {
      return {
        name: token.slice(0, specIndex),
        spec: token.slice(specIndex + 1),
      };
    }
    return { name: token };
  }

  const specIndex = token.lastIndexOf("@");
  if (specIndex > 0) {
    return {
      name: token.slice(0, specIndex),
      spec: token.slice(specIndex + 1),
    };
  }

  return { name: token };
}

function validatePackageName(name: string): boolean {
  return /^(@[a-z0-9][\w.-]*\/[a-z0-9][\w.-]*|[a-z0-9][\w.-]*)$/i.test(name);
}

export function classifyScanInput(input: string): ScanInputKind {
  const trimmed = input.trim();
  if (trimmed.startsWith("https://github.com/")) return "github_url";
  if (/^(npx|npm)\b/.test(trimmed)) return "npm_command";
  return "unknown";
}

function buildGitHubHeaders(): Record<string, string> {
  const token = process.env.GITHUB_TOKEN?.trim();
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "skill-security-scan-v0.2.2",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

function extractSkillsAddSource(input: string): string | null {
  const tokens = tokenizeCommand(input);
  if (tokens.length < 4) return null;
  if (tokens[0] !== "npx" || tokens[1] !== "skills" || tokens[2] !== "add") return null;
  const source = tokens[3];
  if (!source || source.startsWith("-")) return null;
  return source;
}

function parseGitHubOwnerRepo(source: string): { owner: string; repo: string } | null {
  const shorthand = source.match(/^([^/]+)\/([^/]+)$/);
  if (shorthand) {
    return {
      owner: shorthand[1],
      repo: shorthand[2].replace(/\.git$/, ""),
    };
  }

  const urlMatch = source.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (urlMatch) {
    return {
      owner: urlMatch[1],
      repo: urlMatch[2].replace(/\.git$/, ""),
    };
  }
  return null;
}

function uniqueOrdered<T>(items: T[]): T[] {
  return [...new Set(items)];
}

export async function resolveSkillsAddGitHubTarget(input: string): Promise<SkillsAddGitHubTarget | null> {
  const source = extractSkillsAddSource(input);
  if (!source) return null;

  const ownerRepo = parseGitHubOwnerRepo(source);
  if (!ownerRepo) return null;

  const { owner, repo } = ownerRepo;
  const metaRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers: buildGitHubHeaders(),
  });
  if (!metaRes.ok) {
    return {
      repoUrl: `https://github.com/${owner}/${repo}`,
      skillRoots: [],
    };
  }

  const meta = (await metaRes.json()) as { default_branch?: string };
  const ref = meta.default_branch || "main";

  const treeRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${encodeURIComponent(ref)}?recursive=1`,
    { headers: buildGitHubHeaders() },
  );
  if (!treeRes.ok) {
    return {
      repoUrl: `https://github.com/${owner}/${repo}`,
      skillRoots: [],
    };
  }

  const tree = (await treeRes.json()) as {
    tree?: Array<{ path?: string; type?: string }>;
  };
  const skillRoots = uniqueOrdered(
    (tree.tree || [])
      .filter((item) => item.type === "blob" && typeof item.path === "string")
      .map((item) => item.path as string)
      .filter((itemPath) => /(^|\/)SKILL\.md$/i.test(itemPath))
      .map((itemPath) => itemPath.replace(/\/SKILL\.md$/i, ""))
      .filter(Boolean),
  );

  return {
    repoUrl: `https://github.com/${owner}/${repo}`,
    skillRoots,
  };
}

export function parseNpmCommand(input: string): ParsedNpmCommand {
  const tokens = tokenizeCommand(input);
  if (tokens.length === 0) {
    throw new RepoFetchError("invalid_package_input", "Unsupported npm/npx command format");
  }

  const command = tokens[0];
  if (command !== "npx" && command !== "npm") {
    throw new RepoFetchError("invalid_package_input", "Unsupported npm/npx command format");
  }

  if (command === "npm" && tokens[1] !== "i" && tokens[1] !== "install") {
    throw new RepoFetchError("invalid_package_input", "Unsupported npm install command");
  }

  const pkgToken = extractPackageToken(tokens);
  if (!pkgToken) {
    throw new RepoFetchError("invalid_package_input", "Package name is required in npm/npx command");
  }

  const parsed = parsePackageToken(pkgToken);
  if (!validatePackageName(parsed.name)) {
    throw new RepoFetchError("invalid_package_input", "Invalid npm package name in command");
  }

  if (parsed.spec === "") {
    throw new RepoFetchError("invalid_package_input", "Invalid package version/tag in command");
  }

  return {
    command,
    packageName: parsed.name,
    packageSpec: parsed.spec,
  };
}

function encodePackageName(name: string): string {
  if (name.startsWith("@")) return `@${encodeURIComponent(name.slice(1))}`;
  return encodeURIComponent(name);
}

async function fetchNpmMetadata(packageName: string, timeoutMs: number): Promise<NpmRegistryResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`https://registry.npmjs.org/${encodePackageName(packageName)}`, {
      signal: controller.signal,
    });
    if (res.status === 404) {
      throw new RepoFetchError("npm_package_not_found", "Package not found on npm registry");
    }
    if (!res.ok) {
      throw new RepoFetchError("npm_fetch_failed", `Failed to fetch npm package metadata: ${res.status}`);
    }
    return (await res.json()) as NpmRegistryResponse;
  } catch (error) {
    if (error instanceof RepoFetchError) throw error;
    const err = error as { name?: string };
    if (err?.name === "AbortError") {
      throw new RepoFetchError("scan_timeout", `Scan timed out after ${timeoutMs}ms`);
    }
    throw new RepoFetchError("npm_fetch_failed", "Failed to fetch package metadata or tarball");
  } finally {
    clearTimeout(timer);
  }
}

function resolveVersion(meta: NpmRegistryResponse, packageName: string, spec?: string): { version: string; tarballUrl: string } {
  const versions = meta.versions || {};
  const tags = meta["dist-tags"] || {};

  let resolvedVersion: string | undefined;
  if (spec) {
    resolvedVersion = versions[spec] ? spec : tags[spec];
  } else {
    const latest = tags.latest;
    if (latest && versions[latest] && !looksLikePreRelease(latest)) {
      resolvedVersion = latest;
    } else {
      const stableVersions = Object.keys(versions).filter((version) => !looksLikePreRelease(version));
      stableVersions.sort(compareSemver);
      resolvedVersion = stableVersions[stableVersions.length - 1] || latest;
    }
  }

  if (!resolvedVersion || !versions[resolvedVersion]) {
    throw new RepoFetchError("npm_package_not_found", `Package version/tag not found for ${packageName}`);
  }

  const tarballUrl = versions[resolvedVersion]?.dist?.tarball;
  if (!tarballUrl) {
    throw new RepoFetchError("npm_fetch_failed", "Failed to resolve package tarball URL");
  }

  return {
    version: resolvedVersion,
    tarballUrl,
  };
}

async function readResponseBufferWithLimit(
  res: Response,
  maxBytes: number,
  timeoutMs: number,
): Promise<Buffer> {
  const contentLength = res.headers.get("content-length");
  if (contentLength) {
    const size = Number(contentLength);
    if (Number.isFinite(size) && size > maxBytes) {
      throw new RepoFetchError("npm_tarball_too_large", "Package tarball exceeds scan size limit");
    }
  }

  if (!res.body) {
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    if (buffer.length > maxBytes) {
      throw new RepoFetchError("npm_tarball_too_large", "Package tarball exceeds scan size limit");
    }
    return buffer;
  }

  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  const startedAt = Date.now();

  while (true) {
    if (Date.now() - startedAt > timeoutMs) {
      throw new RepoFetchError("scan_timeout", `Scan timed out after ${timeoutMs}ms`);
    }

    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;

    total += value.byteLength;
    if (total > maxBytes) {
      throw new RepoFetchError("npm_tarball_too_large", "Package tarball exceeds scan size limit");
    }
    chunks.push(value);
  }

  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
}

async function downloadTarball(url: string, maxBytes: number, timeoutMs: number): Promise<Buffer> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      throw new RepoFetchError("npm_fetch_failed", `Failed to download npm tarball: ${res.status}`);
    }
    return await readResponseBufferWithLimit(res, maxBytes, timeoutMs);
  } catch (error) {
    if (error instanceof RepoFetchError) throw error;
    const err = error as { name?: string };
    if (err?.name === "AbortError") {
      throw new RepoFetchError("scan_timeout", `Scan timed out after ${timeoutMs}ms`);
    }
    throw new RepoFetchError("npm_fetch_failed", "Failed to fetch package metadata or tarball");
  } finally {
    clearTimeout(timer);
  }
}

function isAllZeroBlock(block: Buffer): boolean {
  for (let i = 0; i < block.length; i += 1) {
    if (block[i] !== 0) return false;
  }
  return true;
}

function readNullTerminatedString(buffer: Buffer, start: number, length: number): string {
  const slice = buffer.subarray(start, start + length);
  const zero = slice.indexOf(0);
  const raw = zero >= 0 ? slice.subarray(0, zero) : slice;
  return raw.toString("utf8").trim();
}

function parseOctal(buffer: Buffer, start: number, length: number): number {
  const raw = readNullTerminatedString(buffer, start, length).replace(/\0/g, "").trim();
  if (!raw) return 0;
  const normalized = raw.replace(/[^0-7]/g, "");
  if (!normalized) return 0;
  return Number.parseInt(normalized, 8);
}

function parseTarEntries(tarBuffer: Buffer): TarEntry[] {
  const entries: TarEntry[] = [];
  let offset = 0;
  while (offset + 512 <= tarBuffer.length) {
    const header = tarBuffer.subarray(offset, offset + 512);
    if (isAllZeroBlock(header)) {
      break;
    }

    const name = readNullTerminatedString(header, 0, 100);
    const prefix = readNullTerminatedString(header, 345, 155);
    const entryPath = prefix ? `${prefix}/${name}` : name;
    const typeFlag = readNullTerminatedString(header, 156, 1) || "0";
    const size = parseOctal(header, 124, 12);
    const contentStart = offset + 512;
    const contentEnd = contentStart + size;
    if (contentEnd > tarBuffer.length) {
      throw new RepoFetchError("npm_fetch_failed", "Failed to extract package entries safely");
    }
    const content = tarBuffer.subarray(contentStart, contentEnd);

    let type: TarEntry["type"] = "other";
    if (typeFlag === "0" || typeFlag === "\0") type = "file";
    if (typeFlag === "5") type = "dir";
    if (typeFlag === "2") type = "symlink";

    entries.push({
      entryPath: entryPath.replace(/^\.\//, ""),
      type,
      content: Buffer.from(content),
    });

    const payloadBlocks = Math.ceil(size / 512);
    offset = contentStart + payloadBlocks * 512;
  }

  return entries;
}

function defaultExtractTarEntries(tarball: Buffer, timeoutMs: number): Promise<TarEntry[]> {
  return withTimeoutError(
    Promise.resolve().then(() => {
      const inflated = gunzipSync(tarball);
      return parseTarEntries(inflated);
    }),
    timeoutMs,
  ).catch((error) => {
    if (error instanceof RepoFetchError) throw error;
    throw new RepoFetchError("npm_fetch_failed", "Failed to extract package entries safely");
  });
}

let npmDeps: NpmDeps = {
  extractTarEntries: defaultExtractTarEntries,
};

export function __setNpmDepsForTest(overrides: Partial<NpmDeps>) {
  npmDeps = {
    ...npmDeps,
    ...overrides,
  };
}

export function __resetNpmDepsForTest() {
  npmDeps = {
    extractTarEntries: defaultExtractTarEntries,
  };
}

function sanitizeTarEntryPath(entryPath: string): string {
  const parts = entryPath.split("/");
  const withoutRoot = parts.length > 1 ? parts.slice(1).join("/") : parts[0];
  const normalized = path.posix.normalize(withoutRoot);

  if (!withoutRoot || normalized === "." || normalized === "") {
    throw new RepoFetchError("npm_fetch_failed", "Failed to extract package entries safely");
  }

  if (path.posix.isAbsolute(normalized) || normalized.startsWith("../") || normalized === "..") {
    throw new RepoFetchError("npm_fetch_failed", "Failed to extract package entries safely");
  }

  return normalized;
}

export async function fetchNpmPackageFiles(input: string, options: NpmFetchOptions = {}): Promise<NpmFetchResult> {
  const timeoutMs = options.timeoutMs ?? getDefaultIntakeTimeoutMs();
  const maxTarballBytes = options.maxTarballBytes ?? NPM_DEFAULT_MAX_TARBALL_BYTES;
  const maxExtractedFiles = options.maxExtractedFiles ?? NPM_DEFAULT_MAX_EXTRACTED_FILES;
  const maxFileBytes = options.maxFileBytes ?? NPM_DEFAULT_MAX_FILE_BYTES;
  const normalizedOptions: ScanOptions = {
    maxFiles: options.maxFiles ?? DEFAULT_SCAN_OPTIONS.maxFiles ?? 100,
    includeExtensions: options.includeExtensions ?? DEFAULT_SCAN_OPTIONS.includeExtensions ?? [],
    excludeDirs: options.excludeDirs ?? DEFAULT_SCAN_OPTIONS.excludeDirs ?? [],
    enableExternalPI: DEFAULT_SCAN_OPTIONS.enableExternalPI ?? true,
    fallbackToLocal: DEFAULT_SCAN_OPTIONS.fallbackToLocal ?? true,
  };

  const deadline = Date.now() + timeoutMs;
  const remainingMs = () => {
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      throw new RepoFetchError("scan_timeout", `Scan timed out after ${timeoutMs}ms`);
    }
    return remaining;
  };

  const parsed = parseNpmCommand(input);
  const metadata = await fetchNpmMetadata(parsed.packageName, remainingMs());
  const resolved = resolveVersion(metadata, parsed.packageName, parsed.packageSpec);
  const tarball = await downloadTarball(resolved.tarballUrl, maxTarballBytes, remainingMs());

  const workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), "skill-npm-scan-"));

  try {
    const entries = await npmDeps.extractTarEntries(tarball, remainingMs());

    const fileEntries = entries.filter((entry) => entry.type === "file");
    if (fileEntries.length > maxExtractedFiles) {
      throw new RepoFetchError("npm_extracted_files_exceeded", "Extracted package file count exceeds scan limit");
    }

    const files: MockFile[] = [];
    let filesSkipped = 0;

    for (const entry of fileEntries) {
      const safePath = sanitizeTarEntryPath(entry.entryPath);

      if (!includeFileByScanOptions(safePath, normalizedOptions)) {
        filesSkipped += 1;
        continue;
      }

      const buffer = entry.content;

      if (buffer.length > maxFileBytes) {
        throw new RepoFetchError("npm_extracted_file_too_large", "An extracted file exceeds per-file scan size limit");
      }

      if (buffer.length === 0) {
        filesSkipped += 1;
        continue;
      }

      const content = buffer.toString("utf8");
      if (content.includes("\u0000")) {
        filesSkipped += 1;
        continue;
      }

      files.push({ path: safePath, content });

      const targetPath = path.join(workspaceDir, safePath);
      await fs.mkdir(path.dirname(targetPath), { recursive: true });
      await fs.writeFile(targetPath, content, "utf8");

      if (normalizedOptions.maxFiles && files.length >= normalizedOptions.maxFiles) {
        break;
      }
    }

    if (files.length === 0) {
      throw new RepoFetchError("npm_fetch_failed", "No text files available for scanning");
    }

    return {
      files,
      workspaceDir,
      filesSkipped,
      packageName: parsed.packageName,
      packageVersion: resolved.version,
      cleanup: async () => {
        await fs.rm(workspaceDir, { recursive: true, force: true });
      },
    };
  } catch (error) {
    await fs.rm(workspaceDir, { recursive: true, force: true });
    if (error instanceof RepoFetchError) {
      throw error;
    }
    throw new RepoFetchError("npm_fetch_failed", "Failed to fetch package metadata or tarball");
  }
}
