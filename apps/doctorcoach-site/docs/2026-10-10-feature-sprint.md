# DoctorCoach 2.0 — feature sprint, 2026-10-10

## Source audit and scope

Base: current Site source `4d8d603996efbe052af40a4ab369f84bcf7b03c5` (live version 89). The connected GitHub repository `drtamireilam-lgtm/Doctorcoach` contains an older Vite/Supabase application, while the current Site uses Vinext, D1 and private R2 storage. This sprint preserves the current Site source; it does not overwrite the unrelated GitHub main branch. The current source is now available for review in draft PR https://github.com/drtamireilam-lgtm/Doctorcoach/pull/4 under apps/doctorcoach-site. The legacy root remains intact; architectural consolidation remains pending.

All four requested systems were **Partial** before this sprint. Existing progress history, workouts/e1RM, pain/ROM/readiness, rehabilitation revisions, care permissions, consent checks, messages/read markers, private videos and shared/internal notes were reused. Existing seven primary navigation entries, prices, bookings, Hebrew/English localization and light/dark themes remain in place. Calendar integration remains unconnected.

## Implemented and automatically verified

- **Progress:** weekly card, previous-week comparison, actual completed sets and training volume, per-exercise weight/e1RM comparisons, pain and matched ROM comparisons, reported sleep/energy/stress, rehabilitation stage snapshots and comparison to the previous week, explicit weekly goals, detail view and browser Print / Save as PDF. Israel-local Sunday weeks. Missing data remains unknown; goals are not inferred from current plans. No medical improvement claim. Report calculation is on demand.
- **Notifications:** existing center and consent gates extended with category settings, Israel-time quiet hours, stable identifiers/dismissal persistence and a hide-reminder action, weekly report/goal, active-workout, existing next-day pain follow-up, overdue ROM and new document reminders. Existing message notifications preserved. Quiet hours filter the in-app presentation. No sensitive push payloads, because no push transport is enabled.
- **My File:** passport aggregates central intake, allergies, injuries, shared professional notes/reviews and private medical documents. Owner allergy editing and existing central questionnaire editing, clinician shared assessment, PDF/PNG/JPEG upload/download, explicit PDF section selection, user/professional attribution and generation date. PDF lists document names; it does not embed or share attachments. Medical documents are clinician/owner only; admin/coach roles do not confer blanket access.
- **Contact:** existing channels enhanced with conversation filters, full-history text search (maximum 100 matching messages), read markers, handled status that reopens on new messages, PDF/image attachments and existing exercise video links, exercise/workout references, shared updates and emergency disclaimer. Existing internal staff notes retained. New writes recheck live role, linkage, grants and consent; file/video sharing requires media consent. No promised reply time.
- **Security:** database-scoped authorization and late rechecks, private authenticated downloads with no-store/nosniff headers, bounded uploads with file signature checks, metadata and audit records, optimistic edits, idempotent message/file attempts. Account export includes new records. Existing deletion-request workflow retained.

## Partial / blocked

- No browser or phone visual QA: supported managed-browser preview capability was unavailable. RTL/LTR and theme integration are implemented, but require authenticated visual and interaction checks.
- Push delivery, background scheduling and before-scheduled-workout reminders require a real transport and structured workout schedule. No new personal-record or rehab task-completion notification was invented where data was insufficient. Training target is an explicit user-entered goal, not a count of dated scheduled workouts.
- Rehabilitation exercise completion and fatigue as a distinct metric remain incomplete. Current energy reports are labelled energy, not fatigue. Weekly PDF export uses the browser's print/save-PDF dialog rather than a server-rendered downloadable PDF.
- Team updates reuse shared care notes. Internal staff notes exist; a separate internal multi-party chat is not implemented. Medical channel access uses current consent/link permissions; service-specific messaging entitlements still require definition and enforcement against purchased services.
- Files are limited to 10 MiB each and 100 records/200 MiB per client. Upload signature checks do not replace malware scanning. Automated orphan cleanup, finalized retention/deletion schedule, backup/restore checks and operational alerting remain pending. Soft archive is a store primitive without a public deletion UI; it does not permanently erase R2 data.
- No assertion of compliance with Israeli privacy law. Before real patient data, establish controller responsibilities, applicable database/security classification, supplier terms, documented retention/erasure and incident response, access reviews and a privacy/security assessment. Provider encryption settings and deployment configuration need operational verification. Do not use patient data for AI training or marketing.

## Validation and release

TypeScript typecheck passed. **649/649 existing and new automatic tests passed**, including missing data, zero pain, Israel week boundaries, no active subscription, consent withdrawal, unauthorized users, revoked staff, cross-channel documents, foreign workouts, concurrent revocation and exact retries. Full production build is recorded by the source packaging workflow. No production deployment or production database migration is authorized by this sprint.

Migration `0017_feature_sprint.sql` is additive: seven new tables, indexes and constraints; no existing table drop or destructive modification. Apply it only through a reviewed release to a suitable test environment first. Saved source/build remains pending publication; live version 89 continues to serve.

## Next priority

Review the source reconciliation draft PR, then perform an authenticated staging acceptance test across patient, clinician, coach and admin roles, both languages/themes and mobile/desktop. Resolve medical entitlement and retention/security requirements before any production deployment or use of real medical documents.

## Follow-up verification

The GitHub root CI for draft PR 4 succeeded (run 38084913155); it validates the legacy application only. Source import verification matched all 477 Site files by Git blob SHA and file mode, with all 49 legacy files preserved. The follow-up adds historical stage comparisons in both the screen and print report, hides individual reminders without dismissing unread message/appointment/program aggregates, and rechecks health consent before staff report responses. Two new tests cover stage timing/history and consent withdrawal during a report read. No browser verification or production change was performed.
