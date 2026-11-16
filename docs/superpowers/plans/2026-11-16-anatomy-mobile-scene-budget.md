# Mobile pain-map scene budget Implementation Plan

> Execute inline with superpowers:executing-plans and one fresh whole-branch reviewer.

**Goal:** Keep at most one active detailed pain-map GPU scene while retaining all report drafts.
**Architecture:** A document-local opaque-token coordinator drives an active flag in AnatomyPainMap. Existing abort/dispose releases the previous scene; form state stays mounted.
**Tech Stack:** React useSyncExternalStore, TypeScript, Three.js, node:test, Playwright.
**Spec:** docs/superpowers/specs/2026-11-16-anatomy-mobile-scene-budget-design.md

## Global Constraints
- LAB only; no private data in the coordinator or persistent browser storage.
- Preserve existing owner, consent, deletion and retry protections.
- No geometry, model-version, workout or database changes.

## Review Focus
- Stale registration cleanup cannot release a newer lease.
- StrictMode cannot leave an orphan active scene or subscription.
- Switching/closing scenes retains each form's point, notes and pending request.
- Rapid scene handoff aborts pending loads and disposes old GPU contexts.
- Activation controls work in HE/EN and mobile widths.

### Task 1: Coordinator and map integration
- [ ] Add failing coordinator tests for handoff, stale leases, close, subscribers and repeated register/unregister.
- [ ] Implement createPainSceneBudget register/activate/isActive/subscribe and a shared opaque-token instance.
- [ ] Integrate useSyncExternalStore and bilingual activation controls in AnatomyPainMap; active scene cleanup retains the form and selected structure.
- [ ] Run focused tests and TypeScript; commit.

### Task 2: Acceptance and LAB release
- [ ] Add two-report browser case using real GLBs; preserve separate notes/markers while repeatedly switching, assert one canvas and closing cleanup.
- [ ] Full suite/build, independent review, fix substantive findings with regressions.
- [ ] CI green, authorized integration merge/LAB deploy, live public verification and record device/sign-in limits.
