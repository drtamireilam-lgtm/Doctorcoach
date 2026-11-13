# Retrospective Workouts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Log previously performed prescribed or free workouts with honest missing data and private drafts.
**Architecture:** New focused parser/store and API, canonical completed training session plus retrospective metadata, versioned private draft, shared React editor in Progress and Program. Existing history/charts consume canonical sessions.
**Tech Stack:** TypeScript, React, D1/SQLite, Node tests.
**Spec:** docs/superpowers/specs/2026-11-13-retrospective-workouts-design.md

## Global Constraints
- No remote migration/deployment/merge or live user data.
- Retain existing access/consent/medical gates and exact current program snapshot.
- Missing values remain null; dates in Asia/Jerusalem, no fabricated duration.

## Review Focus
- Stale drafts after assignment changes must not attach to a new program.
- Same request ID retries must not create duplicates or accept changed payloads.
- Repeated occurrences retain separate prescriptions; substitutions are performed records only.
- Unknown values must not become zero in charts/CSV/pain summaries.
- Cross-user draft access, revocation races, future dates and double submission fail safely.

### Task 1: Canonical historical record and private draft
Files: lib/retrospective-workout.ts, lib/retrospective-workout-store.ts, lib/training.ts, lib/training-store.ts, drizzle/0061_retrospective_workouts.sql, app/api/training/retrospective/route.ts; tests/retrospective-workout.test.mjs.
Interface: parseRetrospectiveWorkout(unknown, PlanItem[], catalog, now) returns validated record and sessions; retrospectiveWorkoutStore(db, config).load/saveDraft/submit. API GET/PUT/POST uses authenticated owner only.
- [ ] Add failing tests for valid program/free entry, nulls, date rejection, immutable prescription, draft CAS, duplicates, idempotency and ownership.
- [ ] Run tests, implement parser/store and migration, rerun tests.
- [ ] Integrate nullable completed results in history/analytics without changing live workout validation; run affected suites and typecheck.

### Task 2: Shared mobile editor and persistence
Files: components/retrospective-workout.tsx, components/training-workspace.tsx, supporting CSS/localization.
Interface: RetrospectiveWorkout({controller}) loads owner server draft on open; explicit save draft, date/day/source and exercise selectors, optional per-set values, save completion then refresh canonical feed.
- [ ] Add meaningful editor/render tests with bilingual/mobile and missing-data assertions.
- [ ] Implement shared editor, draft conflicts, duplicate acknowledgement, accessible fields and visible errors.
- [ ] Verify focused tests, TypeScript, build and rendered responsive UI where supported.

### Task 3: Final integration review
- [ ] Review whole branch independently, resolve important findings, run appropriate regression checks.
- [ ] Commit and prepare draft PR with exact verification/limitations and migration gate; do not merge/deploy.
