# Change Plan: Security Scan Standalone Site V0.1

## 0. Link to Active Spec

- `specs/released/2026-02-10-security-scan-standalone-v0.1.md`
- `docs/archive/v0.1-implementation-playbook.md`

## 1. Execution Status

- Phase: Pre-implementation
- Spec status: Active
- Implementation approval: Pending explicit "start building" instruction

## 2. Action List (V0.1)

1. IA and route skeleton
   - Status: pending
   - Deliverables:
     - `/scan`
     - `/scan/report/:id`
     - `/scan/poster/:id`

2. Lightweight scan pipeline (mock/demo-first)
   - Status: pending
   - Deliverables:
     - repo URL intake
     - deterministic rule matching output
     - report JSON contract output

3. Report page UI (mobile-first)
   - Status: pending
   - Deliverables:
     - score/grade/status header
     - findings list
     - remediation section
     - disclaimer block

4. Share layer
   - Status: pending
   - Deliverables:
     - copy report link
     - social share entry
     - poster entry CTA

5. Poster page (Jike-first social style)
   - Status: pending
   - Deliverables:
     - social-oriented visual composition
     - QR code to report URL
     - strong marketing hook headline

6. Jike launch content pack (founder account)
   - Status: pending
   - Deliverables:
     - 1 primary launch copy
     - 2 alternate hooks
     - posting structure for screenshot + link + CTA

## 3. Acceptance Gate Before "Done"

1. V0.1 acceptance criteria in active spec all pass.
2. Mobile viewport checks pass for scan/report/poster.
3. Jike launch material is ready for founder account posting.

## 4. Notes

- Brand name and domain remain TBD for this phase.
- Report visibility is public-by-default in V0.1.
- Scoring is growth-friendly with transparent findings.
