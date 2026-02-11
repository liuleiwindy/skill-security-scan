/**
 * Growth-Friendly Scoring Model
 *
 * Scoring strategy (per spec V0.1):
 * 1. Default output avoids overly punitive scores on low-confidence findings.
 * 2. Findings and evidence remain visible even when overall score is relatively high.
 * 3. Base score starts at 100, deductions are weighted but capped.
 */

import { Finding } from './rules';

export interface ScoreSummary {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface ScoreResult {
  score: number;      // 0-100
  grade: 'A' | 'B' | 'C';
  status: 'safe' | 'needs_review' | 'risky';
  summary: ScoreSummary;
}

/**
 * Severity weights for score calculation.
 *
 * Growth-friendly approach:
 * - Critical: -15 points (but not auto-fail)
 * - High: -8 points
 * - Medium: -3 points
 * - Low: -1 point (informational)
 *
 * This allows for some findings while maintaining reasonable scores.
 */
const SEVERITY_WEIGHTS: Record<string, number> = {
  critical: -15,
  high: -8,
  medium: -3,
  low: -1,
};

/**
 * Grade thresholds.
 *
 * A: 80+ (Safe default for most projects)
 * B: 60-79 (Needs review)
 * C: <60 (Risky)
 */
const GRADE_THRESHOLDS = {
  A: 80,
  B: 60,
};

/**
 * Maximum deduction per severity type to prevent score floor.
 *
 * This prevents a single category from destroying the entire score,
 * making the system more growth-friendly.
 */
const MAX_DEDUCTION_PER_TYPE: Record<string, number> = {
  critical: -30,  // Max 2 critical findings before cap
  high: -24,      // Max 3 high findings before cap
  medium: -15,    // Max 5 medium findings before cap
  low: -5,        // Max 5 low findings before cap
};

/**
 * Calculate score from findings.
 *
 * Algorithm:
 * 1. Start with base score of 100
 * 2. Apply deductions per finding, capped per category
 * 3. Clamp final score to 0-100 range
 *
 * This ensures:
 * - Clean projects get high scores
 * - Projects with findings still get reasonable scores
 * - Score floor prevents total discouragement
 */
export function calculateScore(findings: Finding[]): number {
  let score = 100;
  const deductionsByType: Record<string, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };

  // Count deductions by type
  for (const finding of findings) {
    const weight = SEVERITY_WEIGHTS[finding.severity];
    deductionsByType[finding.severity] += weight;
  }

  // Apply capped deductions
  for (const severity of Object.keys(deductionsByType)) {
    const deduction = deductionsByType[severity];
    const maxDeduction = MAX_DEDUCTION_PER_TYPE[severity];
    const cappedDeduction = Math.max(deduction, maxDeduction);
    score += cappedDeduction;
  }

  // Clamp to 0-100
  return Math.max(0, Math.min(100, score));
}

/**
 * Determine grade from numeric score.
 */
export function calculateGrade(score: number): 'A' | 'B' | 'C' {
  if (score >= GRADE_THRESHOLDS.A) {
    return 'A';
  } else if (score >= GRADE_THRESHOLDS.B) {
    return 'B';
  } else {
    return 'C';
  }
}

/**
 * Determine status label from findings summary.
 *
 * Growth-friendly approach:
 * - Critical findings always trigger "risky" status
 * - Multiple high findings trigger "needs_review"
 * - Otherwise, status aligns with grade
 */
export function calculateStatus(summary: ScoreSummary, grade: 'A' | 'B' | 'C'): 'safe' | 'needs_review' | 'risky' {
  // Always risky if critical findings present
  if (summary.critical > 0) {
    return 'risky';
  }

  // Needs review if multiple high findings
  if (summary.high >= 2) {
    return 'needs_review';
  }

  // Otherwise align with grade
  if (grade === 'A') {
    return 'safe';
  } else if (grade === 'B') {
    return 'needs_review';
  } else {
    return 'risky';
  }
}

/**
 * Count findings by severity.
 */
export function summarizeFindings(findings: Finding[]): ScoreSummary {
  const summary: ScoreSummary = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };

  for (const finding of findings) {
    summary[finding.severity]++;
  }

  return summary;
}

/**
 * Calculate full score result from findings.
 *
 * This is the main entry point for scoring.
 */
export function calculateScoreResult(findings: Finding[]): ScoreResult {
  const summary = summarizeFindings(findings);
  const score = calculateScore(findings);
  const grade = calculateGrade(score);
  const status = calculateStatus(summary, grade);

  return {
    score,
    grade,
    status,
    summary,
  };
}

/**
 * Generate human-friendly score explanation.
 */
export function explainScore(result: ScoreResult): string {
  const parts: string[] = [];

  if (result.score === 100 && result.summary.critical === 0 && result.summary.high === 0) {
    return 'No security issues detected. Great job following security best practices!';
  }

  if (result.summary.critical > 0) {
    parts.push(`${result.summary.critical} critical finding${result.summary.critical > 1 ? 's' : ''} requiring immediate attention`);
  }

  if (result.summary.high > 0) {
    parts.push(`${result.summary.high} high-priority issue${result.summary.high > 1 ? 's' : ''}`);
  }

  if (result.summary.medium > 0) {
    parts.push(`${result.summary.medium} medium-severity issue${result.summary.medium > 1 ? 's' : ''}`);
  }

  if (result.summary.low > 0) {
    parts.push(`${result.summary.low} low-severity note${result.summary.low > 1 ? 's' : ''}`);
  }

  if (parts.length === 0) {
    return `Score ${result.score}/100 - Minor improvements possible.`;
  }

  return `Score ${result.score}/100 - ${parts.join(', ')}.`;
}
