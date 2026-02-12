/**
 * Sample Scan Output
 *
 * This file demonstrates the scan engine output format
 * matching the spec contract (Section 8: Report Data Contract).
 */

import { runScan, validateReport, ScanReport, MockFile } from './engine';

/**
 * Sample 1: Clean Repository (Grade A, Safe)
 *
 * Represents a well-maintained project with no security issues.
 */
export const SAMPLE_CLEAN_REPO: MockFile[] = [
  {
    path: 'src/index.ts',
    content: `/**
 * Main application entry point
 */

import express from 'express';

const app = express();
const port = process.env.PORT || 3000;

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(port, () => {
  console.log(\`Server running on port \${port}\`);
});
`,
  },
  {
    path: 'src/utils/helpers.ts',
    content: `/**
 * Utility helper functions
 */

export function formatDate(date: Date): string {
  return date.toISOString();
}

export function sanitizeInput(input: string): string {
  return input.trim().substring(0, 100);
}
`,
  },
  {
    path: '.env.example',
    content: `# Environment variables template
DATABASE_URL=postgresql://user:password@localhost:5432/db
API_KEY=your_api_key_here
SECRET_KEY=your_secret_key_here
`,
  },
];

/**
 * Sample 2: Repository with Some Issues (Grade B, Needs Review)
 *
 * Represents a typical project with some security concerns.
 */
export const SAMPLE_WITH_ISSUES: MockFile[] = [
  {
    path: 'src/index.ts',
    content: `import express from 'express';
import { exec } from 'child_process';

const app = express();

// Issue: Command execution with shell enabled
app.get('/api/ping', (req, res) => {
  const host = req.query.host as string;
  exec(\`ping -c 1 \${host}\`, { shell: true }, (error, stdout) => {
    if (error) {
      res.status(500).json({ error: 'Ping failed' });
      return;
    }
    res.json({ output: stdout });
  });
});

app.listen(3000);
`,
  },
  {
    path: 'src/config.ts',
    content: `// Issue: Hard-coded API key (commented out but still detected)
// const API_KEY = "sk-1234567890abcdefghijklmnopqrstuvwxyz1234567890abcd";

export const config = {
  apiKey: process.env.API_KEY || '',
  debug: process.env.NODE_ENV !== 'production',
};
`,
  },
  {
    path: 'scripts/setup.sh',
    content: `#!/bin/bash
# Setup script for development environment

echo "Setting up development environment..."

# Issue: Download and execute pattern
curl -sSL https://raw.githubusercontent.com/example/setup/main/install.sh | bash

echo "Setup complete!"
`,
  },
];

/**
 * Sample 3: Repository with Critical Issues (Grade C, Risky)
 *
 * Represents a project with severe security issues.
 */
export const SAMPLE_CRITICAL_ISSUES: MockFile[] = [
  {
    path: 'src/index.js',
    content: `const express = require('express');
const { execSync } = require('child_process');

const app = express();

// Critical: eval of downloaded content
app.get('/api/load-plugin', (req, res) => {
  const pluginUrl = req.query.url;
  const code = require('child_process').execSync(\`curl \${pluginUrl}\`).toString();
  eval(code);
  res.json({ loaded: true });
});

// Critical: Hard-coded AWS key
const AWS_ACCESS_KEY = 'AKIAIOSFODNN7EXAMPLE';
const AWS_SECRET_KEY = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY';

app.listen(3000);
`,
  },
  {
    path: 'config/database.js',
    content: `module.exports = {
  // Critical: Hard-coded database URL with credentials
  databaseUrl: 'postgresql://admin:SuperSecret123@db.example.com:5432/prod',
  redis: {
    url: 'redis://:redis_password_here@localhost:6379',
  },
};
`,
  },
  {
    path: 'private-key.pem',
    content: `-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEAyKf7K7F2xHlN8FoQ6zV8KL3qwP9xM4qR7jN2sT5fY8gH2nL
1kO9rJ6mP3sL8wQ4jN7tR6yK5fP2vL9mO1iN8sK6jQ3xM5rL7nP1tK8lO2iN9rK
7jQ4xM6kL8oP2uK9mO3jN0sK8jQ5yM7lK9oP3vL0mN4jO1sK9kQ6zM8lN0oP4wM1
nO5jP1sL2kN7kQ9zM2oP5xN3jQ8zL3kQ0oP6yN4kR9zL4kR1oP7zN5kS0zL5kR2o
-----END RSA PRIVATE KEY-----
`,
  },
];

/**
 * Generate sample reports.
 */
export async function generateSampleReports(): Promise<{
  clean: ScanReport;
  withIssues: ScanReport;
  critical: ScanReport;
}> {
  const clean = await runScan('https://github.com/example/clean-repo', SAMPLE_CLEAN_REPO);
  const withIssues = await runScan('https://github.com/example/typical-repo', SAMPLE_WITH_ISSUES);
  const critical = await runScan('https://github.com/example/risky-repo', SAMPLE_CRITICAL_ISSUES);

  return { clean, withIssues, critical };
}

/**
 * Sample output JSON for clean repository (Grade A).
 */
export const SAMPLE_OUTPUT_CLEAN: ScanReport = {
  id: 'scan_l0abc123xyz',
  repoUrl: 'https://github.com/example/clean-repo',
  score: 100,
  grade: 'A',
  status: 'safe',
  summary: {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  },
  findings: [],
  engineVersion: 'v0.1',
  scannedAt: '2026-02-11T00:00:00.000Z',
};

/**
 * Sample output JSON for repository with issues (Grade B).
 */
export const SAMPLE_OUTPUT_WITH_ISSUES: ScanReport = {
  id: 'scan_l1def456uvw',
  repoUrl: 'https://github.com/example/typical-repo',
  score: 77,
  grade: 'B',
  status: 'needs_review',
  summary: {
    critical: 0,
    high: 1,
    medium: 1,
    low: 0,
  },
  findings: [
    {
      ruleId: 'CMD_EXEC_SHELL_TRUE',
      severity: 'medium',
      title: 'Shell execution enabled',
      file: 'src/index.ts',
      line: 10,
      snippet: 'exec(`ping -c 1 ${host}`, { shell: true }, (error, stdout) => {',
      recommendation: 'Avoid shell: true when possible. If required, strictly validate input.',
    },
    {
      ruleId: 'DOWNLOAD_EXEC_CURL_PIPE',
      severity: 'high',
      title: 'Download and execute pattern detected',
      file: 'scripts/setup.sh',
      line: 7,
      snippet: 'curl -sSL https://raw.githubusercontent.com/example/setup/main/install.sh | bash',
      recommendation: 'Avoid downloading and executing code directly. Download to a file, review, then execute separately.',
    },
  ],
  engineVersion: 'v0.1',
  scannedAt: '2026-02-11T00:00:00.000Z',
};

/**
 * Sample output JSON for repository with critical issues (Grade C).
 */
export const SAMPLE_OUTPUT_CRITICAL: ScanReport = {
  id: 'scan_l2ghi789rst',
  repoUrl: 'https://github.com/example/risky-repo',
  score: 45,
  grade: 'C',
  status: 'risky',
  summary: {
    critical: 4,
    high: 1,
    medium: 0,
    low: 0,
  },
  findings: [
    {
      ruleId: 'DOWNLOAD_EXEC_EVAL',
      severity: 'critical',
      title: 'Dynamic evaluation of downloaded code',
      file: 'src/index.js',
      line: 8,
      snippet: 'eval(code);',
      recommendation: 'Never evaluate dynamically downloaded code. Use proper module loading and code review.',
    },
    {
      ruleId: 'SECRET_API_KEY',
      severity: 'critical',
      title: 'Hard-coded API key or token',
      file: 'src/index.js',
      line: 13,
      snippet: 'const AWS_ACCESS_KEY = \'AKIAIOSFODNN7EXAMPLE\';',
      recommendation: 'Move API keys to environment variables. Never commit credentials to source control.',
    },
    {
      ruleId: 'SECRET_DATABASE_URL',
      severity: 'high',
      title: 'Hard-coded database connection string',
      file: 'config/database.js',
      line: 3,
      snippet: 'databaseUrl: \'postgresql://admin:SuperSecret123@db.example.com:5432/prod\',',
      recommendation: 'Store database URLs in environment variables.',
    },
    {
      ruleId: 'SECRET_PRIVATE_KEY',
      severity: 'critical',
      title: 'Hard-coded private key detected',
      file: 'private-key.pem',
      line: 1,
      snippet: '-----BEGIN RSA PRIVATE KEY-----',
      recommendation: 'Never commit private keys to source control. Use secure key management.',
    },
    {
      ruleId: 'SECRET_PASSWORD',
      severity: 'critical',
      title: 'Hard-coded password detected',
      file: 'config/database.js',
      line: 6,
      snippet: 'url: \'redis://:redis_password_here@localhost:6379\',',
      recommendation: 'Use secure authentication and environment variables for credentials.',
    },
  ],
  engineVersion: 'v0.1',
  scannedAt: '2026-02-11T00:00:00.000Z',
};

/**
 * Validate all sample outputs against the spec contract.
 */
export function validateAllSamples(): boolean {
  const cleanValid = validateReport(SAMPLE_OUTPUT_CLEAN);
  const withIssuesValid = validateReport(SAMPLE_OUTPUT_WITH_ISSUES);
  const criticalValid = validateReport(SAMPLE_OUTPUT_CRITICAL);

  return cleanValid && withIssuesValid && criticalValid;
}
