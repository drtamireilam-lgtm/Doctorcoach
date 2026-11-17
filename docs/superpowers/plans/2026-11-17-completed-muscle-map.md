# Completed Muscle Map Implementation Plan
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans inline; one fresh whole-branch reviewer.
**Goal:** Show actual working-set muscle exposure and honest snapshot comparison in Progress.
**Architecture:** Pure completed-history projection, shared map presentation, owner-keyed history entry. Existing model and learning dialog remain unchanged in ownership.
**Tech Stack:** React/TypeScript, existing anatomy catalogue, Node tests, GitHub browser CI.
**Spec:** docs/superpowers/specs/2026-11-17-completed-muscle-map-design.md
## Global Constraints
- Completed sessions only, highest-version dedup before filtering, Israel performed calendar date, Sunday week.
- done===true working results only; no warmup/stretch/cardio; max20 results, invalid dates/counts disclosed.
- Historical snapshot only; unavailable comparator stays unknown. No current-plan reads, API/schema writes or physiological claims.
- HE/EN320/390/430/768; one lazy map; clear on owner/context changes.
- Preserve deployed DoctorCoach4 union; merge only scoped feature, deploy exact tested union to isolated LAB.
## Review Focus
- A newer cancelled correction must remove an older completed version(Task1).
- Date-only retrospective entries and Israel midnight/week boundary cannot use upload dates(Task1).
- Substitutions, missed original exercises and repeated occurrences retain distinct source counts(Task1).
- Unknown comparator and custom muscle mapping never become zero/guessed physiology(Task1/2).
- Week/session switches and owner/history changes discard stale learning/model state(Task2/3).
### Task1: Pure history projection
Files lib/completed-muscle-map.ts, tests/completed-muscle-map.test.mjs.
Interfaces completedMuscleSessions(history):{session,day}[]; completedMuscleWeek(day):{start,end}|null; completedMuscleSummary(history,{sessionId}|{weekOf}) returns actualItems,days,actual/planned summaries,comparisonAvailable,comparison rows and coverage.
- [ ] RED literals: partial/repeated sets, roles, latest-version cancelled, IsraelSunday, retrospectiveperformeddate, exclusions, malformed records, substitution/missed baseline, incomplete baseline; nonmutation.
- [ ] Implement projection; focused Node tests GREEN; commit.
### Task2: Shared presentation and Progress entry
Files components/completed-muscle-map.tsx, components/workout-muscle-map.tsx, components/training-workspace.tsx, app/care.css; component tests.
Interfaces shared map receives optional completedView:{label}; forces aggregate items, completed copy, no planned-week control. CompletedMuscleMap({history}) renders collapsible entry and CompletedMuscleMapContent with language. Entry is owner-keyed at authorized Progress boundary.
- [ ] RED real render and event-handler tests for completed counts, snapshot differences, session/week controls, empty/unavailable/source copy and unchanged planned presentation.
- [ ] Implement localized accessible comparison, controls, bounded table, one lazy reused map, history reset; focused tests/typecheck GREEN; full suite GREEN; commit.
### Task3: Browser, review and isolated release
File scripts/anatomy/training-pain-smoke.mjs adds real completed component fixture and8responsive cases, synthetic records only.
- [ ] Exercise session/week, partial/substituted counts, snapshot comparison, no-comparator/empty, source learning return, owner reset and no writes.
- [ ] One fresh reviewer; one consolidated Important fix pass RED→GREEN; final full suite/typecheck.
- [ ] Scoped PR and preserving LAB union exacttree; required CI green; scoped merge and isolated deploy; compare13bindings/postdeploy public probe. Record any device limits.
