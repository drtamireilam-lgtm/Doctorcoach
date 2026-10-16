# Explicit next-set and exercise navigation

Development branch only, not deployed. No remote data or schema changes in this change.

User decision: do not add a rest timer, countdown, automatic rest duration, alarm, or timer controls. Reconsider only upon a future explicit request.

An active, unblocked workout shows a next-set card before the readiness/context information. It uses persisted done flags and the same warmup/main/stretch display order as WorkoutSections. The earliest unfinished set is highlighted and labelled in its exercise. Completion does not auto-scroll or change focus; the trainee explicitly chooses “לסט הבא”. This opens a collapsed exercise, focuses its set wrapper (not a numeric field), and scrolls to it. It never edits values, checks a set, starts or finishes a session, changes prescribed loads, or navigates away from unsaved inputs.

Each exercise ends with previous/next exercise buttons in the displayed order. Completed exercises remain accessible and editable using existing controls. Hidden/collapsed contents stay mounted, preserving existing drafts. Missing/removed targets are ignored safely. Controls are disabled while a controller operation is pending. Blocked workouts retain their existing read-only saved-set summary and finish/cancel controls without training navigation.

All-complete state explicitly says all sets are marked and that the user can edit previous sets or finish; it does not imply the workout itself has been completed or saved to history. No automatic scrolling, timer, notification or new entitlement.

Validation: regression tests cover visible ordering, advance after saved done, anchor separation, opening collapsed exercises, focus/scroll ordering, missing/removed targets and preserving existing route/dirty guards. Full tests, TypeScript and standalone build required. Actual mobile focus/scroll and visual QA pending isolated staging deployment. DOM focus tests use test doubles, not a real browser.

Deployment note: the branch still contains the earlier 0045_workout_finish_feedback migration; its verified-backup and migration-before-deploy requirements remain applicable (see WORKOUT-FINISH-2026-10-16.md).
