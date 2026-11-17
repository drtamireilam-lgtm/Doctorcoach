# Workout Muscle Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Connect the existing anatomy map to a selected program day and a clearly qualified weekly overview.
**Architecture:** Pure planned-working-set aggregation over explicit exercise profiles. A read-only program component uses one lazily owned existing viewer with optional overlay links; no persistence/API writes.
**Tech Stack:** React/TypeScript/Three.js, Node tests, existing browser CI.
**Spec:** docs/superpowers/specs/2026-11-17-workout-muscle-map-design.md

## Global Constraints
- Preserve role palette and deltoid part matching; clinical review pending, no activation/load claims.
- Weekly = one of each program day, explicit assumption; primary/secondary/stabilizer separate.
- Exclude warmups/stretch/cardio; unknown or invalid prescriptions disclosed.
- Read-only, owner-scoped, lazy single scene; HE/EN320/390/430/768; isolated LAB only.

## Review Focus
- Same exercise repeated in one/day across days retains separate prescriptions and counts (Task1).
- Empty days, unavailable mappings and invalid set counts produce honest totals/fallback (Task1/2).
- Generic versus specific deltoid links and mixed roles preserve strongest-role colour plus every count (Task1/2).
- Scope/plan/account changes clear stale selection and dispose scene (Task2/3).
- WebGL unavailable/closed map still exposes accessible full information without writes (Task2/3).

### Task1: Aggregation
Files lib/anatomy-workout.ts, lib/anatomy-training.ts, tests/anatomy-workout.test.mjs.
Interfaces: workoutMuscleSummary(items:readonly PlanItem[]) -> {muscles:WorkoutMuscleRow[],unmapped:WorkoutMapIssue[],excluded:number}; row contains slug,part,key,counts(primary/secondary/stabilizer), contributions(index,exerciseId,dayId,sets,role). workoutMuscleLinks(rows) -> explicit overlay links; structureRolesForLinks(model,links) reusable matcher.
- [ ] Add tests for bench3+row2+bench4 in otherday, exclusion/unknown/invalid, part scopes and aggregate precedence. RED before implementation.
- [ ] Implement pure helpers; run node --experimental-strip-types --test tests/anatomy-workout.test.mjs; expected allGREEN; commit.

### Task2: Program UI and viewer integration
Files components/workout-muscle-map.tsx, components/anatomy-model-viewer.tsx, components/training-workspace.tsx, app/care.css; tests/workout-muscle-map.test.mjs.
Interfaces: WorkoutMuscleMap({items:readonly PlanItem[],days?:{id,label}[],initialDay?:string}); viewer optional muscleLinks/title/onSelectStructure callbacks; same source model and existing lifecycle.
- [ ] Add component-render tests for day/week counters, excluded/unmapped honesty, accessible muscle details and independent occurrence picker; RED.
- [ ] Implement lazy owner-keyed entry in PlanWorkspace, readable summary/list/details, weekly assumption and read-only notes; one optional viewer with same links. No active-workout scene.
- [ ] Run focused tests and tsc --noEmit; expectedGREEN; commit.

### Task3: Browser verification and reviewable release
Files scripts/anatomy/training-pain-smoke.mjs (extend existing fixture), docs verification evidence.
- [ ] Extend real-component browser fixture with synthetic multi-day plan: same-exercise duplicates, main/warmup/stretch/cardio/custom. HE/EN4widths day/week/exercise changes, list/model selection, no writes, scene count/disposal, empty/mutation/account-unmount fallback. Run in CI (local browser socket restriction persists).
- [ ] Focused tests/typecheck plus existing full unit suite, build, anatomy/workout/WebKit/public workflows allGREEN. One fresh whole-branch reviewer; fix important findings via RED→GREEN. Publish using connector with exact tree equality.
- [ ] Merge and deploy only exact tested source to isolated LAB under standing authorization. Verify activeversion, unchanged13 binding identities and public postrelease probe. Report concise outcome and honest limitations.
