# OpenSpec Proposal: Security Scan Viral Experience and Trust Loop V0.2.4

## 0. Meta

- Date: 2026-02-13
- Stage: Proposal
- Owner: Product + Engineering
- Parent released baseline: `specs/released/2026-02-13-security-scan-abuse-fallback-controls-v0.2.3.5.md`
- Related follow-up: `specs/proposals/2026-02-12-security-scan-cisco-worker-integration-v0.2.5.md`

## 1. Problem Statement

Current scan/report/poster flow is functional but not yet optimized for distribution growth.
The product goal for the next phase is not deeper engine sophistication first; it is better trust communication and shareability.

Key gap:

1. Developers can generate a report, but the output is not yet strong enough as a public trust proof.
2. End users can open report details, but first-screen comprehension is still too technical.
3. There is no baseline historical context ("improved vs last scan") to support credibility over time.

## 2. Goal (V0.2.4)

Make sharing the default growth loop and make trust legible for non-technical users.

Core target:

1. Improve scan page conversion for quick scan starts.
2. Redesign report first screen for clear trust summary.
3. Upgrade poster/share page into social-ready assets.
4. Add minimal historical comparison data to show trend (`vs previous scan`).

## 3. User Hypothesis (Locked)

1. Developer (primary growth engine)
   - scans before publish and shares trust proof to gain installs/trust
2. End user (validation role)
   - consumes shared result and needs a fast, plain-language safety decision

This implies a dual-role funnel:

1. developer sharing drives top-of-funnel traffic
2. end-user trust comprehension drives click-through and trial

## 4. Non-Goals (V0.2.4)

1. No Cisco worker/runtime integration in this phase.
2. No distributed scanner architecture redesign.
3. No score-model redefinition from scratch.
4. No full account/paywall system rollout.

## 5. Scope

### 5.1 Scan Page (Acquisition)

1. Clarify value proposition in one consumer-facing sentence.
2. Keep single-input fast path for URL/npm command.
3. Improve loading state to reinforce progress and trust.
4. Reduce technical jargon in first-screen copy.

### 5.2 Report Page (Trust Comprehension)

1. Make top section decisive:
   - overall score/grade/status
   - one-line recommendation
2. Keep severity summary compact and scannable.
3. Reorder details so non-technical users can decide before reading code snippets.
4. Keep technical evidence available for advanced users.

### 5.3 Poster/Share Page (Distribution)

1. Produce social-first visual hierarchy for screenshot sharing.
2. Include trust proof essentials:
   - score + status
   - key risk counts
   - scan timestamp
   - report deep link / QR
3. Add share-friendly copy variants for social posting.

### 5.4 Historical Delta (`vs previous scan`)

Introduce minimal persistence and comparison:

1. derive `targetKey` from normalized target input
2. store scan snapshots (`score`, severity counts, `scannedAt`)
3. compute and expose deltas against previous successful scan:
   - `scoreDelta`
   - `criticalDelta`, `highDelta`, `mediumDelta`, `lowDelta`
4. support anonymous mode first (no login required)

## 6. Data Contract Additions (Additive)

Under report metadata (or adjacent stable field), add optional fields:

1. `trend.previousScanId`
2. `trend.scoreDelta`
3. `trend.summaryDelta.critical`
4. `trend.summaryDelta.high`
5. `trend.summaryDelta.medium`
6. `trend.summaryDelta.low`

No existing fields are removed or renamed.

## 7. Phased Delivery (V0.2.4.x)

### 7.1 `v0.2.4.0` - Messaging and IA Baseline

1. update copy hierarchy on scan/report/poster pages
2. define share-oriented information architecture
3. keep existing API contracts stable

### 7.2 `v0.2.4.1` - Visual System and Mobile Share Readiness

1. establish unified visual language for all three pages
2. optimize mobile layouts for screenshot sharing
3. add polished share CTA flow

### 7.3 `v0.2.4.2` - Historical Trend Support

1. persist minimal snapshot history per `targetKey`
2. compute and expose previous-vs-current deltas
3. render "improved vs previous" in report/poster

### 7.4 `v0.2.4.3` - Distribution Loop Instrumentation

1. add event tracking for scan -> report -> share funnel
2. define baseline growth metrics and acceptance thresholds
3. tune share copy and card composition based on early usage

## 8. Acceptance Criteria

1. Scan page conversion and completion do not regress.
2. Report first screen communicates decision status in <5 seconds of reading.
3. Poster page is screenshot-ready on mobile and preserves key trust proof fields.
4. Historical delta appears when prior scan exists and stays hidden otherwise.
5. All additions are backward-compatible and tests/build stay green.

## 9. Risks and Mitigations

1. Risk: overemphasis on visuals weakens technical credibility
   - Mitigation: keep evidence sections and scanner metadata accessible
2. Risk: trend metric ambiguity for renamed/moved targets
   - Mitigation: strict target normalization + explicit fallback when baseline missing
3. Risk: share optimization increases copy noise
   - Mitigation: enforce concise information hierarchy and user testing loops

## 10. Relationship to V0.2.5

V0.2.4 focuses on distribution and trust UX.
V0.2.5 introduces advanced scanner integration (Cisco worker, signed worker API, hybrid execution) as a higher-tier capability built on this trust-facing product shell.

## 11. Next Step

Create active execution spec for `v0.2.4.0` with:

1. exact content IA per page
2. visual token and component changes
3. trend data schema/update flow
4. test plan for rendering and backward compatibility
