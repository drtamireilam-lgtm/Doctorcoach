# Completed Workout Set Corrections Implementation Plan

**Goal:** Let an authenticated trainee explicitly correct a completed live strength set's repetitions, load and achieved effort, with a private prior-version audit and safe retries.

**Architecture:** A separate owner-scoped API/domain/store updates only the selected completed working set. The existing0062 private session-version journal retains raw prior session rows plus namespaced request/fingerprint metadata; no new schema or retrospective conversion. The existing training controller lock and session synchronization update history/progress without affecting an active session.

**Tech stack:** React/TypeScript, existing D1 batch/SQLite tests, vinext routes, existing premium CSS and bilingual helpers.

**Spec:** User's15November instruction to merge81 and execute the previously recommended audited live-completed set correction mission.

## Constraints and decisions

- Base is merged PR81 in PR80 branch at78969768df1fac1f06c0e0cdbeb46ee55880a32c. Only81's merge is authorized/executed; future source merges/deployments remain separately gated.
- Eligible: completed, nonretrospective sessions; main-section noncardio reps exercises; already-done sets. Reps1–100 integer, weight0–1000kg with decimals, canonical RPE null or1–10 in half steps. UI respects source kg/lb and RPE/RIR.
- Preserve start/finish times, origin, all prescription/unknown JSON, cardio, warmups, pain, readiness, feedback, done counts, current program and active workout. No invented recording time for legacy rows.
- Current entitlement, consent, safety and deletion boundaries apply at commit; coach or foreign identity cannot edit trainee-owned rows.
- Each explicit operation has a UUID. Identical retries never replay old fields or create duplicate audit rows, including after later edits; changed stale content409. No automatic historical autosave or next-load application.

## Tasks

1. Backend/domain owner: add `lib/completed-workout-corrections.ts` with typed payload/eligibility/parser and `lib/completed-workout-correction-store.ts` exposing load/correct. Red→green tests for raw preservation, validation, owner scope, CAS/retry, failed audit rollback, commit revocation and competing/zero-write journal cleanup.
2. UI owner: add `CompletedWorkoutCorrection` and real-handler tests in HE/EN. Explicit set selector, fields, save/cancel, retained failure draft, stable retry identity, conflict freeze/reload, loading/confirmation state. Do not reuse retrospective editor.
3. Integration owner: add GET/PATCH `/api/training/corrections`, controller `correctCompletedSet`, and history wiring. Test actual authenticated route adapter with disposable SQLite and controller state. Extend built Worker smoke for real authenticated correction/retry/foreign-owner denial. Add focused tests/rendered acceptance to existing candidate workflow.
4. Validate focused suites, TypeScript, targeted lint, build and synthetic HTTP/rendered flows where environment permits. Reuse prior full-suite evidence for unaffected workflows; do not run the1852-test suite without a specific broad regression risk. Independent final review; deliver a focused Draft PR. No remote migration/deployment or further merge.

## Review focus

- Repeated exercise IDs must resolve only the exact occurrence; load cannot transfer between them.
- Old successful request retried after later corrections returns current values without reverting them.
- Guarded zero-row updates leave no false audit, while losing cleanup cannot remove a winner's row.
- Concurrent feed refresh must not overwrite editor draft;409 remains blocked until explicit reload.
- Legacy unknown JSON, missing optional metadata, warmup/cardio and RIR/lb units must remain intact.

## Progress

- PR81 merged and remotely verified; merged tree retained.
- Backend and UI implementation delegated with disjoint file ownership; integration proceeds in the local feature branch.
