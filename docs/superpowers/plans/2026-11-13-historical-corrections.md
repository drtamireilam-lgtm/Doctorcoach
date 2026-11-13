# Historical workout corrections implementation plan

**Goal:** Complete the requested editing of historical retrospective entries without duplicating PR75/76.
**Architecture:** Reuse the existing retrospective editor and parser with the completed session's immutable prescription. Add an owner-scoped correction store and atomic prior-version journal. Keep current program, active workout and private creation draft separate.
**Tech stack:** Existing React, TypeScript, authenticated API and Cloudflare D1/SQLite.
**Spec:** User's Workout Experience 3.0 brief, Phase 3 historical editing and Phase 6 data safety.

## Constraints and review focus
- No merge, deployment, remote migration or real user writes.
- Preserve recordedAt, original prescription, program reference and original submission fingerprint.
- Reject cross-owner, live-session, stale-version and changed-source edits; check consent/access at commit.
- Retries after a lost response must not create another journal row; distinct repeated workouts remain possible.
- Date/time corrections must reorder progress by actual date, warn about other same-day sessions and preserve DST validation.
- Account deletion must remove private correction snapshots.

## Task 1: Safe correction persistence
- [ ] Add failing SQLite tests for correction round trips, frozen prescription after program changes, ownership, CAS, retry, duplicate date and atomic audit rollback.
- [ ] Implement completed-entry reconstruction and correction using the existing parser and an additive private revisions table.
- [ ] Verify focused tests and account deletion coverage.

## Task 2: History editor and API
- [ ] Add authenticated GET session context and PATCH correction action.
- [ ] Reuse editor from each retrospective history entry; freeze program source, omit creation draft saving, offer explicit reload after conflicts and bilingual feedback.
- [ ] Verify real React DOM edit/reload flow in Hebrew and English, typecheck, lint and builds.

## Task 3: Reviewable delivery
- [ ] Run relevant regression suites and existing CI checks, review the diff, commit and publish a Draft PR stacked on PR76.
- [ ] Record exact evidence and remaining full-lifecycle gaps in the final report.

Execution ruling: User explicitly requests execution without another planning-only approval. Proceed inline on an isolated fresh clone and separate follow-up branch; preserve existing PR ownership.
