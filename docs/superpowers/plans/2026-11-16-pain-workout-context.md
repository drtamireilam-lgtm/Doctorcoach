# Pain workout context Implementation Plan

> Execute inline with superpowers:executing-plans and one independent whole-branch review.

**Goal:** Finish private pain reporting from real workout contexts and support authorized custom/program exercises.
**Architecture:** Existing pain record JSON and privacy guards; a scoped server exercise resolver/catalog; reusable inline panel retaining workout editors.
**Tech Stack:** React, TypeScript, Three.js, D1, node:test, Playwright.
**Spec:** docs/superpowers/specs/2026-11-16-pain-workout-context-design.md

## Constraints
- LAB only; no real health test data or Production deployment.
- Owner-only pain access; current consent, deletion and ownership guards remain.
- No private workout/custom identifiers or draft health data in URLs, browser storage or telemetry.
- Never auto-overwrite workout scores or fabricate a pre-start session ID.

## Review focus
- Snapshot/assignment revoked between validation and insert.
- Repeated exercise IDs with different occurrences, stale substitution and other owners' session IDs.
- Same-ID retry after rename/removal must remain idempotent without duplicating a saved report.
- Inline report start/finish/close must leave workout fields and dialog drafts mounted.
- Account/catalog owner mismatch, transient errors and revoked consent must not display stale private data.

### Task 1: Server context and catalog
- [ ] RED parser/session/occurrence and resolver tests: owned/published/assigned/imported exercise, unauthorized references, repeated occurrences, races and idempotent snapshot names.
- [ ] GREEN optional context + timing, server name snapshots, catalog and atomic source guards. Preserve existing records/export/deletion.
- [ ] Focused tests + TypeScript; commit.

### Task 2: Inline pain UI and history
- [ ] RED tests for catalog merging/filtering, initial context, occurrence choice, dirty closure and model-version guard.
- [ ] GREEN contextual form/catalog, reusable inline panel, before/during/after entry points in existing workout views. History remains readable after exercise rename/removal.
- [ ] Preserve workout fields, before/finish draft state and existing permissions. Focused/full suite + build; commit.

### Task 3: Acceptance/release
- [ ] Extend real-model browser matrix for custom/program and workout linkage, before/after return, draft retention/retry and account changes in HE/EN at320/390/430/768.
- [ ] Independent review, fix substantive findings with regression tests; CI and artifacts; authorized merge and LAB release after passing checks.
- [ ] Live read-only verification; report native iPhone/Safari and signed-in manual acceptance unavailable without owner participation.
