# Controlled LAB release review — 7 November 2026

Environment: `doctorcoach-isolated-staging`. This package authorizes no merge,
deployment, remote SQL/ledger write, account/grant/config change, real event,
invitation or outbox processing. D1/R2 contain application data; Supabase supplies
identity. SQLite migration SQL must never be executed in Supabase.

## Completion matrix

| Gate | Evidence reused or newly checked | Status |
|---|---|---|
| Integrated behavior | #70 publication/import; #71 decimal guidance; #72 runtime fixtures | Retained |
| Exact source CI | `080a8647afb0f5b6c4b8295160218eba0c42cac2`, 1,784 tests and builds/runtime/UI; pilot 13/13 | Reused; checks reread |
| PR dependency order | #68/#69 merged; #70 Draft open → #71 open → #72 open | Rechecked GitHub API and Git ancestry |
| D1 structure | 95 required tables; columns/types/defaults/PK/FK/index metadata match | Reviewed compatible baseline; deviations below |
| Ledger | `d1_migrations` count 0 | Baseline proposal only; no writes |
| Local backup/restore | Existing native SQLite backup + snapshot comparator, expanded import/assignment/Calendar fixture | Synthetic only |
| Real protected backup + restore | Existing procedures inspected; no patient-safe protected rehearsal supplied | OPEN |
| Synthetic roles and Calendar | Existing permission/provider regression suites; activation plan below | Local only; remote disabled |
| Deployment and device acceptance | No deployment or physical device work authorized | OPEN |

## Candidate and dependencies

Runtime/application baseline: `080a8647afb0f5b6c4b8295160218eba0c42cac2`.
Baseline Git tree: `84c16a85bb54a5e84ac07f67c0d4ff7b171b1f9e`.
This release branch adds only offline verification tooling, regression fixtures
and this document. The final release candidate is the full head SHA/tree of this
stacked PR, recorded in the delivered release manifest. Do not deploy a floating
branch or infer a tested SHA from a PR number.

- Integration base: `a35227b320e92285da44eda2d562dcc332baef7a` (includes #68/#69).
- [#70](https://github.com/drtamireilam-lgtm/Doctorcoach/pull/70):
  `2cd9f21fe43fb9343f2a2c6374520dfdb6da5be4`.
- [#71](https://github.com/drtamireilam-lgtm/Doctorcoach/pull/71):
  `5fffb3bba194b8be84516f81a2f529cacaa81752`, descendant of #70.
- [#72](https://github.com/drtamireilam-lgtm/Doctorcoach/pull/72): baseline above,
  descendant of #71. This PR must follow #72.
- Required review/integration order: #70 → retarget/revalidate #71 →
  retarget/revalidate #72 → this PR. No merge was performed. A squash/rebase or
  conflict resolution changes the candidate and requires a new provenance check.

Reused exact-baseline evidence: [CI](https://github.com/drtamireilam-lgtm/Doctorcoach/actions/runs/42307124099),
[PR CI](https://github.com/drtamireilam-lgtm/Doctorcoach/actions/runs/42307132946),
[pilot](https://github.com/drtamireilam-lgtm/Doctorcoach/actions/runs/42307171355).
No application, UI, authentication, Calendar, import or workout runtime code was
changed by this follow-up. Premium UI, auth return routes, CSV/XLSX/text-PDF
save/reload/publication/assignment and exact 33.125 kg values remain in the same
runtime source. Decimal guidance, pain/incomplete/declining-performance/5% guards,
manual overrides and persistence retain their prior passing evidence.

## Current LAB and provenance limits

Fresh read-only inspection: deployment `78c33dbb-bbae-4f16-9936-0154156047b8`,
Worker version 52 `e6aaca70-9359-4581-b170-9f149e4f831d`, traffic 100%, created
2026-11-04T14:56:31Z. Script etag:
`e90cdb434f2da3d371d67a4318034a6ced029b43952c570459188294b10e56ac`.
D1 binding `DB` = `0e7a9467-5758-4d6f-b52a-ee4385a2d37d`; R2 `BUCKET` =
`doctorcoach-isolated-staging`. Calendar connection count and management grant
count are both 0. Management and Calendar bindings are absent in this version.
Secret names were inspected; values were not retrieved.

The supplied snapshot attributes the deployed source to
`11c036ca228a6cecc1ede636edc9e281d07db215`. Current version metadata has no source
SHA or source annotation, so this attribution was NOT independently reverified.
Retain it as prior reported evidence, not a fresh source proof. Obtain the
original protected build/deploy manifest or an independently validated artifact
mapping before relying on source-specific rollback compatibility. This is not
evidence that #70–#72 are deployed.

## D1 compatibility and empty ledger proposal

Only sqlite_master, table_xinfo, foreign_key_list, index_list/index_xinfo and
ledger/access/connection counts were read. No patient/application row content,
R2 object content or identity records were accessed. Internal `_cf_KV` was excluded
from detailed inspection after D1 rejected its PRAGMA metadata with SQLITE_AUTH.
The final inventory used a literal `sqlite_` prefix filter and matched the initial
inventory. This prevents wildcard omission of user objects such as `sqliteX_guard`.

All 95 required tables match column order, declared type, nullability, default,
PK position, hidden-column flags, FK actions and index uniqueness/origin/predicate
flags and indexed-column metadata. DDL comparison adds CHECK expressions,
collations, expression/partial indexes, triggers and views. 173 DDL differences
are whitespace only, preserving quoted contents. Appearance type keywords differ
only in case. The two canonical appearance deletion guards are attached to
`appearance_preferences_backup_20261019`; equivalent `_v2` insert/update guards
protect the active appearance table. Extra tables are that legacy backup and
`d1_migrations`. No missing application migration was identified.

The offline tool intentionally returns `schemaCompatible=false` for these raw
DDL differences and extra objects. The reviewed compatible baseline above is an
explicit human-readable disposition, not a bypass or a claim that the strict gate
passed. Schema compatibility does not certify remote row integrity, provider
readiness or a usable backup. The legacy backup's retention/cleanup remains a
separate review; do not delete it here.

Proposed empty-ledger treatment, for owner review:

1. Preserve the populated database and empty ledger. An empty ledger does not
   establish an empty schema or a missing migration.
2. Retain the metadata snapshot/digest and this deviation review as the external
   baseline record. Snapshot SHA-256:
   `fdb253b95d9e57a69f510ec47a21149de67f3da482d5e78bb983132532c52a97`.
3. Do NOT replay drizzle history or standalone identity/management migrations,
   insert synthetic historical ledger rows, or run generic migrations apply.
   `calendarRepairStatements` currently proposes no Calendar repair.
4. Future genuine missing objects require a new per-object predecessor/DDL/data
   impact review and a protected recovery point, then separate approval of minimal
   additive SQL. Baseline equivalence and genuinely missing migrations are distinct.
5. Reinspect metadata immediately before release. Any unexplained constraint,
   index, trigger or table difference stops release. Any future ledger-baselining
   operation needs a dedicated design/review and separate authorization.

## Backup, restore and rollback evidence

Reuse `standalone/MIGRATION-RUNBOOK.md`, `LINK-RESTORE-CHECKPOINT-2026-10-16.md`,
`scripts/snapshot.mjs` and `r2-preservation.mjs`; no second backup system was added.
The expanded `link-restore-rehearsal.test.mjs` exports a disposable synthetic
SQLite database with the native backup API, restores a second file, and compares
all application table schemas/content plus synthetic private bytes. It exercises
real import/draft/publication/assignment handlers at 33.125 kg, a completed workout
with actual RPE, a scheduled appointment and a Calendar delivery-error record in
Asia/Jerusalem. Integrity and FK checks pass. Removing a Calendar record,
rewriting ownership or changing private bytes is detected. Existing preservation
tests reject broken FKs; management tests verify failed audit writes roll back.
Identity-link proof/replay behavior remains synthetic and does not enable bridging.

This is NOT an actual protected LAB D1 SQL export/import or R2 recovery rehearsal.
The comparator deliberately excludes specified identity/session tables and permits
new tables; do not present it as full authentication backup certification.
Before pilot writes, an authorized operator must establish a consistent protected
D1 recovery point and complete R2 object/metadata backup, restore into a separate
protected target, and record integrity/FK/comparison/identity verification and
operator timestamps privately. No real backup is attached to Git, logs or CI.
If accessing a real backup would expose patient records, use an appropriately
restricted operator workflow and report only non-content verification results.

Rollback prerequisites: identify the current Worker version and its actual source,
keep bindings and protected recovery material, establish a write-consistency window,
record the D1/R2 recovery boundary, and reconcile writes made after that boundary.
Reverting Worker code does not undo D1/R2 changes. Never overwrite newer user data
with an older snapshot. Stop synthetic pilot writes on rollback; preserve evidence
and obtain approval for any database/object recovery operation.

## Fictional account activation plan — not executed remotely

Use five independent verified identities: `owner@example.test`,
`coach@example.test`, `secretary@example.test`, `trainee-a@example.test`,
`trainee-b@example.test`. These are fixture labels, not deliverable mailboxes;
map them to separately approved test mailboxes in a private activation worksheet.
Do not change credentials or replace existing owner configuration with these labels.

Canonical internal IDs are NOT email addresses or Supabase subjects. Register via
existing auth, resolve each verified external alias to `dc_identity_principals.id`,
verify active unique identity and record actual UIDs privately. No UID can be
preselected from the fictional labels. Preserve `DC_LEGACY_BRIDGE_ENABLED=false`.
After separate approval, enable `DC_USER_MANAGEMENT_ENABLED=true` on LAB only.

| Identity | Existing managed role/config | Explicit UID grant | Relationship |
|---|---|---|---|
| Owner | approved active physician; authorized owner-only ADMIN/CLINICIAN allowlist intersection | owner | no trainee coach |
| Coach | approved active coach, existing staff workflow | none | owns only A assignment |
| Secretary | approved active trainee, awaiting_assignment; no clinician/admin/operations allowlist | secretary | no coach/clinical grants |
| Trainee A | approved active trainee, coached | none | approved Coach UID |
| Trainee B | approved active trainee, awaiting_assignment | none | no A program or Coach relationship |

Owner bootstrap uses the existing `dc_management_grants(user_id,permission,
granted_by,granted_at)` mechanism with the verified Owner canonical UID, an
explicit actor and timestamp. Its unique partial index permits one Owner only;
stop if an owner already exists. The sole other permission row is the verified
Secretary UID with `permission='secretary'`, granted through the existing confirmed,
versioned owner interface. Trainees and Coach receive no management grant.
Use existing approval/role/staff and assignment APIs, not direct ad-hoc profile SQL.

Secretary scheduling uses its explicit administration grant. Local tests verify
medical-note redaction, denial of clinical access and OAuth configuration, no
owner/self edits or delegation of owner powers, active/approved checks and
revocation during writes. The existing secretary model also permits specific
user approval/coach-assignment operations; document those existing capabilities
with the operator and do not describe this role as a new scheduling-only role.
Scheduling alone does not add clinician, root owner or Calendar-owner authority.

Reversal: Owner revokes Secretary through the existing UI, inactivates the test
managed users and removes test relationships via supported flows; verify new and
existing sessions lose protected access. Remove only approved test allowlist
entries and restore the prior management flag after separately approved config
change. Any owner bootstrap reversal is an explicit UID-targeted, separately
approved operation; never delete identities or clinical records as cleanup.

## Secondary Calendar preparation — not connected

Existing local provider tests cover approval vs delivery failure, explicit retry,
readback/acknowledgement, wrong persisted time, ETags, duplicate prevention,
rescheduling, cancellation and Israel winter/summer offsets. Secretary may manage
scheduling but cannot configure OAuth. No invitation or real event was sent.

Separately approve an isolated Google test account which OWNS a secondary test
calendar, with ID matching `[A-Za-z0-9_-]+@group.calendar.google.com`; never use
`primary`. Required LAB configuration:

- `DOCTORCOACH_CALENDAR_TEST_ENABLED=true`.
- `DOCTORCOACH_CALENDAR_ID=<approved secondary calendar ID>`.
- `DOCTORCOACH_CALENDAR_OWNER_EMAIL=<verified isolated test Google owner>`.
- `DOCTORCOACH_CALENDAR_CLIENT_ID=<approved OAuth client>`.
- `DOCTORCOACH_CALENDAR_ENCRYPTION_KEY=<protected 32-byte base64url key>`.
- Exact redirect URI:
  `https://doctorcoach-isolated-staging.dr-tamireilam.workers.dev/api/google-calendar/callback`.
- Scopes already implemented: `calendar.events.owned` and `userinfo.email` under
  `https://www.googleapis.com/auth/`. Google Calendar API enabled; test OAuth user
  admitted; offline refresh/PKCE and verified owner-email match required.
- Client secret is supplied only through the existing owner-only encrypted
  configuration flow; it is not a plaintext source variable or a secretary input.

Connecting currently queues future eligible appointments for synchronization.
Therefore connection authorization must separately review the existing pending
outbox and define an explicit synthetic-event allowlist; do not drain it as a
setup check. Reject non-test destinations/attendees. Event-write/readback/retry/
reschedule/delete acceptance needs its own explicit scope. Disconnect/revoke via
existing owner mechanisms; do not rotate a shared key or remove events blindly.

## Pinned deployment procedure — approval required

1. Approve the exact final release SHA/tree from this PR and its release manifest;
   verify ancestry and unchanged runtime tree against the baseline. Check required
   PR reviews/CI and the current LAB deployment again. No floating HEAD deployment.
2. Close protected backup/restore and source-provenance gates above. Accept the
   explicit schema deviation review; do not interpret strict gate false as green.
3. Check out the reviewed SHA in a clean isolated directory, verify `git rev-parse
   HEAD` and `HEAD^{tree}`, install the existing frozen lockfile, run typecheck and
   affected suites, build with `DC_ISOLATED_STAGING_BUILD=true` using the existing
   standalone build and isolated target validation. Do not change vars/secrets.
4. Inspect the generated Worker config before any authorized upload: exact LAB
   name, D1 ID and R2 bucket above, correct origin, no production routes/custom
   domains and no live remote test bindings. Preserve existing configuration.
5. After separate deployment authorization only, use the existing isolated LAB
   deployment path. Do not combine deployment with migration/config/account grants.
   Attach reviewed SHA/tree/build digest as provenance. Read back version ID,
   traffic, bindings and source manifest before acceptance.
6. Only separately authorized fictional identities and synthetic writes may then
   execute the checklist below. Record actual LAB results separately from local
   simulation results. Any changed candidate or resource requires renewed review.

## Post-deployment acceptance and stop conditions

- [ ] Coach: Login → Import CSV/XLSX/text-PDF → Review exact 33.125 kg and source →
  save/reload → Publish → Assign A → Verify trainee A access and B denial.
- [ ] Trainee A: Login → Assigned program → Start workout → actual reps/weight/RPE →
  Next-set decimal recommendation → pain/incomplete/decline/excessive-increase
  guards → Manual override → Complete → Reload → Progress; verify exact stored load.
- [ ] Trainee B cannot read A profile, program, workout or notes by URL or API.
- [ ] Secretary schedules/reschedules/cancels with redacted clinical fields;
  OAuth/medical/owner operations denied; revoke permission and retry denied.
- [ ] Mobile login from both home login and direct `/auth/signin`, protected return
  route, logout/new session, Hebrew/English × 320/390px × dark/light. This complete
  cross-product remains a LAB acceptance gate even where local Chromium evidence exists.
- [ ] Separate manual gate: physical iPhone/Safari, portrait/landscape, OTP keyboard,
  file picker, background/reload, network loss/retry, visibility and no horizontal
  overflow. No Chromium result substitutes for this gate.
- [ ] Separately authorized secondary Calendar: booking approval reported separately
  from delivery; forced failure → explicit retry → one event → readback → reschedule
  → cancellation verified; Asia/Jerusalem and no external invitations.

Stop immediately for SHA/tree/binding drift, unexplained schema difference,
unverified recovery material, real-user data exposure, wrong Calendar/recipient,
privilege escalation or cross-trainee access. Pause pilot writes and invoke the
approved rollback plan for data loss, duplicate/foreign events, auth return/login
failure, persistence/publication errors or load-safety regressions. Do not repair
by weakening assertions, increasing timeouts, replaying migrations or changing
secrets. Final LAB readiness remains NO until these gates have actual evidence.


## New verification and review record

Final affected suites: **96/96 passed**, 0 failures/skips. They include schema
preflight (9), expanded native backup/restore, preservation/FK rejection, Calendar
store/Worker, consultation/secretary and management boundaries. TypeScript and
isolated standalone build passed. Dependencies were reused from an existing local
locked installation through a workspace junction; no dependency/lockfile changes.
The complete expensive browser matrix was reused from identical runtime source.
The final candidate manifest records the exact tested source and runtime result.

Confirmed tool defect: name-only snapshots could return full schema compatibility.
The tool now requires structural metadata and compares raw DDL conservatively.
An independent code review found that SQL LIKE treated `_` in `sqlite_%` as a
wildcard; the fix uses GLOB's literal underscore, with a failing-then-passing
`sqliteX_guard` regression. Review of the corrected diff found no material issue.
The reviewer could not independently run tests because of sandbox spawn EPERM;
the main execution ran the 96-test suite with local subprocess permission.

Retained failures: the initial new fixture omitted a required Calendar timestamp,
then attempted to insert a row already created by the real scheduling handler.
The fixture now updates that existing synthetic receipt. Those failures were
fixture mistakes, not product defects, and are not counted as passing runs.
Cloudflare schema-file import mode and a batch including protected `_cf_KV`
returned SQLITE_AUTH; final schema queries succeeded in query mode excluding that
internal table. TLS was verified with the Windows CA store; it was not disabled.
