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
