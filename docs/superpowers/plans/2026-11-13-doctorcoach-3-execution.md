# DoctorCoach 3.0 execution plan

Goal: complete the user's authorized workout/program experience mission by extending existing PR75 rather than rebuilding PR62/74/75.

Architecture: preserve the existing React, versioned store and immutable workout snapshots. Stack reviewable changes on PR75. Use synthetic local SQLite only; no remote migration, merge or deployment.

- [x] Verify PR62, PR74, PR75 and exact commit workflow status; read the prior master acceptance report.
- [x] Establish isolated checkout on PR75 and install locked dependencies.
- [ ] Import/program stream: reuse existing parsing/matching/revisions; test and add single-occurrence duplication and explicit compatible exercise substitution, retaining historical snapshots.
- [ ] Workout stream: add optional actual Israel time, separate recording timestamp, DST/future validation and duplicate tests; add conservative versioned autosave without automatic completion/load changes.
- [ ] Browser stream: execute existing responsive fixtures at 320/390/430/768 HE/EN; retain environmental failures honestly; verify interaction with real React and disposable SQLite where rendering is blocked.
- [ ] Run focused tests, typecheck/build and independent review; fix reproduced issues.
- [ ] Add isolated candidate CI for stacked branch targets currently excluded by existing workflow filters.
- [ ] Publish draft review PR, record exact-source CI and acceptance/risk matrix. Keep release gates intact.

Review focus: DST gaps/overlaps, same-day duplicates and retry identity; cross-owner or stale-version mutations; autosave races while editing/navigation; incompatible exercise units and copied load; no mutation of historical prescription snapshots.
