# DoctorCoach — source of truth and ordered work

Updated 2026-10-10 through Simple Mode completion audit.

Simple Mode was audited against the live v79 source and the separate GitHub prototype.
The seven-area structure and existing workflows were already present. Focused fixes
clarify signup/consultation, optional nutrition, breadcrumb labels and accessible
settings selection, and hide stale staff shortcuts during permission refresh.
612 tests, TypeScript and production build passed. See SIMPLE_MODE_AUDIT.md.
Payment work stays on a separate unpublished branch and is excluded from this release.

Follow-up: internal navigation now warns before discarding unsaved workout set edits.
Existing page-unload protection and saved server data remain. Exercise replacement
also waits for unsaved edits, and confirmation checks current replacement eligibility. 617 automated tests, TypeScript and the production build pass; see WORKOUT_DRAFT_NAVIGATION_RELEASE.md for phone acceptance.

## Canonical production source

This Sites repository is the source of the live app at
https://doctorcoach.dr-tamireilam.chatgpt.site.
Its project identity is declared in `.openai/hosting.json`:
`appgprj_6ab2e7655fc08191866f30fac2eaefaf`.
It uses Vinext/React, ChatGPT sign-in, D1 and R2.

`drtamireilam-lgtm/Doctorcoach` on GitHub is a separate Vite prototype with its
own foundation and account infrastructure. Its successful CI run 37176600977
(2026-10-04, commit 8b9c2f2) does not validate or deploy this Sites app.
Do not treat its README/master-plan checkboxes as the implementation status of
the hosted app. No repository merge, data migration or GitHub synchronization
has been performed. Future consolidation must preserve production capabilities.

## Work order from the audit

1. Establish this source distinction and release traceability (this document).
2. Unify effort-adjusted e1RM in set feedback and progress charts. Retain the
   reps-only method as an explicitly selected historical comparison, not fallback.
3. Link readiness and pain observations to workouts and team review (implemented
   in WORKOUT_CONTEXT_RELEASE.md). Clinical decision rules need explicit definition;
   no automatic clearance or sleep/energy-based prescriptions are introduced.
4. Implement next-workout progression with coach control over coached programs
   (implemented in PROGRAM_PROGRESSION_RELEASE.md: proposal → draft → review → publish).
5. Implemented the newly agreed seven-area navigation: Home, My File, My Program,
   Progress, Exercise Library, Anatomy/Learning, Contact. Profile/settings hold
   subscriptions; active workout launches from the program; rehab is contextual.

The seven-area specification replaces the interim four-tab phone navigation.
Desktop and the phone menu share the same seven destinations. The phone bottom
bar provides four frequent destinations plus the complete menu. See
SEVEN_AREA_NAVIGATION_RELEASE.md for scope and verification.

6. Added the trainee cross-domain progress timeline and request-URL cache isolation
   (PROGRESS_TIMELINE_RELEASE.md). Existing charts and server permissions remain.

7. Added readiness trends and the role-scoped staff timeline
   (READINESS_STAFF_PROGRESS_RELEASE.md).

8. Extended the existing return-to-activity plan with explicit stages and personal
   clinician-controlled milestones (REHAB_JOURNEY_RELEASE.md).

9. Added atomic return-plan snapshots, transition history and owner export
   (REHAB_HISTORY_RELEASE.md).

10. Linked clinician-authored injury episodes to separate return plans and
    per-plan revision history (REHAB_EPISODES_RELEASE.md). Legacy plans remain
    unassigned. Owner profile now shows active and closed episodes.

11. Linked rehabilitation measurements to injury episodes, with per-episode
    comparison groups and legacy unassigned measurements retained
    (REHAB_MEASUREMENTS_RELEASE.md).

12. Added contextual injury links from My File and My Program to the selected
    return plan/history or measurements, including explicit return navigation
    (REHAB_CONTEXT_RELEASE.md).

13. Added the latest explicitly linked measurement/date to the injury summary,
    with anatomical matching and retention beyond the general log limit
    (INJURY_SUMMARY_RELEASE.md).

14. Added atomic professional write authorization to rehabilitation and nutrition
    records, including concurrent connection/role/grant revocation
    (WELLNESS_WRITE_GUARD_RELEASE.md).

15. Enforced current required consent atomically on every wellness write,
    including concurrent withdrawal, revision changes and retries
    (WELLNESS_CONSENT_RELEASE.md).

16. Added atomic team-message, read-marker and professional-note guards,
    including current recipient authorization and exact retry identity
    (TEAM_WRITE_GUARD_RELEASE.md).

17. Protected weekly check-ins and staff review replies with atomic consent,
    profile/access guards and exact report retry matching
    (CHECKIN_WRITE_GUARD_RELEASE.md).

18. Protected clinician medical-review transitions with current connection,
    role, medical grant and consent checks inside a transactional decision/audit
    batch (MEDICAL_REVIEW_GUARD_RELEASE.md).

19. Protected invitation creation and acceptance against concurrent staff/role,
    consent and profile changes; consumed retries preserve revoked connections
    (INVITE_WRITE_GUARD_RELEASE.md).

20. Protected appointment/status updates with current coordinator role/scope
    and connection checks at persistence time. Scheduling also checks current
    service visibility, confirmed price, duration and provider
    (APPOINTMENT_WRITE_GUARD_RELEASE.md).

21. Protected appointment creation with atomic service snapshot and five-active
    request cap checks, plus exact owner/payload matching for ID collisions and
    retries (APPOINTMENT_CREATE_GUARD_RELEASE.md).

22. Protected video feedback with current staff connection/role, required and
    media consent, asset availability and exact author/asset/content retry
    matching. Added nullable author identity without changing legacy feedback
    (VIDEO_FEEDBACK_GUARD_RELEASE.md).

23. Protected media initialization/finalization and demo publication with atomic
    access/consent/quota/set guards and exact upload retries. Isolated storage
    objects per attempt so cleanup cannot delete a competing successful upload
    (VIDEO_UPLOAD_GUARD_RELEASE.md).

24. Protected general feedback with an atomic 20-per-owner hourly limit and
    exact owner/context/category/content retry matching. Reviewed responses
    remain unchanged by retries (GENERAL_FEEDBACK_GUARD_RELEASE.md).

25. Protected verified membership approval with an atomic audit/order/entitlement
    transaction, unchanged entitlement snapshot, unique reference and no-active
    workout guards. Self-mode activation also checks active workouts in SQL
    (MEMBERSHIP_APPROVAL_GUARD_RELEASE.md).

26. Protected membership requests with atomic catalog/workout/pending-order
    guards and exact owner/email/price/catalog-version retry matching. Captured
    catalog versions are stored without rewriting legacy requests
    (MEMBERSHIP_REQUEST_GUARD_RELEASE.md).

27. Protected clinical content approval at persistence time and staff conversation
    reads against role/scope/grant revocation during retrieval. Owners retain
    their history (CONTENT_MESSAGE_READ_GUARD_RELEASE.md).

28. Protected the assembled staff dashboard response against connection/scope,
    role and grant changes, with correct coordinator-only scope filtering
    (DASHBOARD_READ_GUARD_RELEASE.md).

29. Protected shared care bundle responses against staff connection/scope/role
    and medical/nutrition grant loss during assembly. Owners retain their own
    profile and shared history (CARE_BUNDLE_READ_GUARD_RELEASE.md).

30. Protected standalone thread metadata with guarded statistics and a final
    role/link/grant snapshot. Corrected clinical recipient scope; owner history
    remains available with refreshed recipient availability
    (THREAD_READ_GUARD_RELEASE.md).

31. Protected wellness bundle responses against staff role/connection/scope and
    clinical grant loss, plus withdrawal of shared nutrition summaries during
    assembly. Owners retain personal history (WELLNESS_READ_GUARD_RELEASE.md).

32. Protected media review/feedback listings and draft management with final
    permission/asset checks. Video responses recheck access and the exact asset
    after storage retrieval (MEDIA_READ_GUARD_RELEASE.md).

33. Moved notification assembly into a testable store. Final unread SQL checks
    current staff role/scope/grants and notification consent together; owner
    history remains visible (NOTIFICATIONS_READ_GUARD_RELEASE.md).

34. Protected coordinator appointment management reads with current role in
    listing SQL and final role/all-client scope checks after service enrichment.
    Owner history and configured admin access stay available
    (APPOINTMENT_READ_GUARD_RELEASE.md).

35. Protected standalone client/roster reads and the assembled team overview
    against staff role/disablement and captured client link/scope loss. Client
    SQL checks current role; coordinator views retain no clinical clients
    (TEAM_READ_GUARD_RELEASE.md).

36. Protected clinical content-review reads with current clinician role in SQL
    and a final check after hashed catalog assembly
    (CONTENT_REVIEW_READ_GUARD_RELEASE.md).

37. Protected public/management success-story responses with current consent,
    publication and captured version checks. Stale story conflicts clear cached
    public/management content; owners retain personal stories
    (STORY_READ_GUARD_RELEASE.md).

38. Reconciled remaining owner/admin read paths and found the legacy log POST
    still used pre-write checks. Protected it with atomic consent/self-access/
    intake/medical-review/current-plan guards while retaining legacy history
    (LEGACY_LOG_WRITE_GUARD_RELEASE.md, READ_PATH_INVENTORY.md).

39. Protected self-program upserts/template batches with current entitlement,
    intake and medical status in SQL. Deletion checks current self entitlement
    while retaining removal under medical block (PLAN_WRITE_GUARD_RELEASE.md).

40. Protected workout creation, active training edits and next-day followup
    with current required consents in SQL. Closing/history/retrieval retries stay
    available (WORKOUT_CONSENT_GUARD_RELEASE.md).

41. Protected self-program upserts/templates with current required consents.
    Read/removal remains possible after withdrawal; messages direct users to
    the questionnaire in My File (PLAN_CONSENT_GUARD_RELEASE.md).

42. Added integrated store-level journeys for coached onboarding/RIR workout/
    progress/export, clinical review and revocation, and verified independent
    subscription/expiration. All three pass without a new product-code defect
    (TRAINEE_JOURNEY_VERIFICATION.md).

43. Added integrated rehabilitation/nutrition journeys from onboarding through
    clinician/dietitian plans, tracking, sharing/revocation and export. Both pass
    without a new product defect (WELLNESS_JOURNEY_VERIFICATION.md).

44. Reconciled implemented work against release-readiness gaps and added a single
    full-regression command (`npm test`). The ordered acceptance checklist is
    RELEASE_READINESS.md; no additional product defect was confirmed.

45. Simplified the returning trainee home: fixed desktop visibility of the daily
    view, made repeat introduction optional, and promoted My File in daily actions
    (SIMPLE_HOME_RELEASE.md). First-time introduction and existing features remain.

46. Simplified My File around personal details/injuries, optional sharing controls,
    and team notes before archived programs. My Program previews assigned workout
    days and carries the selected day into the start dialog; printing retains all
    days (SIMPLE_FILE_PROGRAM_RELEASE.md).

47. Added published demonstration badges/video-only filtering to the library and
    removed repeated unavailable add buttons for coached users. Existing demo
    players, independent adding and favorites remain (EXERCISE_DEMO_DISCOVERY_RELEASE.md).

48. Fixed anatomy muscle-search/link region context; multi-region muscles retain
    valid context and unmapped records get a neutral heading. Navigation resets
    stale search/topic state (EXERCISE_DEMO_DISCOVERY_RELEASE.md).

49. Added staff catalog-to-demo coverage, filters and downloadable filming briefs
    from existing exercise content. Ready drafts and published demonstrations are
    distinguished; no videos or clinical approval invented (DEMO_PRODUCTION_RELEASE.md).

50. Simplified learning into the existing body map and directly linked guides,
    removing the duplicate schematic map. Article links/history restore topics;
    effort guidance now matches implemented RIR/e1RM/next-set logic
    (LEARNING_AREA_RELEASE.md).

51. Added two selected, unchanged Commons source illustrations to six muscle
    records with attribution/license/source links and image-error fallback. A
    filename/description mismatch was rejected; clinical approval is not implied
    (ANATOMY_SOURCE_IMAGES_RELEASE.md).

52. Added unchanged Gray430/Gray434 source plates to six verified thigh records.
    No automatic whole-group assignment; total selected coverage is four images
    for 12 records (THIGH_SOURCE_IMAGES_RELEASE.md).

53. Added unchanged Gray437/438/439 source plates to seven matched calf/ankle
records, with source/license metadata and regression coverage. Selected coverage
is now seven images for nineteen records (CALF_SOURCE_IMAGES_RELEASE.md).

54. Added a filtered rehabilitation-content review report for clinicians, including
current versus reviewed hashes, review notes, full exercise instructions and missing
exercise markers. Export does not create approvals or change review state.

55. Added staff demonstration-video search and publication-state filters, with
filtered counts and a clear no-results/reset path. Existing upload, playback,
publication confirmation and trainee review flows are retained. Six targeted
tests and TypeScript passed; actual browser interactions remain unverified.

56. Added Exercise Video Manager bulk queue, exact live-ID matching, manual review,
duplicates, progress/retry, optimistic object replacement and admin-only demo
mutations. Added on-demand workout demo playback and playback failure recovery.
R2 retained by explicit user approval; no Supabase migration. See
EXERCISE_VIDEO_MANAGER_RELEASE.md for first-upload steps and verification limits.

Next upgrade priority: perform first real administrator video upload and mobile
playback acceptance, then reconcile animation/content approval gaps using the review
report and exercise filming brief. Real exercise
filming/professional review and live playback acceptance remain outstanding. Do not invent clinical
approval or unavailable videos. Also execute
the account/browser acceptance matrix in RELEASE_READINESS.md
when supported browser QA and representative accounts are available, then fix
observed failures. Payment configuration, media and clinical approval follow in
that order. Do not replace these checks with repeated source-only test batches or
expand features before reconciling observed pilot feedback. Clinical rules remain
team-defined, not automated. Remaining source paths are in READ_PATH_INVENTORY.md.

## Verification boundary

Audit baseline: published v26 / 80b25f6; local work also included unpublished tour
changes. TypeScript, 110 tests and production build passed during the audit.
Browser console, actual phone layout, live D1 data and end-to-end account access
were not checked. Release notes record subsequent verification separately.
