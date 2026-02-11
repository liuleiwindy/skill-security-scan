# OpenSpec Proposal: Security Scan Standalone Site V0.1

## 0. Meta

- Date: 2026-02-10
- Stage: Proposal (Review-ready)
- Owner: Product + AI Pair
- Related workspace intent: Build a standalone, social-first security scan experience before full sandbox vision.

## 1. Problem Statement

Current Skill Store focuses on discovery/tipping, but lacks a dedicated trust layer for "is this Skill safe to use?".
For growth and social propagation, we need a focused standalone flow that can generate shareable security proof.

## 2. Goal (V0.1)

Deliver a demo-ready standalone experience for:

`Git repository URL input -> lightweight scan -> polished report -> one-click sharing (link/poster)`

Primary objective is fast demo validation and social spread, not deep security accuracy.

## 3. Non-Goals (V0.1)

The following are explicitly out of scope:

1. Runtime sandbox execution
2. Dynamic behavior analysis
3. Full software supply-chain deep inspection
4. User accounts / billing / permissions system
5. Multi-repo batch scanning
6. Production-level anti-abuse and heavy queue system

## 4. Target Users

1. Skill creator: wants to show trustworthiness quickly
2. Skill user: wants fast safety signal before using a repo
3. Social sharer/KOL: wants a visual proof artifact worth forwarding

## 5. V0.1 Scope

### 5.1 Scan Entry Page

1. Input field for Git repository URL
2. Start scan action
3. Lightweight progress states: idle / scanning / done / failed

### 5.2 Lightweight Scan Engine (Static Rules Only)

Initial ruleset (minimum viable):

1. Suspicious command execution usage patterns
2. Suspicious download + execute patterns
3. Possible hard-coded secrets/token strings

Output should be deterministic and normalized into report schema.

### 5.3 Report Page (Public Link)

Must include:

1. Security score (0-100) and level (A/B/C)
2. Risk status label (Safe / Needs Review / Risky)
3. Findings list by severity
4. Evidence location (file path + line number when available)
5. Basic remediation suggestions
6. Scan timestamp and engine version
7. Disclaimer section

Decision locked: report visibility is public by default in V0.1.

### 5.4 Share Layer

1. Copy report link in one tap
2. Open social share actions (at least one generic share entry)
3. Poster view generation
4. Poster must include:
   - score/result
   - report identifier or repo name
   - QR code to report
   - prominent brand/domain placeholder text (TBD)

Poster style direction locked for V0.1: trendy social media style with explicit marketing hooks.

### 5.5 Mobile-First Requirement

All three surfaces must be mobile-friendly:

1. Scan entry
2. Report page
3. Poster view

### 5.6 Scoring Strategy (V0.1)

Scoring is growth-friendly for social spread while keeping findings transparent:

1. Default output should avoid overly punitive scores on low-confidence findings.
2. Findings and evidence remain visible even when overall score is relatively high.
3. Disclaimer must clearly state "lightweight static scan, not a full security audit".

## 6. Information Architecture (V0.1)

1. `/scan` : scan landing and input
2. `/scan/report/:id` : report details and sharing actions
3. `/scan/poster/:id` : social poster view/export

Note: brand naming and root domain are intentionally TBD in V0.1.

## 7. UX Principles

1. One-screen clarity: users understand action in <= 3 seconds
2. Trust-first visual hierarchy: score/result must be first glance visible
3. Social friction minimization: sharing path <= 2 interactions
4. Evidence transparency: findings are inspectable, not black-box only

## 7.1 Marketing Hook Principles (Poster/Report)

1. First-screen impact: score badge and "safety result" must be instantly legible.
2. Social proof framing: visuals should feel like a status card users want to repost.
3. Viral intent copy: short, punchy, confidence-oriented wording suitable for Geek, XiaoHongShu, and Reddit sharing culture.
3. Viral intent copy: short, punchy, confidence-oriented wording suitable for Jike, XiaoHongShu, and Reddit sharing culture.

## 8. Report Data Contract (Draft)

```json
{
  "id": "string",
  "repoUrl": "string",
  "score": 0,
  "grade": "A|B|C",
  "status": "safe|needs_review|risky",
  "summary": {
    "critical": 0,
    "high": 0,
    "medium": 0,
    "low": 0
  },
  "findings": [
    {
      "ruleId": "string",
      "severity": "critical|high|medium|low",
      "title": "string",
      "file": "string",
      "line": 0,
      "snippet": "string",
      "recommendation": "string"
    }
  ],
  "engineVersion": "v0.1",
  "scannedAt": "ISO8601"
}
```

## 9. Acceptance Criteria (V0.1 Demo)

1. User can submit a valid repository URL and receive a report page.
2. Report displays score, grade, status, findings, and remediation summary.
3. Report has a unique URL that can be opened directly.
4. Poster page can be generated from report page.
5. Poster includes working QR code pointing to report URL.
6. Core flow works on mobile viewport without layout breakage.

## 10. KPI Baseline (Demo Phase)

1. Scan completion rate
2. Report share click rate
3. Shared link to report open rate
4. Mobile report load success rate

## 11. Risks and Mitigations

1. Risk: "lightweight scan" may be mistaken as full security guarantee  
   Mitigation: strong disclaimer + explicit scope label in report.

2. Risk: false positive findings reduce trust  
   Mitigation: keep initial rules small, deterministic, and explainable.

3. Risk: weak visual quality hurts virality  
   Mitigation: prioritize poster polish and mobile readability in V0.1.

## 12. Open Decisions (Review Needed)

Decisions confirmed:

1. Report visibility: public by default.
2. Scoring strictness: growth-friendly.
3. Poster style: trendy social style with marketing hooks.
4. First launch channels: Geek communities, XiaoHongShu, Reddit.
4. First launch channels: Jike, XiaoHongShu, Reddit.

Still pending:

1. Jike launch account strategy: founder account first (confirmed).
2. Content rollout strategy: Jike-first has been confirmed for poster launch, then expand channel variants.

## 13. Next Step in OpenSpec Flow

This proposal is now **Review-complete** with core scope and launch strategy aligned.
Ready to move to **Implement** once execution is approved.
