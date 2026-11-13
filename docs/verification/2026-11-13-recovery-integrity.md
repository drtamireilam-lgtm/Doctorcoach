# Pending workout recovery and integrity

Base: PR78 `605127b510a2b50fd0be9222c69d139336bceb07`. This continuation uses only synthetic fixtures. No merge, deploy, remote schema write, real trainee change or protected configuration change.

## Implementation

Minimal editable working-set fields are recorded immediately in transactional IndexedDB, scoped to canonical authenticated owner, active session, occurrence, actual exercise and set index. No names, narratives, credentials, cookies or completion actions are cached. The authenticated own training feed supplies the owner; no cached values are displayed until fresh server context is available. Full disconnection/reload retains the disk record; online recovery reloads context before restoring fields.

Recovered values are compared with the server base. Conflicts remain blocked across edits; manual save or discard is required. Refreshes reclassify even an already-applied cache revision. Acknowledgement/discard uses revision CAS, and discard reads the latest owner/session/exercise-scoped server snapshot. Online refresh cannot overlap a mutation or install a pre-mutation response. A remote substitution remounts its set editor so old load cannot transfer to another exercise.

Local records remain until matching server acknowledgement, explicit discard, or successful finish/cancel cleanup. Unmatched/removed exercise or set records are not automatically applied. Browser storage eviction, a browser crash before a write commits, denied IndexedDB, and physical Safari remain limitations; ordinary server saves and dirty/error guards remain. Warm-up and cardio retain their existing persistence mechanisms; this cache is for working strength-set fields.

## Review corrections and evidence

Real-browser regressions were observed failing before the relevant fixes:
- Editing a conflicted recovered row silently replayed a stale different field.
- Asynchronous discard allowed input edits while awaiting storage.
- Online refresh started a pre-mutation GET during an acquired PATCH.
- An already-recovered cache revision skipped conflict detection after server refresh.
- Delayed discard restored click-time values after a newer server snapshot had rendered.

The extended Chromium HE/EN320/390 flows then passed all these paths using actual Page/SetLine/useTraining, real IndexedDB and disposable SQLite. They also cover complete GET/write disconnection, refresh/reconnect, original done state, owner index isolation and preservation of a newer local revision after an older acknowledgement. Test-only probes are injected by the synthetic Vite fixture, never production files. Full native Safari/VoiceOver or hosted LAB acceptance is not established.

An audit edge case was reproduced separately: a guarded correction UPDATE may affect zero rows without throwing, leaving its earlier journal insert. Cleanup is now inside the same D1 batch and matches a per-invocation UUID in private snapshot metadata. A payload hash alone was insufficient: delayed identical requests after a later successful edit could delete another invocation's audit. A fixed-clock gated regression reproduced this and now preserves both successful prior versions. Retry fingerprint metadata remains separate. No migration is added; audit snapshots gain an internal correctionOperationId.

Focused correction/draft/identity/completion tests, typecheck, targeted lint, production build and complete synthetic built-Worker HTTP smoke were run; exact counts/logs are in the delivery report. Full-suite count1821 belongs to parent77; final aggregate testing is performed after the remaining program-control work, not represented as already passing here.
