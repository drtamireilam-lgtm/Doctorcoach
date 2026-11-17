# Anatomy training and pain Implementation Plan

> For agentic workers: execute inline with superpowers:executing-plans; final independent review.

**Goal:** Connect the full-body atlas to exercise/program workflows and private pain history.
**Architecture:** Existing curated muscle links and program controller; separate consent-guarded pain store in existing wellness_records, and a non-persisting canvas scene.
**Tech Stack:** React, TypeScript, Three.js, D1, node:test, Playwright.
**Spec:** docs/superpowers/specs/2026-11-16-anatomy-training-pain-design.md

## Global Constraints
- LAB only; no Production or live patient data; no schema migration/dependency changes.
- Pain owner-only, consent-guarded; never use feedback, URL, browser storage or telemetry for reports.
- Curated relationships only. Existing program authorization and history integrity remain.

## Review Focus
- Consent revoked during reads/inserts must withhold data/reject save.
- A report ID reused by a different owner must not read or overwrite data.
- Rapid double submit/network retry must not duplicate a report.
- Region navigation and overlay toggles must not reset deliberate camera state.
- Account change/sign-out must unmount private drafts/history; a stale response cannot reappear.

### Task 1: Exercise and program connections
Files: lib/anatomy-training.ts, components/exercise-program-action.tsx, exercise-anatomy-links.tsx, anatomy-model-viewer.tsx, anatomy-atlas-viewer.tsx, anatomy-workspace.tsx, lib/anatomy-canvas.ts, app/page.tsx, training-workspace.tsx; tests/anatomy-training.test.mjs.
- [ ] RED: exercise relationships map source learning IDs (including parent contexts), unknowns remain absent; exercise deep links validate IDs; day-specific occurrence payload preserves defaults and selected day.
- [ ] GREEN: helpers, role overlay and legend, explicit atlas exercise link, program day action, active-workout anatomy link.
- [ ] Verify focused tests, TypeScript; commit.
Interfaces: exerciseStructureRoles(model,exerciseId) -> Map<string,role>; exerciseAtlasHash(id) -> validated learning hash; programExercisePayload(id,dayId) -> default prescription with occurrence ID.

### Task 2: Private persistence
Files: lib/anatomy-pain.ts, lib/anatomy-pain-store.ts, app/api/anatomy-pain/route.ts, lib/wellness-store.ts; tests/anatomy-pain.test.mjs.
- [ ] RED: boundaries/zero/invalid dates and IDs; owner-only storage, idempotence/conflicts, consent initial and race guards, generic bundle exclusion, account deletion coverage.
- [ ] GREEN: strict parser, owner-derived append-only store/API, exclude generic bundle, optional visible custom exercise validation in atomic guard.
- [ ] Verify focused and existing wellness/privacy suites; commit.
Interfaces: parseAnatomyPain(input,now) -> flat validated report data; anatomyPainStore(db).list(user),save(user,payload) -> {records}.

### Task 3: Model location and history UI
Files: components/anatomy-pain-workspace.tsx, components/anatomy-pain-map.tsx, lib/anatomy-canvas.ts, learning-area.tsx, anatomy-4.css; browser smoke additions.
- [ ] RED: browser flows for raycast marker, keyboard placement, save/failure/retry/history, zero intensity, view changes, responsive HE/EN and no browser storage leakage.
- [ ] GREEN: separate scene, pointer callback/marker and keyboard mesh-centre location; in-memory form and server history. Identity-keyed rendering and auth failure clearing.
- [ ] Verify TypeScript, full suite, isolated build, browser CI; independent review, fix reproduced issues; reviewable PR then authorized merge/LAB deployment and live verification.
