# Critical PR 59–61 Integration Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline; final fresh review under requesting-code-review.

**Goal:** Preserve all three PRs on a dedicated branch, without deployment or remote data changes.
**Architecture:** Start from verified PR59, merge PR60 with semantic conflict resolution, then merge PR61. Keep existing stores, database contracts and feature gates.
**Tech Stack:** TypeScript, React, Node tests, Vite/Cloudflare Worker, SQLite fixtures.
**Spec:** User's Critical Integration & Conflict Resolution request, 29 October 2026.

## Global Constraints
No main merge, deployment, production changes, destructive migrations, real-user data writes, or modifications to original PR branches. Draft PR only. Synthetic/local testing.

## Review Focus
- C2/C 2/numbered headings cannot swallow prescribed or annotated exercise rows.
- Actual RPE provenance must survive private unmatched exercise snapshots and persistence.
- CI must run all integration browser checks and never deploy this branch.
- Cache must not alter exact recognition, qualifiers or catalog boundaries.
- User/coach/clinical permissions and migration bytes must remain compatible.

### Task 1: Audit and baseline
- [ ] Verify remote heads/CI and isolated checkout.
- [ ] Run relevant baseline import tests and capture clean tracked-source lint diagnostics for PR59 and PR61.

### Task 2: Merge Smart Import
- [ ] Merge PR60 without committing, inspect every conflict and the complete parser.
- [ ] Add behavioral regression tests for numbered headings and RPE/private snapshot preservation; observe missing behavior fail.
- [ ] Resolve parser as the union of both behaviors; retain both CI browser steps and branch filters.
- [ ] Enable full audit/browser checks for integration and import checks for 3.1. Confirm no deploy workflow matches this branch.
- [ ] Run import/integration tests and commit merge.

### Task 3: Merge 3.1 and recognition safety
- [ ] Merge PR61; verify all source heads are ancestors.
- [ ] Add failing generic bench alias regression, correct generic alias without changing explicit equipment, and update the synthetic known-conflict corpus.
- [ ] Run relevant tests and quality evaluator.

### Task 4: Verify, review, publish draft
- [ ] Run full app/root tests, TypeScript, builds, Worker and relevant browser matrix on combined tree.
- [ ] Run lint and compare per-rule/file counts to clean parents; fix integration-introduced issues only.
- [ ] Obtain independent branch review; address important findings with regression tests.
- [ ] Commit evidence/report, push only new branch, create and attach Draft PR against PR59, verify remote CI.
