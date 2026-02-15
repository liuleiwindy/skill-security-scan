# Change Plan: Security Scan Style Optimization V0.2.4.4

## 0. Links

- Active spec: `specs/active/2026-02-15-security-scan-style-optimization-v0.2.4.4.md`
- Previous active baseline: `specs/active/2026-02-15-security-scan-analytics-funnel-v0.2.4.3.md`

## 1. Execution Status

- Phase: In Progress
- Spec status: Active
- Target version: v0.2.4.4

## 2. Action List

1. Consolidate style tokens
   - Status: pending
   - Deliverables:
     - shared palette and typography variables
     - glow/border/shadow token set
     - animation primitives (dot breathe, grade glow, scan line)

2. Implement report page visual overhaul
   - Status: in_progress
   - Deliverables:
     - cyber hero + gradient title
     - upgraded metrics/cards/buttons
     - detailed risk cards visual update

3. Implement report mobile layout and nav behavior
   - Status: in_progress
   - Deliverables:
     - mobile order: hero -> summary -> risks
     - desktop-only top nav chips
     - mobile-only hamburger + centered overlay menu
     - collapsed state icon-only guarantee

4. Implement grade emphasis and status marker animations
   - Status: in_progress
   - Deliverables:
     - grade metric stronger glow treatment
     - scan-line effect in grade tile
     - level-aware breathing dot

5. Implement poster page style alignment
   - Status: in_progress
   - Deliverables:
     - palette/typography/component alignment to report page
     - poster minimal IA: title-only nav + poster image + two CTA buttons
     - remove redundant repeated metadata/headline blocks outside poster image
     - responsive behavior: mobile near full-width, desktop constrained centered width
     - maintain poster readability and export quality
     - no regression to save/share/QR behavior

6. Implement poster dynamic tagline (config-driven random copy)
   - Status: pending
   - Deliverables:
     - add standalone poster tagline config file (10-20 lines, target 20)
     - render one random tagline per poster page load
     - no hardcoded inline copy array inside component
     - fallback to safe default copy when config unavailable or empty

7. Regression verification
   - Status: pending
   - Deliverables:
     - report/poster responsive snapshots
     - smoke checks for report/poster routes
     - save/share/download sanity checks
     - analytics trigger non-regression check

8. Documentation update
   - Status: pending
   - Deliverables:
     - testing note for v0.2.4.4 visual + responsive coverage
     - final release note update after implementation closure

## 3. Acceptance Gate Before "Done"

1. Report page visual style and responsive behavior match v0.2.4.4 spec.
2. Mobile menu behavior is correct and deterministic:
   - collapsed: icon only
   - expanded: centered overlay panel
3. Poster page style is aligned with report visual language.
4. Poster page uses minimal structure only:
   - title-only nav
   - poster body
   - two action buttons
5. Poster responsive constraints are implemented:
   - mobile near full width
   - desktop constrained centered width (no stretched poster)
6. Report/poster existing functionality (route render, save/share/download/QR) remains intact.
7. No analytics instrumentation regression on key user actions.
8. Poster bottom tagline is randomized from config-driven copy pool.
9. Tagline content updates require config change only, with no component code edits.
