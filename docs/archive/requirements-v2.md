# Security Scan Standalone Site - V2 Requirements (Draft)

## 1. Product Goal

Build a standalone website focused on one core action:

`Input Skill repository -> run lightweight security scan -> generate shareable report`

This site is growth-first and social-first, with a strong mobile experience.

## 2. Current Constraints

- Brand name: TBD
- Primary domain: TBD
- No production sandbox execution in MVP
- Goal now: demo quality and shareability first

## 3. MVP Functional Scope

### 3.1 Scan and Report

1. User inputs a Git Skill repository URL.
2. System runs a lightweight static scan.
3. System outputs a polished report page with:
   - Security score
   - Risk level
   - Findings summary
   - Basic remediation suggestions

### 3.2 Social Sharing and Viral Spread

1. Report supports shareable public link.
2. Report supports export/share as poster.
3. Poster includes:
   - QR code linking to report page
   - OR highly visible branded domain text (TBD)
4. Sharing flow should be one-click and mobile-friendly.

## 4. Product Principles

1. Mobile-first UI and interaction design.
2. Sharing path must be frictionless.
3. Output must look trustworthy and "worth sharing".
4. Report language should encourage confidence while staying factual.

## 5. Core Pages (Planned)

1. Scan Landing Page
   - URL input
   - Start scan CTA
   - Value proposition focused on trust + shareability

2. Report Page
   - Score and trust badge
   - Key findings
   - Share actions (link, poster, social)

3. Poster View / Poster Export
   - Mobile ratio friendly
   - Social-ready visual
   - QR code and report key metrics

## 6. MVP Out of Scope

- Full sandbox runtime execution
- Dynamic behavior tracing
- Advanced supply-chain deep inspection
- Paid plans / account system

## 7. Success Metrics (Draft)

1. Scan completion rate
2. Report share rate
3. Shared report -> new visitor conversion
4. Mobile report open performance and completion

## 8. Open Decisions

1. Brand identity (name, visual tone)
2. Domain strategy
3. Scoring strictness strategy
4. Public vs private report visibility defaults
5. Initial social channels for launch

## 9. Next Discussion Topics

1. Information architecture and user flow
2. Report schema (fields, severity model, scoring method)
3. Poster layout spec
4. Copywriting and share text templates
5. 7-day demo milestone plan

## 10. Technical Architecture (V0.1)

### 10.1 Frontend

1. Routes
   - `/scan`: repo input + scan trigger + progress
   - `/scan/report/:id`: report details + share actions
   - `/scan/poster/:id`: poster-style social view
2. Mobile-first rendering for all routes
3. Report and poster must share one data model

### 10.2 Backend API

1. `POST /api/scan`
   - input: `repoUrl`
   - output: `scanId`, `status`
2. `GET /api/scan/:id`
   - output: full report payload
3. `GET /api/scan/:id/poster`
   - output: poster payload (or render params)

### 10.3 Scan Engine (Lightweight Static)

1. Repo intake and file traversal
2. Rule matcher:
   - suspicious command execution
   - suspicious download-and-run
   - possible hard-coded secrets
3. Score + grade + status calculator (growth-friendly)

### 10.4 Data Layer

1. `scans`: job lifecycle and metadata
2. `findings`: rule matches and evidence
3. `reports`: normalized report result and share identifier

### 10.5 Poster and Share

1. Poster view derived from report data
2. QR code must resolve to report URL
3. One-click copy link and social share entry

### 10.6 Security and Reliability (Baseline)

1. Basic rate limit on scan creation
2. Scan timeout and failure state handling
3. Clear disclaimer: not a full security audit

## 11. Execution Reference

Implementation-level breakdown is defined in:

- `security-scan-site/docs/archive/v0.1-implementation-playbook.md`
