# Remaining source audit — 2026-10-09

This is a scoped source reconciliation, not a complete UX/security audit or a
claim of verified live account access. Canonical source is the Sites checkout;
the separate GitHub Vite prototype is not production implementation evidence.

## Closed in the current batch

- Clinical content approval had only an earlier clinician check; creation and
  update now enforce the role in SQL, with regression coverage.
- Conversation list fetched messages after initial channel authorization; reads
  now guard SQL and discard a response on post-fetch revocation, with coverage.
- Staff dashboard assembly returned captured client/clinical data after access
  loss. Twelve baseline cases reproduced this. Final role/link/grant snapshot
  validation now rejects the response, and coordinator scope is filtered.
- Shared care bundle assembly returned captured notes/profile after access loss.
  Fourteen baseline races reproduced it. Final current-role/connection and
  relevant grant validation now rejects staff responses; owner history remains.

## Next priorities from inspected source

Standalone thread metadata is now protected by guarded statistics and a final
permission snapshot. Twenty baseline failures reproduced revocation and clinical
scope defects; all 21 new cases now pass, including owner history and read counts.

Wellness bundle assembly now validates captured staff capabilities and team
nutrition sharing before returning. Sixteen baseline cases reproduced stale
authorization; all 18 new cases pass with owner history and role projections.

Media review/feedback listings now validate captured staff role/connection and
asset availability after retrieval. Public demos check publication, drafts check
staff status. Video delivery rechecks access and exact asset after R2 retrieval.
Twenty new regression cases pass; owners retain their video/feedback history.

Notification assembly now computes unread counts last in the same SQL statement
as current notification consent. Captured staff role must still be active with
current scope/grants. Twenty failing baseline races now pass; own history stays.

Appointment management now checks coordinator role in listing SQL and validates
current role/all captured client connections after service enrichment. Six
baseline races now pass, including empty and multi-client lists. Owner history
and configured admin access remain intact.

Standalone client/roster reads and the team overview now validate current staff
role and all captured client connections. Eighteen baseline races now pass;
coordinators retain no clinical clients and valid counts remain unchanged.

Clinical content-review reads now require the current clinician role in SQL and
after catalog assembly. Four baseline races now pass, with valid hashes/states.

Success-story public/management responses now validate current consent and
captured versions, plus public publication status. Seven baseline races now
pass. Story conflicts clear cached public/management content; owner history stays.

Read-path/source reconciliation found a legacy workout-log POST using pre-write
checks followed by an unguarded insert and captured exercise count. Ten baseline
cases reproduced stale permission/count behavior. The atomic insert now checks
consents/self access/intake/medical review and counts current owner plan items.

Legacy program mutations had only pre-write checks. Ten baseline races reproduced
changes after expiration/mode/intake/medical restrictions. Upserts and template
batches now guard SQL; deletion checks current self entitlement. No partial
template application in tested revoked-access cases. Medical-block removal stays.

Workout creation and active edits lacked required-consent checks; next-day
followup checked consent only before writing. Twenty-eight baseline races
reproduced persistence after withdrawal. Current consents are now checked in SQL
for these writes. Closing and historical access remain usable.

Independent program additions/updates/templates lacked required-consent checks.
Nine baseline cases reproduced changes after withdrawal or an old revision.
These writes now check current consent before and inside persistence. Owner
read/removal remains possible. Error text points to the personal questionnaire;
the generic 403 screen no longer labels all denials as staff-only.

Three integrated store-level trainee journeys now pass across onboarding,
assigned workouts/RIR, progress/export, medical review/revocation and verified
independent subscription/expiration. This batch found no new product-code defect.

Integrated rehabilitation/nutrition journeys now pass from real onboarding
through plans, tracking, role projections, sharing/revocation and personal export.
This batch found no new application defect.

Release-readiness reconciliation is recorded in RELEASE_READINESS.md with an
ordered acceptance matrix. Next: real account/browser verification, followed by
runtime commercial configuration and media acceptance. No further defect is confirmed. Read-path inventory is
recorded in READ_PATH_INVENTORY.md; live account verification remains unresolved.

## Remaining read-path reconciliation

Inspected owner-scoped favorites, privacy requests/export and personal reminders
retain server identity filters. Membership/services/community management uses
configured administrator allowlists, independent of mutable care_staff roles.
Staff dashboard, care/wellness bundles, standalone team/client/roster, messages,
threads, media, coordinator appointments and notifications have scoped regression
coverage. This inventory does not prove every endpoint safe or replace live QA.

These are concrete inspection findings; their severity and failing cases must
be reproduced before implementation. Do not treat untested hypotheses as
confirmed exploits or missing features. Previously published write guards remain
covered by the full regression suite, but do not prove every read path safe.

## Verification gaps

Actual trainee/staff browser journeys, phone layouts, live D1/R2 account behavior
and payment-provider verification remain outstanding. Clinical criteria and
clearance remain clinician-defined; no automatic medical decisions are added.
