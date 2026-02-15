# OpenSpec Released Spec: Security Scan Style Optimization V0.2.4.4

## 0. Meta

- Date: 2026-02-15
- Stage: Released
- Owner: Product + Engineering
- Previous active baseline: `specs/active/2026-02-15-security-scan-analytics-funnel-v0.2.4.3.md`

## 1. Objective

Deliver a unified visual system upgrade for Security Scan pages, focusing on:

1. report detail page style overhaul (desktop + mobile)
2. poster page style alignment with report visual language
3. consistency of color, components, typography, and interaction patterns

This version is a UX/style upgrade only and must not change scan/report/poster data contracts.

## 2. Scope

1. Report page UI restyling
   - cyber/neon visual language
   - gradient headline treatment
   - upgraded cards/chips/buttons hierarchy
   - mobile-first responsive adaptation
2. Poster page UI restyling
   - visual alignment with report page style tokens
   - stronger readability and sharing CTA hierarchy
   - mobile rendering quality improvements
3. Shared style tokens
   - palette, typography pair, border/glow/shadow/animation primitives
4. Interaction polish
   - mobile collapsed navigation behavior for report page
   - CTA and metric emphasis states

## 3. Out of Scope

1. report schema changes
2. analytics event schema changes
3. scan pipeline/backend logic changes
4. legal/privacy text policy changes

## 4. Design Direction

### 4.1 Visual Theme

1. Primary direction: dark cyber board + neon accent system
2. Dominant accent range: teal/cyan family aligned with existing brand atmosphere
3. Background strategy: layered depth (radial glow + subtle grid texture), avoid flat background

### 4.2 Typography System

1. Display/Headline: geometric sci-fi family (e.g., Orbitron)
2. Body/Metric UI: compact readable sans (e.g., Rajdhani)
3. Code/Snippet: monospace (e.g., JetBrains Mono)
4. Typographic hierarchy must stay readable on mobile widths >= 360px

### 4.3 Component Language

1. Panel cards: thin neon border + dark surface + subtle inner stroke
2. Buttons:
   - primary: gradient/glow emphasis
   - secondary: outline panel style
3. Metric tiles:
   - default metric style
   - grade metric is special-highlight with stronger glow/scan effect
4. Status marker dot:
   - breathing animation
   - grade-linked color variation (A/B/C)

## 5. Report Page Requirements

### 5.1 Information Architecture

Desktop:
1. top nav
2. hero summary
3. two-column content area: detected risks + summary/pi/status blocks

Mobile:
1. top bar (brand + hamburger icon only)
2. hero block (narrowed, keeps hierarchy)
3. summary/security + prompt-injection + status-rule block
4. detected risks list (continuous downward scroll)

### 5.2 Mobile Navigation Behavior

1. desktop: no hamburger icon
2. mobile: show hamburger icon on right side of header
3. collapsed state: only icon visible
4. expanded state: menu panel centered under header as overlay
5. menu panel visibility strictly controlled by open state

### 5.3 Risk Detail Presentation

Each risk item must show:
1. severity
2. title
3. file:line
4. snippet
5. recommendation

Long paths/snippets must wrap or scroll safely without layout break.

### 5.4 Grade Emphasis

1. grade tile gets stronger glow than other metrics
2. add lightweight scan-line motion inside grade tile
3. animation must remain subtle and non-blocking

## 6. Poster Page Requirements

### 6.1 Visual Alignment

1. align poster page palette/typography/component language with report page
2. maintain high contrast and share-readability for social contexts
3. ensure score/grade/headline hierarchy remains clear in both desktop and mobile

### 6.2 Interaction and Output Quality

1. preserve existing save/share functional behavior
2. improve visual quality without breaking poster export/download flow
3. keep QR readability and report-link handoff behavior unchanged

### 6.3 Poster Page Information Architecture (Minimal Mode)

Poster page must avoid redundant information that already exists inside poster image content.

Required structure:
1. top navigation bar with brand title only (no duplicated hero/summary/info blocks)
2. poster image container
3. bottom action row with exactly two actions:
   - save poster
   - open report

Disallowed duplicated blocks on poster page:
1. repeated scan metadata text (repo/time/version) outside poster image
2. repeated headline blocks outside poster image
3. extra status/info card sections used only for visual decoration

### 6.4 Poster Responsive Layout Rules

1. Mobile (small widths):
   - poster can expand to near full available width
   - action buttons stack or adapt for touch comfort
2. Desktop/tablet-large:
   - poster must use constrained max width and remain centered
   - action row width should follow poster width to keep visual balance
3. Poster image must preserve aspect ratio; no horizontal stretch deformation.

### 6.5 Poster Dynamic Tagline (Config-Driven Random Copy)

1. Poster page bottom tagline must support randomized copy rotation from a predefined pool.
2. Copy pool size requirement: 10-20 English lines (target 20).
3. Copy source must be a dedicated config file, not hardcoded inline in component logic.
4. On each page load, select one line randomly from config pool for display.
5. If config is missing/invalid/empty, fallback to a single safe default line.
6. This feature is UI-only and must not alter report/poster API contracts.

## 7. Technical Constraints

1. keep routing unchanged:
   - `/scan/report/[id]`
   - `/scan/poster/[id]`
2. no breaking change to report/poster API contracts
3. no removal of existing analytics triggers
4. animations must degrade gracefully when motion support is limited
5. dynamic tagline copy must be maintained in a standalone config file for easy future editing

## 8. Acceptance Criteria

1. Report page desktop and mobile styles match v0.2.4.4 visual direction.
2. Mobile navigation follows collapsed/expanded behavior exactly:
   - collapsed: icon only
   - expanded: centered overlay menu
3. Report mobile content order is fixed:
   - hero -> summary block -> risks detail list
4. Hero CTA buttons remain in one row on mainstream mobile widths.
5. Risk detail cards display complete fields and remain readable on mobile.
6. Grade tile has clearly stronger visual emphasis than other metrics.
7. Poster page is visually aligned with report page while preserving share/download/QR behavior.
8. Poster page only contains: brand title nav + poster + two action buttons (no redundant repeated info blocks).
9. Poster responsive behavior is correct:
   - mobile allows near full-width poster display
   - desktop uses centered constrained-width poster to avoid stretch ugliness
10. No regression on report/poster route rendering and existing analytics instrumentation.
11. Poster tagline text is randomly selected from config-driven copy pool (10-20 lines, target 20).
12. Tagline copy can be updated by editing config file only (no component code change required).

## 9. Verification Plan

1. Visual verification snapshots:
   - report desktop
   - report mobile (collapsed nav)
   - report mobile (expanded nav)
   - poster desktop/mobile
2. Responsive checks:
   - 360px, 390px, 768px, desktop baseline
   - verify poster desktop constrained-width behavior (no over-stretch)
3. Functional smoke checks:
   - report page load
   - poster page load
   - save/download/share basic path still works
4. Regression checks:
   - QR target behavior unchanged
   - analytics events still emitted on key actions
5. Dynamic copy checks:
   - refresh poster page multiple times and confirm varied tagline output
   - verify fallback line appears when copy pool is unavailable or empty
