# Completed live workout set corrections — 15 November 2026

## Scope and baseline

User authorized merging PR81 and executing the next mission. PR81 was marked ready and merged into its existing PR80 parent branch at `78969768df1fac1f06c0e0cdbeb46ee55880a32c`; remote merged status was verified. No other PR was merged and no deployment or remote SQL ran.

This follow-up adds an explicit bilingual history editor for already-done main strength sets in completed live nonretrospective workouts. Select the exact occurrence/set and correct repetitions1–100, decimal canonical load0–1000kg with kg/lb input, and achieved RPE/RIR. Unknown effort stays null. No historical autosave or recommendation application.

## Integrity and authorization

GET/PATCH `/api/training/corrections` use authenticated canonical ownership, private/no-store responses and existing JSON/origin controls. No owner identity is accepted from the payload. Current entitlement, consent, readiness/intake, ownership, status, exact raw items and version are guarded at commit. Foreign, active/cancelled/retrospective, timed/cardio/preparation and undone sets are excluded.

Only selected amount/weight/achieved effort change. Changed load is marked manual; unchanged load preserves provenance exactly. Raw unknown metadata, prescriptions, warmups, cardio/checkpoints, pain, readiness/followup/feedback, counts, status and start/end timestamps stay intact. Legacy derived occurrence IDs resolve raw slots without being persisted. Current programs and active sessions are untouched.

Existing0062 `retrospective_workout_revisions` is reused as a generic private prior-session journal; its schema has no retrospective-only constraint. Snapshot JSON retains the complete prior raw SQL row plus namespaced request/fingerprint/operation metadata. There is no new schema/index/dependency or journal API exposure. Existing deletion purge/cascade/barrier applies.

Journal+update are atomic. Per-invocation cleanup removes false audit on a zero-row guarded update without deleting a winner. Identical retries, including after later intentional corrections, return current state without replaying old values. Changed request content or stale version returns409. Editor retains failed drafts and retry identity;409 blocks saves until explicit reload/discard. Controller synchronization updates history/progress without replacing an active session or changing aggregate done counts.

## Verification

- New domain/store, actual component-handler, history wiring, controller and route-adapter tests:32/32 passed.
- Disjoint affected historical correction/deletion/active completion/load/flexibility/identity regressions:61/61 passed.
- Standalone TypeScript passed; new-file/controller/route ESLint clean. Existing training-workspace lint:0 errors,7 baseline warnings, no suppressions.
- Production standalone build and entire built authenticated Worker HTTP smoke passed, including new correction/retry/stale/cross-owner/origin assertions. All accounts/provider responses/databases are synthetic and local.
- Real React/controller/SQLite browser harness covers HE/EN320/390/430/768/1363, decimal lb/RIR, failed-save retry, conflict/reload, active preservation and geometry. Local Chromium launch blocked by OS `socket() failed: Operation not permitted`; no local browser pass claimed. Candidate CI runs it and retains screenshots/results. Final CI result belongs in PR body, avoiding a source change only to record completed CI.
- Independent read-only final review found no actionable issue in the complete branch.
- A route-test initially expected404 for a foreign caller without health consent; existing consent-first policy returned403. Test now accepts403/404 denial. Foreign GET and built authenticated ownership checks remain separate; no authorization rule was changed.

## Release limits

This source depends on the pending parent stack and its separately reviewed0061→0062→0063 prerequisites. This follow-up adds no migration. Code rollback retains private audit data; no destructive cleanup is proposed. Hosted signed-in acceptance and physical iPhone/Safari/VoiceOver remain unverified. Full legacy completed workout structure/time/cardio/pain editing is excluded; this slice preserves them while correcting working strength results. The private audit journal is not shown in this UI.

No further merge, LAB/production deployment, remote migration, real trainee/patient write, account/provider action or notification occurred. Next acceptance task: reconcile reviewed source, actual LAB schema and recovery envelope, then separately authorize exact missing SQL/deployment before synthetic hosted lifecycle and physical-device checks. Source/CI completion does not establish deployed acceptance.
