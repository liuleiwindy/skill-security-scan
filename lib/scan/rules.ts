/**
 * Lightweight Deterministic Scan Rules
 *
 * Static analysis rules for detecting:
 * 1. Suspicious command execution patterns
 * 2. Download + execute patterns
 * 3. Hard-coded secrets/tokens
 * 4. Prompt injection patterns (V0.2.3)
 *
 * All rules are deterministic and produce findings with clear evidence.
 */

export interface Finding {
  ruleId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  file: string;
  line: number;
  snippet: string;
  recommendation: string;
}

export interface Rule {
  id: string;
  name: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  /**
   * Test function returns findings or null.
   * Deterministic: same input always produces same output.
   */
  test: (content: string, filePath: string) => Finding[];
}

/**
 * Command Execution Rules
 *
 * Detects potentially dangerous command execution patterns.
 */
const commandExecutionRules: Rule[] = [
  {
    id: 'CMD_EXEC_USER_INPUT',
    name: 'Command Execution with User Input',
    severity: 'high',
    description: 'Direct execution of commands containing user input',
    test: (content, filePath) => {
      const findings: Finding[] = [];
      const lines = content.split('\n');

      // Patterns for unsafe command execution with user input
      const patterns = [
        /exec\s*\(\s*[\w\[\]\.]+\s*\+/gi, // exec(userInput + ...)
        /spawn\s*\(\s*[\w\[\]\.]+\s*\+/gi, // spawn(userInput + ...)
        /system\s*\(\s*[\w\[\]\.]+\s*\+/gi, // system(userInput + ...)
        /execSync\s*\(\s*[\w\[\]\.]+\s*\+/gi,
        /\.\s*exec\s*\(\s*[\w\[\]\.]+/gi, // child_process.exec(userInput)
      ];

      lines.forEach((line, index) => {
        patterns.forEach(pattern => {
          const matches = line.match(pattern);
          if (matches) {
            findings.push({
              ruleId: 'CMD_EXEC_USER_INPUT',
              severity: 'high',
              title: 'Command execution with potential user input',
              file: filePath,
              line: index + 1,
              snippet: line.trim(),
              recommendation: 'Validate and sanitize user input before command execution. Use parameterized APIs when available.'
            });
          }
        });
      });

      return findings;
    }
  },
  {
    id: 'CMD_EXEC_SHELL_TRUE',
    name: 'Command Execution with Shell Enabled',
    severity: 'medium',
    description: 'Command execution with explicit shell enable',
    test: (content, filePath) => {
      const findings: Finding[] = [];
      const lines = content.split('\n');

      // Patterns for shell: true usage
      const patterns = [
        /exec\s*\([^)]*shell\s*:\s*true/gi,
        /spawn\s*\([^)]*shell\s*:\s*true/gi,
      ];

      lines.forEach((line, index) => {
        patterns.forEach(pattern => {
          const matches = line.match(pattern);
          if (matches) {
            findings.push({
              ruleId: 'CMD_EXEC_SHELL_TRUE',
              severity: 'medium',
              title: 'Shell execution enabled',
              file: filePath,
              line: index + 1,
              snippet: line.trim(),
              recommendation: 'Avoid shell: true when possible. If required, strictly validate input.'
            });
          }
        });
      });

      return findings;
    }
  }
];

/**
 * Download + Execute Rules
 *
 * Detects patterns where code is downloaded and executed.
 */
const downloadExecuteRules: Rule[] = [
  {
    id: 'DOWNLOAD_EXEC_CURL_PIPE',
    name: 'Download and Execute via Pipe',
    severity: 'critical',
    description: 'Downloading and executing code via curl/bash pipe',
    test: (content, filePath) => {
      const findings: Finding[] = [];
      const lines = content.split('\n');

      // Patterns for download + execute
      const patterns = [
        /curl\s+[^|]+\|\s*(bash|sh|python|node|exec)/gi,
        /wget\s+[^|]+\|\s*(bash|sh|python|node|exec)/gi,
        /fetch\s+[^|]+\|\s*(bash|sh|python|node|exec)/gi,
      ];

      lines.forEach((line, index) => {
        patterns.forEach(pattern => {
          const matches = line.match(pattern);
          if (matches) {
            findings.push({
              ruleId: 'DOWNLOAD_EXEC_CURL_PIPE',
              severity: 'critical',
              title: 'Download and execute pattern detected',
              file: filePath,
              line: index + 1,
              snippet: line.trim(),
              recommendation: 'Avoid downloading and executing code directly. Download to a file, review, then execute separately.'
            });
          }
        });
      });

      return findings;
    }
  },
  {
    id: 'DOWNLOAD_EXEC_EVAL',
    name: 'Download and Evaluate Code',
    severity: 'critical',
    description: 'Downloading code and evaluating it dynamically',
    test: (content, filePath) => {
      const findings: Finding[] = [];
      const lines = content.split('\n');

      // Patterns for eval of downloaded content
      const patterns = [
        /eval\s*\(\s*(fetch|request|get|axios|http\.get)/gi,
        /eval\s*\(\s*\w+\.\w+\s*\+/gi, // eval(downloaded + ...)
      ];

      lines.forEach((line, index) => {
        patterns.forEach(pattern => {
          const matches = line.match(pattern);
          if (matches) {
            findings.push({
              ruleId: 'DOWNLOAD_EXEC_EVAL',
              severity: 'critical',
              title: 'Dynamic evaluation of downloaded code',
              file: filePath,
              line: index + 1,
              snippet: line.trim(),
              recommendation: 'Never evaluate dynamically downloaded code. Use proper module loading and code review.'
            });
          }
        });
      });

      return findings;
    }
  },
  {
    id: 'DOWNLOAD_EXEC_CHILD_PROCESS',
    name: 'Download Execute via Child Process',
    severity: 'high',
    description: 'Child process execution on downloaded content',
    test: (content, filePath) => {
      const findings: Finding[] = [];
      const lines = content.split('\n');

      const patterns = [
        /exec\s*\(\s*(fs\.readFileSync|readFileSync)\s*\([^)]+download/gi,
        /exec\s*\(\s*['"`][^'"`]*(http|curl|wget)/gi,
      ];

      lines.forEach((line, index) => {
        patterns.forEach(pattern => {
          const matches = line.match(pattern);
          if (matches) {
            findings.push({
              ruleId: 'DOWNLOAD_EXEC_CHILD_PROCESS',
              severity: 'high',
              title: 'Potential execution of downloaded content',
              file: filePath,
              line: index + 1,
              snippet: line.trim(),
              recommendation: 'Verify source and content before executing downloaded files.'
            });
          }
        });
      });

      return findings;
    }
  }
];

/**
 * Secret Detection Rules
 *
 * Detects potential hard-coded secrets, tokens, and credentials.
 */
const secretRules: Rule[] = [
  {
    id: 'SECRET_API_KEY',
    name: 'Hard-coded API Key',
    severity: 'critical',
    description: 'Hard-coded API key or token detected',
    test: (content, filePath) => {
      const findings: Finding[] = [];
      const lines = content.split('\n');

      // Common API key patterns (high precision)
      const patterns = [
        // API keys with common prefixes
        /(?:api[_-]?key|apikey|secret[_-]?key|access[_-]?token)\s*[:=]\s*['"`][a-zA-Z0-9]{20,}['"`]/gi,
        // AWS keys
        /AKIA[0-9A-Z]{16}/g,
        // GitHub tokens
        /ghp_[a-zA-Z0-9]{36}/gi,
        /gho_[a-zA-Z0-9]{36}/gi,
        /ghu_[a-zA-Z0-9]{36}/gi,
        /ghs_[a-zA-Z0-9]{36}/gi,
        /ghr_[a-zA-Z0-9]{36}/gi,
        // Slack tokens
        /xox[baprs]-[a-zA-Z0-9-]{10,}/gi,
      ];

      lines.forEach((line, index) => {
        patterns.forEach(pattern => {
          const matches = line.match(pattern);
          if (matches) {
            findings.push({
              ruleId: 'SECRET_API_KEY',
              severity: 'critical',
              title: 'Hard-coded API key or token',
              file: filePath,
              line: index + 1,
              snippet: line.trim().substring(0, 100) + (line.trim().length > 100 ? '...' : ''),
              recommendation: 'Move API keys to environment variables. Never commit credentials to source control.'
            });
          }
        });
      });

      return findings;
    }
  },
  {
    id: 'SECRET_PASSWORD',
    name: 'Hard-coded Password',
    severity: 'critical',
    description: 'Hard-coded password detected',
    test: (content, filePath) => {
      const findings: Finding[] = [];
      const lines = content.split('\n');

      // Password patterns
      const patterns = [
        /(?:password|passwd|pwd)\s*[:=]\s*['"`][^'"`]{4,}['"`]/gi,
      ];

      lines.forEach((line, index) => {
        patterns.forEach(pattern => {
          const matches = line.match(pattern);
          if (matches) {
            findings.push({
              ruleId: 'SECRET_PASSWORD',
              severity: 'critical',
              title: 'Hard-coded password detected',
              file: filePath,
              line: index + 1,
              snippet: line.trim().substring(0, 100),
              recommendation: 'Use secure authentication and environment variables for credentials.'
            });
          }
        });
      });

      return findings;
    }
  },
  {
    id: 'SECRET_DATABASE_URL',
    name: 'Hard-coded Database Connection String',
    severity: 'high',
    description: 'Hard-coded database URL or connection string',
    test: (content, filePath) => {
      const findings: Finding[] = [];
      const lines = content.split('\n');

      // Database URL patterns
      const patterns = [
        /(?:database[_-]?url|db[_-]?url|mongodb|postgres|mysql|redis)\s*[:=]\s*['"`][^'"`]*:\/\/[^'"`]+@[^'"`]+['"`]/gi,
      ];

      lines.forEach((line, index) => {
        patterns.forEach(pattern => {
          const matches = line.match(pattern);
          if (matches) {
            findings.push({
              ruleId: 'SECRET_DATABASE_URL',
              severity: 'high',
              title: 'Hard-coded database connection string',
              file: filePath,
              line: index + 1,
              snippet: line.trim().substring(0, 100),
              recommendation: 'Store database URLs in environment variables.'
            });
          }
        });
      });

      return findings;
    }
  },
  {
    id: 'SECRET_PRIVATE_KEY',
    name: 'Hard-coded Private Key',
    severity: 'critical',
    description: 'Hard-coded private key or certificate',
    test: (content, filePath) => {
      const findings: Finding[] = [];
      const lines = content.split('\n');

      // Private key patterns
      const patterns = [
        /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/g,
        /-----BEGIN\s+EC\s+PRIVATE\s+KEY-----/g,
      ];

      lines.forEach((line, index) => {
        patterns.forEach(pattern => {
          const matches = line.match(pattern);
          if (matches) {
            findings.push({
              ruleId: 'SECRET_PRIVATE_KEY',
              severity: 'critical',
              title: 'Hard-coded private key detected',
              file: filePath,
              line: index + 1,
              snippet: line.trim(),
              recommendation: 'Never commit private keys to source control. Use secure key management.'
            });
          }
        });
      });

      return findings;
    }
  }
];

/**
 * Prompt Injection Rules (V0.2.3)
 *
 * Detects prompt injection attack patterns.
 * These serve as fallback when external detectors are unavailable.
 */
const promptInjectionRules: Rule[] = [
  {
    id: 'PI-1-INSTRUCTION-OVERRIDE',
    name: 'Prompt Injection: Instruction Override',
    severity: 'high',
    description: 'Detects attempts to override system instructions',
    test: (content, filePath) => {
      const findings: Finding[] = [];
      const lines = content.split('\n');

      // Patterns for instruction override attacks
      // More specific patterns to reduce false positives
      const patterns = [
        /\bignore\s+(all\s+)?(previous|prior|above)\b/gi,
        /\bforget\s+(all\s+)?(previous|prior)\s+(instructions|prompts)\b/gi,
        /\boverride\s+(your\s+)?(programming|instructions|system)\b/gi,
        /\bdisregard\s+(all\s+)?(previous|prior)\s+(instructions|prompts)\b/gi,
      ];

      lines.forEach((line, index) => {
        patterns.forEach(pattern => {
          const matches = line.match(pattern);
          if (matches) {
            findings.push({
              ruleId: 'PI-1-INSTRUCTION-OVERRIDE',
              severity: 'high',
              title: 'Prompt injection: instruction override pattern',
              file: filePath,
              line: index + 1,
              snippet: line.trim().substring(0, 200),
              recommendation: 'Do not allow instruction-priority override requests. Enforce system/developer policy precedence.'
            });
          }
        });
      });

      return findings;
    }
  },
  {
    id: 'PI-2-PROMPT-SECRET-EXFIL',
    name: 'Prompt Injection: Prompt/Secret Exfiltration',
    severity: 'high',
    description: 'Detects attempts to extract system prompts or secrets',
    test: (content, filePath) => {
      const findings: Finding[] = [];
      const lines = content.split('\n');

      // Patterns for prompt/secret exfiltration attacks
      const patterns = [
        /print\s+(your\s+)?(system\s+)?prompt/gi,
        /show\s+(your\s+)?(system\s+)?prompt/gi,
        /reveal\s+(your\s+)?(system\s+)?prompt/gi,
        /output\s+(your\s+)?(system\s+)?prompt/gi,
        /display\s+(your\s+)?(instructions|prompts|config|configuration)/gi,
      ];

      lines.forEach((line, index) => {
        patterns.forEach(pattern => {
          const matches = line.match(pattern);
          if (matches) {
            findings.push({
              ruleId: 'PI-2-PROMPT-SECRET-EXFIL',
              severity: 'high',
              title: 'Prompt injection: prompt/secret exfiltration pattern',
              file: filePath,
              line: index + 1,
              snippet: line.trim().substring(0, 200),
              recommendation: 'Do not reveal system prompts, internal policies, or sensitive configuration in responses.'
            });
          }
        });
      });

      return findings;
    }
  },
];

/**
 * All scan rules organized by category.
 */
export const ALL_RULES: Rule[] = [
  ...commandExecutionRules,
  ...downloadExecuteRules,
  ...secretRules,
  ...promptInjectionRules,
];

/**
 * Run all rules against file content.
 * Returns array of findings (may be empty).
 * @param skipRuleIds - Optional array of rule IDs to skip
 */
export function runAllRules(content: string, filePath: string, skipRuleIds?: string[]): Finding[] {
  const allFindings: Finding[] = [];

  for (const rule of ALL_RULES) {
    // Skip specified rules (e.g., PI rules when external detector succeeded)
    if (skipRuleIds && skipRuleIds.includes(rule.id)) {
      continue;
    }

    try {
      const findings = rule.test(content, filePath);
      allFindings.push(...findings);
    } catch (error) {
      // Silently skip rule failures to maintain determinism
      console.warn(`Rule ${rule.id} failed on ${filePath}:`, error);
    }
  }

  return allFindings;
}

/**
 * Get rules by severity level.
 */
export function getRulesBySeverity(severity: 'critical' | 'high' | 'medium' | 'low'): Rule[] {
  return ALL_RULES.filter(rule => rule.severity === severity);
}

/**
 * Get rule by ID.
 */
export function getRuleById(id: string): Rule | undefined {
  return ALL_RULES.find(rule => rule.id === id);
}
