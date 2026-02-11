# Specs Lifecycle

Use this folder as a strict lifecycle pipeline:

1. `specs/proposals/`
   - Early-stage proposal documents.
   - Focus: problem, scope, options, tradeoffs, and version plan.
   - Stage value: `Proposal`.

2. `specs/active/`
   - Approved implementation specs for the current execution phase.
   - Must include:
     - technical design
     - data structure / API contract
     - test and acceptance method
   - Stage value: `Active`.

3. `specs/released/`
   - Frozen specs for shipped versions.
   - Stage value: `Released`.
   - Do not edit except for critical errata notes.

## Flow

`proposal -> active spec -> implementation -> released`

## Naming

Use date + topic + version suffix, for example:

- `2026-02-11-security-scan-real-v0.2.md` (proposal)
- `2026-02-11-security-scan-real-v0.2.1.md` (active/released spec)
