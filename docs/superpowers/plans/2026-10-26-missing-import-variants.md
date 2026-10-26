# Missing import variants implementation plan

User-approved scope: add absent variants, bilingual meaningful aliases, explicit implement/angle/grip/posture distinctions, re-evaluate source workbooks. Continue PR #53 without merge/deployment.

Design: add ten canonical builtin records: seated machine leg press (no assumed sled angle), incline machine chest press, machine lateral raise (no assumed seated posture), machine biceps curl (no assumed preacher support), straight-leg cable hip flexion (posture unspecified), parallel-bar dips (not bench/assisted dip), wide-grip cable lat pulldown, narrow-grip cable lat pulldown and two implement-neutral grip-specific parent movements. New records preserve all existing IDs and are additive. Explicit variant metadata supports equipment/family search; free-text instructions name the relevant implement and distinguish unsupported variants. Each new ID needs at least15 normalized bilingual alternative names, counted by the existing audit. No generic ambiguous source is reinterpreted as an implement-specific exercise.

Tasks:
- [x] Confirm no duplicate in current stack/relevant branches; source-check terms.
- [x] Tests RED: canonical uniqueness, metadata/family/search, source literals, >=15 bilingual aliases, negative adjacent variants, and persisted import journey.
- [x] Implement additive records, metadata and aliases; leave matcher conservative.
- [x] Update review diagnostics/tests/browser fixture to reflect newly supported source cases, preserving unknown-case safety.
- [x] Compare all191 source rows to previous106 assignments; regenerate per-exercise audit and aggregate report. Label this development coverage, not accuracy.
- [ ] Full suite/typecheck/targeted lint/build/local Worker; actual12browser flows plus new variant source imports; independent review; push expected-head lease and update draft PR53.

Review focus: machine curl is implement-specific but not automatically preacher or seated; seated leg press has no inferred horizontal/45-degree angle; narrow cable pulldown does not become Hammer machine; parallel-bar dips do not ingest bench/assistance; source prescription and every old assigned target survive.

Ledger: existing checkout is dedicated detached feature candidate; initial tree a1c35a189970fb6627b4ee46b175b78b74709c1d matches remote9ff5232. No new worktree or main changes required. Historical library-builder path absent; current older smart-workout branch has no proposed new IDs. Current open PR list contains no parallel variant expansion.

Verification: 1,508 application tests, 16 root security/RLS checks, TypeScript, targeted lint and isolated build pass. All12 local browser flows pass all10 IDs; source coverage117/191 with all106 old targets retained. Independent review removed underspecified press/vertical-family aliases, RED→GREEN. Final normalized additions183; total3,224. Remote push/new CI pending.
