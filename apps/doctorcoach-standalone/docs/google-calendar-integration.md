# Google Calendar — Tamir's personal consultation calendar

Target: `dr.tamireilam@gmail.com`, primary calendar only. Server-owned provider target: `tamir`.
Google web OAuth client: `935117047338-vq404cjckidqvc40nel1gac1et44eui8.apps.googleusercontent.com`.
Redirect URI: `https://doctorcoach.dr-tamireilam.chatgpt.site/api/google-calendar/callback`.

## Operator setup

Google Calendar API must be enabled in the owner's Google Cloud project.
Add the redirect URI to the Web application OAuth client (JavaScript origins can remain empty).
Add the owner as a test user if the Google OAuth audience is Testing. Google limits these refresh tokens to seven days; production readiness must be reviewed before relying on uninterrupted scheduling.
In DoctorCoach's appointment management, Tamir alone can upload the Google Web OAuth client JSON or paste its Client secret into the password field. The secret is sealed before persistence. The client ID is validated against runtime configuration, and credentials are not echoed by the API. No credentials belong in chat or source.
Click Connect and complete Google's approval in a full browser. The callback verifies the Google email, granted calendar scope and a single-use state tied to the authenticated Site owner, PKCE, and an HttpOnly cookie.
Click Sync pending appointments for existing bookings, at most three per explicit retry.

## Runtime configuration

Native Sites configuration provides `DOCTORCOACH_CALENDAR_CLIENT_ID`, `DOCTORCOACH_CALENDAR_OWNER_EMAIL`, and secret `DOCTORCOACH_CALENDAR_ENCRYPTION_KEY` (32 random bytes, base64url).
Never rotate the encryption key casually: existing credential/refresh-token ciphertext requires the same key.
OAuth credentials and user connection tokens are encrypted with AES-GCM using separate purpose-bound AAD. Only the configured calendar owner who is also a configured Site administrator can establish/change/disconnect the connection. Operations coordinators cannot obtain tokens or change the destination.
Sites sign-in is unchanged; Google OAuth grants Calendar API access and does not create a second app sign-in identity.

## Synchronization

Appointment changes remain guarded by the existing coordinator/admin authorization and version checks. D1 triggers create a minimal synchronization task atomically with committed scheduling, rescheduling and cancellation. They do not export a requested appointment or a mere cancellation request. Account appointment deletion retains a cancellation task without patient data.
The appointment mutation then attempts server-side synchronization; a failure never rolls back the booked appointment or falsely marks an event delivered. Status is shown to coordinators. Pending failures need explicit retry; no unattended retry scheduler has been configured.
One global connection lease serializes Google writes. Deterministic event IDs plus provider ownership markers prevent duplicate creates and foreign-event overwrites. ETag protects against a concurrent external edit; version-aware completion retains newer appointment changes in the queue.
Only generic consultation format, client name, start/end and generic app reference are exported. Google events are private, use Asia/Jerusalem and include a one-hour popup reminder. No clinical notes, diagnoses, files, payment data, attendee invitations or free-text service descriptions are exported.
This is one-way synchronization. External edits in Google do not modify DoctorCoach bookings. External availability is still checked manually; the app checks overlap against its own confirmed appointments.
Disconnect stops future writes and deletes the app's stored refresh token; existing events remain. Google account access can also be revoked in Google settings.

## Validation limits

Automated tests use a fake Google provider for consent, scope, state replay, encrypted storage, single-event rescheduling, cancellation, failure/retry and overlapping worker behavior. Actual Google approval, hosted event creation/readback and phone calendar display require the owner's secure setup and have not yet been verified.
## Worker request compatibility

Google requests use `redirect: 'manual'` and reject 3xx responses before reading
them. The Workers runtime rejects `redirect: 'error'` before sending a request.
`tests/google-calendar-worker.test.mjs` verifies token requests and redirect
rejection in real workerd via Miniflare, with a mocked outbound Google service.
This verifies runtime compatibility, not live OAuth authorization or delivery.

## Consultation Management 2.0 — isolated LAB

The appointment data resides in Cloudflare D1 (`care_appointments`), not Supabase. Supabase is the identity/session provider. Appointment authorization is enforced on the server and at the final D1 mutation statement, with coordinator scope and revocation checks. No consultation table or medical RLS policy is added to Supabase.

LAB diagnosis on 27 October 2026: four appointments (one requested, three scheduled), zero Calendar connections, and only the identity/session secrets installed. The LAB policy deliberately denied Calendar credentials. OAuth callbacks and same-origin checks were hardcoded to the original Site. This is evidence for LAB only; production was not inspected or changed.

Calendar defaults on the original Site remain unchanged. The standalone deployment uses its server-configured origin for both consent and code exchange. LAB can only enable Calendar with all of:

- `DOCTORCOACH_CALENDAR_TEST_ENABLED=true`
- `DOCTORCOACH_CALENDAR_ID=<secondary-test-calendar>@group.calendar.google.com`
- Calendar client ID, owner email and a fresh LAB encryption key installed securely.
- The LAB callback registered in the Google OAuth web client: `https://doctorcoach-isolated-staging.dr-tamireilam.workers.dev/api/google-calendar/callback`.

`primary` and personal email calendar targets are rejected in LAB. No keys, client secrets or refresh tokens were copied or installed by this change. Complete consent through the existing owner-only secure setup UI. A new LAB connection is required; there is no stored LAB refresh token to reconnect. A personal-calendar test still requires the owner's explicit approval and is outside this test setup.

Missing credentials/connection now return `disabled`, preserving the booking and transactional outbox. Provider failures retain safe errors and support the existing explicit retry (three pending appointments per click). No unattended scheduler is added. Existing deterministic event IDs, lease serialization, ETag checks, encrypted credentials, Google event ID persistence and version-aware delivery are reused.

The staff workspace separates pending approval, upcoming and action required; overdue appointments never auto-complete. Completed, cancelled and no-show consultations remain in history even with payment or sync issues. History has server-side patient-name/date/status filters, pagination, detail disclosure and Israel-day boundaries. Completed records cannot be reopened by follow-up; request a new consultation instead. No-show reported payments can still be verified in history.

Migration `0058_consultation_history.sql` only adds a transition audit table/index/triggers. Existing appointment rows are not rewritten or backfilled with invented transitions. Audit entries contain appointment IDs, states, versions and timestamps, without patient names or free-text medical content. Administrative responses remove free-text preferences, staff notes and consultation feedback. Completion/no-show/follow-up/feedback requests require configured clinical authorization. Coaches do not gain appointment management access.

Verification uses real SQLite stores, fake Google responses, real Workers runtime requests, and bilingual desktop/mobile React browser flows. Live Google authorization/delivery and an authenticated hosted phone/doctor session remain manual acceptance checks.

## Delivery receipt repair — 27 October 2026

Consultations remain in D1. Supabase is identity-only. Additive migration0060 adds last_attempt_at, last_synced_at, last_error_code and the fixed Asia/Jerusalem time_zone to the existing outbox; it does not change bookings, issue receipts for old rows, or run remotely.

A delivery now needs matching Google write acknowledgement and a subsequent GET of the same owned event, matching appointment marker, event ID, current start/end instants and timezone. Cancellation verifies absence or a cancelled tombstone. Both update and delete use the fetched ETag. A failed explicit verification overrides any older receipt. Old acknowledgements without receipts stay pending until explicitly verified; past appointments are no longer silently counted as delivered.

Event title is exactly `DoctorCoach — ייעוץ רפואי`. Patient name, clinical text, free-form service title and documents are not exported. Start/end instants and the opaque appointment correlation ID are the only appointment-specific exported data. Existing Google events are sanitized only when explicitly synchronized, not through an unsolicited bulk change.

The booking response and UI distinguish approval from delivery. Each administrative appointment offers a safe explicit retry, including a fresh check of an already acknowledged event. A retry does not change the booking/version. Deterministic event IDs recover from a lost local acknowledgement after Google success. A global connection lease serializes writes, and current administrative permission and connection lease/revision are rechecked before each provider mutation, including the bounded401 token-refresh retry. Provider errors are reduced to safe categories, without saving/logging raw responses or credentials. Manual batch retries rotate by last attempt so persistent failures do not starve later tasks. There is no background scheduler and no automatic retry loop on429/5xx.

When UID management is enabled, authorized secretaries can use only the redacted consultation scheduling/retry API in addition to user management; they cannot configure Calendar OAuth, read clinical preference/notes/feedback or perform clinical completion/follow-up actions. The UID grant is checked against live D1 rows. No real secretary account is granted by this change.

Read-only historical Calendar inspection found the18 October18:00 event and no event in the23 October window in the connected primary calendar. This does not prove the LAB Worker has Calendar authorization. Current remote D1/ledger, installed secrets, OAuth configuration and Worker version remain unverified because Cloudflare CLI is unauthenticated. LAB's secondary-calendar-only restriction remains intact. No new real event, OAuth permission change, remote migration or deployment was performed.

Primary references checked during implementation:
- https://developers.google.com/workspace/calendar/api/guides/create-events (client-specified IDs and duplicate prevention)
- https://developers.google.com/workspace/calendar/api/guides/errors (401 refresh,403,404,429,5xx)
- https://developers.google.com/identity/protocols/oauth2/web-server (server-side OAuth/refresh)

Final Hebrew report: `docs/verification/2026-10-27-calendar-sync-repair-he.md` at repository root. Live acceptance requires authenticated remote audit, protected backup/restore, owner approval of the exact migration/deployment and an explicitly approved test-calendar event. Never use generic migration deployment to guess the remote ledger.
