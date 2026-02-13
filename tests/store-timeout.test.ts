import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAndStoreReport, __resetScanRuntimeDepsForTest, __setScanRuntimeDepsForTest } from '@/lib/store';
import { abuseGuard } from '@/lib/scan/abuse-guard';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('store timeout boundary', () => {
  const originalVercel = process.env.VERCEL;

  beforeEach(() => {
    delete process.env.VERCEL;
  });

  afterEach(() => {
    if (originalVercel === undefined) {
      delete process.env.VERCEL;
    } else {
      process.env.VERCEL = originalVercel;
    }
    __resetScanRuntimeDepsForTest();
    vi.restoreAllMocks();
  });

  it('returns scan_timeout and still runs cleanup for the intake workspace', async () => {
    const cleanupSpy = vi.fn(async () => {});

    __setScanRuntimeDepsForTest({
      fetchRepoFiles: async () => ({
        files: [{ path: 'src/index.ts', content: 'export const x = 1;\n' }],
        workspaceDir: '/tmp/mock-timeout-scan',
        filesSkipped: 0,
        cleanup: cleanupSpy,
      }),
      fetchNpmFiles: async () => {
        throw new Error('not used');
      },
      resolveSkillsAddGitHub: async () => null,
      runSemgrep: async () => {
        await sleep(80);
        return { findings: [] };
      },
      runGitleaks: async () => {
        await sleep(80);
        return { findings: [] };
      },
    });

    vi.spyOn(abuseGuard, 'getHardTimeoutMs').mockReturnValue(10);

    await expect(createAndStoreReport('https://github.com/org/repo')).rejects.toMatchObject({
      code: 'scan_timeout',
    });

    // Timeout does not cancel the underlying task; cleanup should still happen once task settles.
    await sleep(150);
    expect(cleanupSpy).toHaveBeenCalledTimes(1);
  });
});
