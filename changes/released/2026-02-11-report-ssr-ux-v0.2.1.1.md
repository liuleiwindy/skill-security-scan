# Change Plan: Report SSR UX Patch v0.2.1.1

## 0. Links

- Spec: `specs/released/2026-02-11-report-ssr-ux-v0.2.1.1.md`
- Playbook: `docs/archive/v0.2.1.1-implementation-playbook.md`

## 1. Status

- Phase: Released
- Scope: report rendering path only

## 2. Tasks

1. Convert report page to server-first render.
2. Split clipboard action into client-only child component.
3. Remove old page-level loading copy path from report page.
4. Run tests/build and manual navigation checks.

## 3. Done Criteria

1. `/scan/report/:id` loads with report content directly for existing IDs.
2. Poster to report navigation has no visible page-level loading placeholder.
3. Automated checks pass.
