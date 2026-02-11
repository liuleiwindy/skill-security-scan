import fs from "node:fs";
import path from "node:path";
import { sql } from "@vercel/postgres";
import type { ScanReport } from "./scan/engine";
import { runScan } from "./scan/engine";
import { buildMockFilesForRepo } from "./scan/mock-files";

type StoreShape = {
  reports: Map<string, ScanReport>;
};

declare global {
  // eslint-disable-next-line no-var
  var __securityScanStore: StoreShape | undefined;
  // eslint-disable-next-line no-var
  var __securityScanStoreTableInit: Promise<void> | undefined;
}

const REPORTS_DIR = path.join(process.cwd(), "data", "reports");
// 检查环境变量是否存在且非空
const POSTGRES_URL = process.env.POSTGRES_URL?.trim();
const DATABASE_URL = process.env.DATABASE_URL?.trim();
const USE_POSTGRES = Boolean(POSTGRES_URL || DATABASE_URL);

/** Vercel/serverless 下项目目录只读，必须用 Postgres；未配置时给出明确错误。 */
export function requirePostgresForProduction(): void {
  if (USE_POSTGRES) return;
  if (process.env.VERCEL === "1") {
    console.error('Database configuration check failed:', {
      VERCEL: process.env.VERCEL,
      POSTGRES_URL: POSTGRES_URL ? `[${POSTGRES_URL.length} chars]` : 'not set',
      DATABASE_URL: DATABASE_URL ? `[${DATABASE_URL.length} chars]` : 'not set',
    });
    throw new Error(
      "Storage not configured. Set POSTGRES_URL or DATABASE_URL in Vercel Environment Variables. See README."
    );
  }
}

function ensureReportsDir() {
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }
}

function reportFilePath(id: string): string {
  return path.join(REPORTS_DIR, `${id}.json`);
}

function writeReport(report: ScanReport) {
  ensureReportsDir();
  const target = reportFilePath(report.id);
  const temp = `${target}.tmp`;
  const serialized = JSON.stringify(report, null, 2);
  fs.writeFileSync(temp, serialized, "utf8");
  fs.renameSync(temp, target);
}

function readReport(id: string): ScanReport | null {
  ensureReportsDir();
  const target = reportFilePath(id);
  if (!fs.existsSync(target)) return null;

  try {
    const raw = fs.readFileSync(target, "utf8");
    return JSON.parse(raw) as ScanReport;
  } catch {
    return null;
  }
}

function getStore(): StoreShape {
  if (!globalThis.__securityScanStore) {
    globalThis.__securityScanStore = {
      reports: new Map<string, ScanReport>(),
    };
  }
  return globalThis.__securityScanStore;
}

async function ensureTable() {
  if (!USE_POSTGRES) return;
  if (!globalThis.__securityScanStoreTableInit) {
    globalThis.__securityScanStoreTableInit = sql`
      CREATE TABLE IF NOT EXISTS scan_reports (
        id TEXT PRIMARY KEY,
        report JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `.then(() => undefined);
  }
  await globalThis.__securityScanStoreTableInit;
}

async function writeReportPostgres(report: ScanReport) {
  await ensureTable();
  await sql`
    INSERT INTO scan_reports (id, report)
    VALUES (${report.id}, ${JSON.stringify(report)}::jsonb)
    ON CONFLICT (id) DO UPDATE SET report = EXCLUDED.report;
  `;
}

async function readReportPostgres(id: string): Promise<ScanReport | null> {
  await ensureTable();
  const result = await sql<{ report: ScanReport }>`
    SELECT report
    FROM scan_reports
    WHERE id = ${id}
    LIMIT 1;
  `;
  if (result.rows.length === 0) return null;
  return result.rows[0].report;
}

export async function createAndStoreReport(repoUrl: string): Promise<ScanReport> {
  requirePostgresForProduction();
  const report = runScan(repoUrl, buildMockFilesForRepo(repoUrl));
  if (USE_POSTGRES) {
    await writeReportPostgres(report);
  } else {
    writeReport(report);
  }
  getStore().reports.set(report.id, report);
  return report;
}

export async function getStoredReport(id: string): Promise<ScanReport | null> {
  const inMemory = getStore().reports.get(id);
  if (inMemory) return inMemory;

  const report = USE_POSTGRES ? await readReportPostgres(id) : readReport(id);
  if (report) {
    getStore().reports.set(id, report);
  }
  return report;
}
