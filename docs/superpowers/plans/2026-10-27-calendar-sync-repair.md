# Calendar Sync Repair Implementation Plan

Goal: Repair existing D1 consultation/outbox and server-side OAuth flow; truthful independent approval/sync status on mobile and desktop. Supabase remains identity-only.
Base: PR56 054dfb0 (includes PR54 and PR55); latest verified GitHub chain, dedicated branch. No main merge, remote migrations, credentials changes, real events or deployment without explicit approval. Native execution authorized by user's full specification.

- [x] Reproduce false synced history, ignored provider response/readback, network/401 errors and lost local event acknowledgement with synthetic D1/provider tests.
- [x] Add minimal additive0060 attempt/verified timestamps, safe error code and timezone; preserve all existing rows.
- [x] Harden existing deterministic event ID + lease flow: verified Google response and readback, ownership/ETag, bounded401 refresh, safe errors, version-aware pending return, recovery after Google success/local persistence failure. Never count skipped events as synced.
- [x] Add per-appointment authorized retry without mutating booking/version; permit UID secretary administrative scheduling/retry with clinical redaction, never OAuth secrets or clinical lifecycle powers. Recheck permission before provider write.
- [x] UI consumes actual sync response; explicit failed/disabled/pending message, safe per-appointment retry and last attempt. Preserve existing confirmation/busy handling and translations.
- [x] Exercise real component/store/provider mocks on HE/EN desktop/mobile; test actual built Worker HTTP; full suites, TS, builds, lint, migration rehearsal and independent review.
- [x] Save exact tested tree in dedicated Draft PR; Hebrew report distinguishes historical read-only Calendar evidence, mocked integration, live LAB blockers and owner-required setup/approvals.

Review focus: concurrent edit during Google call, Google succeeds/D1 acknowledgment fails, stale admin loses permission, deleted/foreign provider event, old skipped historical outbox rows. Each receives a regression test. No silent patient data export; generic DoctorCoach — ייעוץ רפואי title, no clinical payload.
