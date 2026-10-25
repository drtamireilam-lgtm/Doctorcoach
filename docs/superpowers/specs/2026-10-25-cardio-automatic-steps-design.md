# DoctorCoach cardio and automatic steps — repository audit and proposed design

Date: 2026-10-25. Status: approved by owner in this chat; implementation and local validation completed with native/device/background release blockers documented in ../../cardio-activity-implementation-he.md.
Owner request: Cardio & Automatic Activity Tracking 1.0, supplied in this chat.
Branch: `feature/cardio-automatic-steps-20261025`.
Verified remote base: `818e4ce6a4b3b48084f12f1791b98832f4228214` (`origin/main`).

## Intent and constraints

Extend existing programs, workout execution, history and progress with cardio. Obtain real daily step totals automatically from authorized native health platforms. Preserve rehabilitation goals, coach boundaries, existing strength training, Hebrew/English and RTL/LTR.

No production deployment, main merge, remote migration, destructive database operation, fabricated activity, unrelated anatomy/import/canonical-matching/OAuth edits, or claim of real-device validation. Do not overwrite the shared LAB. Native signing, store submission, remote schema changes and LAB deployment remain separate owner-controlled operations.

## Audit evidence and reuse

The repository root has a small React/Vite application. The deployable application relevant to the supplied LAB is `apps/doctorcoach-standalone` (paths below are relative to that directory).

| Area | Existing implementation | Reuse / required extension |
| --- | --- | --- |
| Programs and sessions | `lib/training.ts`: `PlanItem`, `SessionExercise`, `TrainingSession`, occurrence IDs; `lib/training-store.ts`: owner-scoped plan/session writes, optimistic versions, idempotent start | Add typed cardio prescription and execution to these models, preserving strength defaults and occurrence IDs |
| Assignment | `lib/training-access.ts`: coached/self access and `assignedPlan`; `lib/program-author.ts`, `lib/coach-workspace-guard.ts` | Preserve author/assignment guards in both legacy care programs and workspace programs |
| Coach builder | `lib/care.ts`: assigned-item parser; `lib/program-review.ts`; `components/program-exercise-editor.tsx`, `components/coach-workspaces.tsx` | Extend every parser/editor/review path; a new standalone cardio plan store would duplicate the current system |
| Workout execution | `components/training-workspace.tsx`, `app/api/training/route.ts`; JSON session items, versioned mutations | Add cardio actions through the existing session endpoint; never represent running as a weighted strength set |
| History and progress | `components/training-workspace.tsx`, `lib/progress-timeline.ts`, `components/progress-overview.tsx` | Render cardio summaries from the same completed sessions |
| Weekly report | `lib/weekly-progress.ts`, `lib/weekly-progress-store.ts`, `components/weekly-progress.tsx` | Extend existing calculations and print/save-to-PDF view; existing report uses explicit weekly plans and distinguishes missing data |
| Home | `components/trainee-simple.tsx`; also `TrainingDashboard` in `components/training-workspace.tsx` | Both supported home presentations need the steps card |
| Permissions | `lib/care-write-guard.ts`, `lib/consent-server.ts`, `lib/training-write-guard.ts` | Retain current relationship, role, consent and atomic-write guards; add separate health-source and per-coach activity-sharing consent |
| Backend | `db/raw.ts`, `standalone/worker.ts`, `standalone/gateway.ts`; D1 `DB` and R2 `BUCKET` | Activity application data belongs in D1 following current deployment architecture; do not assume Supabase tables are the application's training store |
| Identity | Worker uses Supabase provider behind its auth gateway | Native requests must use a supported existing identity boundary; no arbitrary browser-provided owner IDs and no OAuth rewrite |
| PWA | `public/manifest.webmanifest`, `public/sw.js` | Static asset cache intentionally excludes personal API data; preserve that rule |
| Notifications | `lib/push-store.ts`, `lib/push-maintenance.ts`, `lib/browser-push.ts`, `app/api/push/route.ts` | Reuse optional progress notification preferences, never send health totals to lock-screen push |
| Localization | `components/language-provider.tsx`, `lib/localization.ts` | Preserve canonical values, translate visible copy and labels, honor document direction |
| Native code | No `.swift`, `.kt` or Capacitor configuration found in the inspected tree | Native work is a new integration surface, not an existing working capability |

The shared local checkout at `Documents/ChatGPT/DoctorCoach/source` was on an anatomy branch. It was read only. A separate clone was created under this chat's `work/Doctorcoach`; `main` was fetched, confirmed unchanged from the local base, and the dedicated branch created there. No parallel branch was checked out, reset, merged or modified. Remote branch tips alone do not establish that a release is stable: the base is the verified current main, with baseline testing still required.

## Alternatives and recommended architecture

1. **Thin native wrapper around existing web application — recommended, pending owner review.** Keep existing screens and server authorization. Bundle only step access, native lifecycle, secure account binding and background scheduling. This minimizes UI duplication. New native build/signing and bridge security work are necessary.
2. **Separate native companion.** Leaves PWA packaging unchanged, but adds a second installation, sign-in/account-linking and consent/status surfaces. It can be selected if wrapper distribution is undesirable.

A browser-only HealthKit/Health Connect implementation cannot meet the stated requirement. A full native rewrite is outside scope and unnecessary. The recommendation is an engineering proposal, not a decision already approved by the owner.

The wrapper must expose an allowlisted typed message interface, accept messages only from its pinned DoctorCoach origin and main frame, disallow bridge access after external navigation, and fail closed on unrecognized commands. No public `window` injection, wildcard message origin or secrets embedded in JavaScript. Use secure native storage for persistent identity material and bind sync to the active account. Logout cancels queued sync and deletes queued health payloads. Account switching must never deliver one person's queued data to another account.

## Cardio domain and integration

Introduce an independent `lib/cardio.ts` domain module imported by training parsers, without importing training back into cardio. Stable IDs:

`walking`, `outdoor_running`, `treadmill_running`, `cycling`, `stationary_bike`, `elliptical`, `skierg`, `outdoor_skiing`, `rowing_machine`, `swimming`, `stair_climber`, `incline_walking`, `hiit`, `jump_rope`, `other_cardio`.

Use an explicit kind discriminator and dedicated catalog namespace, leaving existing canonical exercise matching untouched. Existing strength records without a kind remain strength. Every entry has an occurrence ID and training day. Existing warmup/main/stretch sections remain supported; cardio phases separately distinguish warmup/work/recovery/cooldown.

`CardioPrescription` contains activity ID, mode, optional target metrics, and bounded intervals. Each interval has stable ID, phase, duration, optional relevant targets, and optional repeat count normalized into a bounded execution sequence. Distance-only steady-state sessions remain supported. No zero/negative/NaN targets, unbounded repeats or irrelevant metric combinations. Units are explicit: seconds, meters, seconds/km or seconds/500m, km/h, percent incline, bpm, rpm, pool length in meters, completed lengths, resistance with device-context label, RPE 0–10, optional kcal.

Common optional fields: duration, distance, average/max heart rate, RPE, calories. Pace/speed apply to appropriate locomotion activities; rowing and SkiErg show seconds/500m; treadmill/incline walking permit speed and incline; swimming permits distance and pool lengths; resistance/cadence are shown only where meaningful. Metrics absent from a source remain null, not zero. Distance derived from lengths requires a known pool length. Never infer calories or heart rate.

Add cardio JSON to self-program persistence through an additive D1 migration; coach-assigned JSON carries the same validated typed prescription. Update `getPlan`, `savePlan`, both assignment parsers, start validation and session snapshot construction. Keep the original prescription immutable in a running/completed session. Completed results are separate from prescribed targets. Occurrence IDs allow two runs of the same activity in one day.

Extend the existing builder with a cardio picker and relevant fields, inside My Program. Support cardio-only days and mixed days. The existing Start workflow creates one session with both item kinds; changing to cardio must never bypass readiness/safety/assignment guards. Completion calculations and next-set/load suggestions must branch on kind so cardio never enters strength e1RM or automatic-load calculations.

## Durable player and interruption semantics

Use server-accepted event timestamps, optimistic session versions and idempotent action IDs for start/pause/resume/finish. Elapsed time is the sum of closed running spans plus an open running span only while foreground continuity is known. A normal screen change inside the application does not pause the session.

On background/pagehide, attempt a durable pause checkpoint. If the process terminates or refreshes without a confirmed pause, restore as interrupted with the last server-confirmed elapsed time; show the unresolved gap for explicit user confirmation or exclusion. Do not silently treat the entire wall-clock gap as performed cardio. Clamp negative clock changes and reject impossible timestamps. A monotonic client clock drives display between server checkpoints; server timestamps are authoritative for persistence.

Pause freezes active elapsed time and interval transitions. Resume starts a new span. Finish closes any active span exactly once, captures actual relevant metrics and RPE, and freezes the result. Running interval index, next interval and remaining prescribed time derive from active elapsed time, not callback counts. A paused player stays paused across refresh. Concurrent tabs must receive a conflict and reload rather than both append time.

## Automatic steps and source data contract

User starts native connection explicitly. Native reads only steps, computes platform aggregate totals and sends daily replacement snapshots automatically on open and eligible background opportunities. PWA shows an accurate native-app-required connection state; it cannot promise a connection it cannot create.

Connection states distinguish not connected, awaiting native permission, connected with data, no readable data, unavailable, sync failed, disconnected and known revoked. Apple permission prompt completion is not proof of read authorization; an empty Apple response must remain no-readable-data/unknown, never denied or zero without evidence.

Proposed additive D1 entities:

- `activity_connections`: owner ID, platform, server-issued connection ID, generation, enabled, read-status observation, timezone, last attempt, last success, revoked/disconnected timestamp, version.
- `activity_step_days`: owner ID, connection ID/generation, local activity date, IANA timezone, exact UTC start/end, nullable total, coverage/status, platform aggregate method, provenance identifiers, source observation time, server receipt time, monotonic revision. Unique key `(owner_id, connection_id, generation, activity_date, timezone)`.
- `activity_step_goals`: owner ID, effective date range, daily target, optional weekly-average target, author ID, author role and version; no universal default target.
- `activity_shares`: owner ID, specific authorized coach identity, explicit steps/cardio-summary scopes, start/revocation times and version. Heart-rate access has an additional explicit scope.

Use platform aggregates; do not sum phone and watch records or sum Apple and Android totals. A person chooses one active authoritative connection for reporting. A timezone change creates a new window identity and does not cause adjacent overlapping windows to be added together. Historical views retain their recorded timezone. Show a boundary-change label and use one selected window per local reporting date; do not claim seamless cross-timezone counts. Historical corrections replace the corresponding snapshot, including downward corrections and explicit no-readable-data states, rather than incrementing a counter.

Server accepts identity only from authenticated session/native authorization, never `ownerId` in the body. Connection generations prevent offline payloads from reviving disconnected sources. Per-connection observation revisions reject stale/out-of-order snapshots; retries of the same revision/payload succeed idempotently; the same revision with different content conflicts. Multi-day uploads are bounded and transactional. Revision allocation must be serialized per connection and durable across native restarts. Changes of active device create a new connection/generation instead of sharing an unreliable revision sequence.

Source totals are untrusted client input and must be bounded/validated; initial delivery will not claim hardware attestation. Provenance records aggregation metadata, not unrelated health samples. No clinical records, routes or raw heart-rate streams are uploaded as part of steps sync. Read health-platform access and general training/team consent remain separate. Disconnect stops ingestion immediately; retention/deletion follows existing account policy and explicit owner controls.

## iOS implementation and validation boundary

Read only `HKQuantityType(.stepCount)`. Explicit HealthKit authorization, daily cumulative statistics in a pinned calendar/timezone, and platform aggregation without separately adding individual device sources. An observer query can trigger re-aggregation and must call its completion handler after bounded work; statistics collection queries themselves do not register background delivery. Foreground launch always offers reconciliation of recent authorized dates. Never promise a background cadence.

Missing/unreadable results preserve missingness. The native adapter must distinguish an absent sum from an observed numeric zero where the API supplies that distinction. Do not claim that read denial or revocation can always be directly detected. On query/authorization errors show the actual known state and settings guidance; explicitly disconnected DoctorCoach connections reject uploads regardless of Apple state.

Requires Xcode/macOS, an Apple Developer team for signed distribution, a bundle ID, HealthKit capability and required background-delivery entitlement/configuration, clear `NSHealthShareUsageDescription`, provisioning, privacy disclosures and an iPhone with real step data. Apple Watch inclusion is validated through Apple Health aggregate data on paired devices. Windows unit tests cannot establish native build or device functionality.

## Android implementation and validation boundary

Health Connect availability check with unsupported/provider-update-required/available branches. Request only steps read permission initially; request background read separately only if the feature is supported and the user opts in. Query `StepsRecord.COUNT_TOTAL` through Aggregate API over explicit day windows, without per-origin addition. Use user platform priorities and include on-device steps through aggregate queries rather than depending on the old `android` origin identifier.

Foreground reconciliation on launch; WorkManager background work only where feature/permission/OS scheduling allow. Recheck granted permissions at every read and stop when revoked. Older devices may require Health Connect installation/update; do not assume all phones or watches supply data. Bound historical reconciliation to the authorized window; no history permission requested by default. Requires Android SDK/JDK/Gradle, declared permissions, rationale/privacy activity and distribution declarations, signed builds and real supported phones/watch sources.

## Steps, progress, reports and coach UI

Home card shows today's observed steps, chosen target (or no goal), progress only when both are known, last successful sync, actual connection state and a seven-day average with count of observed days. No samples/example totals in live UI. Missing dates are gaps; observed zero remains zero. Label whether an average includes a partial current day. Render weekly and 30-day views in existing Progress; add a table accessible to screen readers.

Cardio analytics group by canonical activity, context and comparable units: completed sessions/minutes, distance, RPE, pace and authorized heart rate. Strength session counts remain accurate for mixed sessions; a mixed session counts once in overall workouts and contributes to each modality without inflating total workouts. Pace personal records require a meaningful comparable activity/distance context. Planned/adherence denominators require explicit scheduled targets, not arbitrary repetitions of an unscheduled template.

Extend existing weekly report and print view with planned/completed cardio minutes, sessions, distance by activity, step average/observed days/target adherence, RPE and existing authorized rehabilitation notes. Imported external activity identifiers, when present, use a stable source identity to avoid a second representation being counted again; do not alter import algorithms. Until that contract is available, label potential external duplicates and exclude unverified duplicated aggregates rather than guessing.

An authorized coach needs both an active existing relationship and the trainee's specific activity sharing grant. Recheck after assembling a report and atomically in writes so mid-request revocation cannot leak data. Training summaries never include unrelated medical notes. Heart-rate scope remains independently gated. Goal edits by coaches require existing program-author permissions plus the appropriate activity grant; athlete self-goals remain available independently. Goal history preserves who prescribed each change; no automatic escalation or generic 10,000-step prescription.

## Verification plan and release gates

Before implementation, baseline the untouched branch: standalone unit suite, root suite, typecheck, lint, normal build and isolated build. Record exact command, exit code, counts and pre-existing failures. Do not call this base stable solely because its branch name is main.

Use red/green tests for domain parsers and activity-specific metrics; existing/legacy strength records; mixed/cardio-only plan creation and execution; occurrence identity; immutable prescription; pause/resume/refresh/interrupted gaps; concurrent mutation conflicts; interval boundaries/repeats; and history/report totals. Test clinical safety and coached/self authorization remain unchanged.

Use disposable SQLite/D1 integration tests for additive migrations, atomic consent/relationship revocation, every cross-owner read/write, unrelated coach denial, granular sharing, idempotent sync, same-revision conflicts, stale payloads, corrections including lower totals, missing versus zero, partial-day coverage, daylight-saving 23/25-hour dates, timezone changes, overlapping windows, active-source switching, disconnected generations and logout/account switching.

Native mocks cover permission/error/aggregate contracts only and are labeled mocks. Separate CI/build gates must compile iOS and Android. Separate device matrix must validate real permissions, deny/revoke/reconnect, phone+watch overlap, foreground/backround/open reconciliation, process death, timezone/DST, offline retry and account switching. Do not mark the native integration functional before these pass.

Browser verification covers Hebrew/English, RTL/LTR, narrow mobile width, accessible fields and timers, Home, My Program, Active Workout, Progress, weekly print/PDF, coach sharing and existing strength regressions. Run Worker locally with disposable bindings and auth fixtures; no live credentials in logs. Build a LAB candidate without deployment; only deploy a separately approved coordinated release, never overwrite the current shared Worker implicitly. Remote migrations require explicit owner approval after disposable-environment verification.

## Execution sequencing and dependencies

1. Establish tested baseline and record current integration branch/API contracts.
2. Cardio domain/model/parser migrations and regression tests.
3. Existing program builders, session store/player, history, localization and browser tests.
4. Secure connection/generation/snapshot/goals/sharing endpoints and disposable database tests.
5. Native wrapper scaffold, isolated HealthKit/Health Connect adapters, native build gates and documented device blockers.
6. Home/progress/weekly reports/coach UI, source reconciliation and privacy tests.
7. Full test/build matrix, independent branch review, PR and packaged LAB candidate.
8. After owner-controlled signing/setup: real devices; after separate deployment approval: isolated LAB release and browser validation.

Files also likely touched by parallel import/Smart Load work: training models/store/workspace and program editors. Keep changes small and additive; do not cherry-pick the unverified parallel integration wholesale. Rebase only after reviewing its completed contract; resolve import/canonical/OAuth changes outside this task. The exact latest parallel task state is not established by this audit.

## Baseline verification actually executed

The default Node test isolation mode failed before test execution with `spawn EPERM` in this sandbox. The targeted suite was rerun with Node's supported in-process isolation option, without changing product or test code:

```text
node --experimental-strip-types --test --test-isolation=none tests/training.test.mjs tests/weekly-progress.test.mjs tests/workout-days.test.mjs
exit 0; tests 24; pass 24; fail 0; skipped 0
```

This is targeted baseline evidence only, not the complete required regression suite, a native test or a build. Unit/integration coverage in these files exercises existing training, weekly summaries and workout-day persistence. TypeScript, lint, full application/isolated build, local Worker smoke, UI/browser and native/device validation have not been run in this planning stage.

## Independent builder check

A fresh reviewer identified three product decisions with material implementation consequences: wrapper versus companion, background/locked-phone cardio timing semantics, and one authoritative health connection. No product code was written as part of this check. The conservative timer policy above is deliberately a proposal; stopping an outdoor run's clock when the phone locks may be undesirable. Before implementation, owner review must resolve whether a user-started timer continues while backgrounded (clearly labeled elapsed timer rather than sensor-verified activity), with confirmation of uncertain process-death/refresh gaps. This distinction changes lifecycle persistence and acceptance tests.

## Known decisions still awaiting approval

Approve or correct the thin native wrapper recommendation before scaffolding a new mobile application. This design also proposes conservative interruption recovery and one authoritative health connection for daily reporting. Signing teams, distribution IDs and real test devices are not available/verified in this chat. An implementation plan follows design approval; this document is not an implementation or a successful test report.

## Primary platform references checked 2026-10-25

- Apple authorization/privacy semantics: https://developer.apple.com/documentation/HealthKit/authorizing-access-to-health-data
- Apple query/background distinctions: https://developer.apple.com/documentation/healthkit/reading-data-from-healthkit
- Apple daily statistics: https://developer.apple.com/documentation/healthkit/hkstatisticscollectionquery
- Android aggregation, deduplication and read windows: https://developer.android.com/health-and-fitness/health-connect/aggregate-data
- Android on-device steps and 2026 source attribution: https://developer.android.com/health-and-fitness/health-connect/read-data
