# DoctorCoach 4: adaptive training, program drafts and consented pain review

## Result and scope

Completed sets retain their recorded values while the workout screen explains the model estimate, practical constrained next load, absolute/percentage change and uncertainty. Coaches can propose progression from repeated matching historical sessions, generate editable program drafts and inspect performance/muscle-role exposure. Trainees can explicitly share one saved pain report with a named eligible coach for an audited review decision.

This extends the integrated Anatomy/DoctorCoach3 workflows on136f53c. Existing autosave, resume, historical logging, Smart Import, assignment, program revisions and anatomical role rendering remain the underlying workflows. No new anatomical assets, external AI dependencies, automatic assignments or automatic pain-based prescription changes.

## Reviewable changes

- Training intelligence: deterministic policy helpers, raw versus constrained explanation, decimal support, conservative guards, assisted-counterweight exclusions. Historical evidence uses performed dates, exact occurrence/side/load/prescription snapshots and refuses ambiguous same-day recency.
- Program generation: explicit nine-exercise catalog pool, equipment/preferences/exclusions, rep/RPE/rest prescriptions and quality checks. Loading into the existing editor starts normal private draft autosave; publication/assignment is separate.
- Analytics: authorized completed sessions, performed-date periods, frequency, known external volume, recorded reps, e1RM, target/actual RPE, separate primary/secondary/stabilizer counts and descriptive observations. Accessible tables accompany charts.
- Pain review: explicit named-coach consent, server-derived report snapshot, idempotent request, optimistic versioned decision, immediate owner-tagged UI isolation, current health/care authorization and medical holds. Export/account deletion cover shared copies and audit events.
- Bilingual integration and responsive synthetic browser tests. Windows CRLF preparation correction preserves pinned asset content and checksum.

## Validation

The complete local regression run passed2143 tests with zero failures. Subsequent focused checks cover the legacy progression path and immediate owner-change rendering; final CI results will be recorded below. Focused legacy/adaptive progression tests23/23; migration tests6/6; deletion tests13/13; local workerd/D1 populated upgrade through0064 passed. TypeScript and isolated standalone build passed. Browser fixtures test HE/EN320,390,430,768; training also1280. Browser tests use synthetic components, not real LAB accounts or physical iPhone Safari.

Commands: `npm run typecheck`; `node --experimental-strip-types --test --test-concurrency=8 tests/*.test.mjs`; `node standalone/scripts/build.mjs`; `node standalone/scripts/check-isolated-staging.mjs dist/server/wrangler.json`; `node --experimental-strip-types standalone/scripts/workout-migration-smoke.mjs`; `node --experimental-strip-types scripts/smart-training-browser.mjs`; `node --experimental-strip-types scripts/pain-modifications-browser.mjs`.

Screenshots/results are uploaded by the Smart training4 acceptance workflow as `smart-training-synthetic-evidence`. All data in these captures is synthetic. Existing anatomy/workout CI provides broader regression gates.

## Migration and rollout

Additive `0064_pain_modification_reviews.sql` creates review rows, versioned events, indexes and audit triggers. It does not rewrite existing workouts or program data. No remote migration was applied. Apply only to the explicitly approved target before authentic end-to-end acceptance. Roll back application/UI first and preserve review/audit records for normal retention/export/deletion handling; do not automatically drop health records.

Local workerd rehearsal is offline and uses its installed compatibility date, not proof of the remote LAB runtime. No production or LAB deployment and no merge performed.

## Known limits / remaining acceptance

- Embedded workout pain entry withholds alternatives without a validated medical gate. The Anatomy workspace receives onboarding gate state and uses only existing occurrence-specific approved alternatives. Review approval is not medical clearance and never edits the program.
- Custom exercise review-sharing metadata is not supported; existing private reports and coach messaging remain available.
- Generator uses a deliberately small explicit pool; individualized periodization/history-based generation and persistent coach policy profiles are future work.
- Automatic deload/recovery/volume-adjustment policy and complete long-term history pagination remain incomplete. Analytics summarize only loaded authorized history and do not measure muscle activation or physiological adaptation.
- Authentic LAB coach/trainee acceptance, remote migration rehearsal and physical Safari validation remain pending explicit environment/deployment authorization.

Detailed evidence matrix and continuation notes: [SMART_TRAINING_4_2026-11-16.md](SMART_TRAINING_4_2026-11-16.md).
