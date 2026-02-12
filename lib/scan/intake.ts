import type { MockFile } from "./scan-types";
import type { GitHubFetchOptions, GitHubFetchResult } from "./github";
import { classifyScanInput, type NpmFetchOptions, type NpmFetchResult, type SkillsAddGitHubTarget } from "./npm";
import { prioritizeSkillRoots, SKILLS_ADD_GITHUB_TIMEOUT_MS, SKILLS_ADD_MAX_ROOTS } from "./scan-policy";

export type IntakeKind = "github_url" | "npm_command";

export interface IntakeResultBase {
  kind: IntakeKind;
  files: MockFile[];
  workspaceDir: string;
  filesSkipped: number;
  cleanup: () => Promise<void>;
}

export interface GithubIntakeResult extends IntakeResultBase {
  kind: "github_url";
  effectiveRepoUrl: string;
}

export interface NpmIntakeResult extends IntakeResultBase {
  kind: "npm_command";
  packageName: string;
  packageVersion: string;
}

export type IntakeResult = GithubIntakeResult | NpmIntakeResult;

export interface IntakeDeps {
  fetchRepoFiles: (repoUrl: string, options?: GitHubFetchOptions) => Promise<GitHubFetchResult>;
  fetchNpmFiles: (input: string, options?: NpmFetchOptions) => Promise<NpmFetchResult>;
  resolveSkillsAddGitHub: (input: string) => Promise<SkillsAddGitHubTarget | null>;
}

export async function runIntakeFromInput(
  input: string,
  deps: IntakeDeps,
): Promise<{ intake: IntakeResult; effectiveRepoUrl: string; npmMeta: NpmFetchResult | null }> {
  const kind = classifyScanInput(input);

  if (kind === "npm_command") {
    const skillsGitHubTarget = await deps.resolveSkillsAddGitHub(input).catch(() => null);
    if (skillsGitHubTarget) {
      const prioritizedSkillRoots = prioritizeSkillRoots(skillsGitHubTarget.skillRoots, SKILLS_ADD_MAX_ROOTS);
      const githubOptions: GitHubFetchOptions = {
        timeoutMs: SKILLS_ADD_GITHUB_TIMEOUT_MS,
        ...(prioritizedSkillRoots.length > 0 ? { subPaths: prioritizedSkillRoots } : {}),
      };
      const githubResult = await deps.fetchRepoFiles(skillsGitHubTarget.repoUrl, githubOptions);
      const intake: GithubIntakeResult = {
        kind: "github_url",
        files: githubResult.files,
        workspaceDir: githubResult.workspaceDir,
        filesSkipped: githubResult.filesSkipped,
        cleanup: githubResult.cleanup,
        effectiveRepoUrl: skillsGitHubTarget.repoUrl,
      };
      return { intake, effectiveRepoUrl: skillsGitHubTarget.repoUrl, npmMeta: null };
    }

    const npmResult = await deps.fetchNpmFiles(input);
    const intake: NpmIntakeResult = {
      kind: "npm_command",
      files: npmResult.files,
      workspaceDir: npmResult.workspaceDir,
      filesSkipped: npmResult.filesSkipped,
      cleanup: npmResult.cleanup,
      packageName: npmResult.packageName,
      packageVersion: npmResult.packageVersion,
    };
    return { intake, effectiveRepoUrl: input, npmMeta: npmResult };
  }

  // Keep backward-compatible behavior: unknown input follows GitHub intake path
  // and lets downstream parser/error mapping decide.
  const githubResult = await deps.fetchRepoFiles(input);
  const intake: GithubIntakeResult = {
    kind: "github_url",
    files: githubResult.files,
    workspaceDir: githubResult.workspaceDir,
    filesSkipped: githubResult.filesSkipped,
    cleanup: githubResult.cleanup,
    effectiveRepoUrl: input,
  };
  return { intake, effectiveRepoUrl: input, npmMeta: null };
}
