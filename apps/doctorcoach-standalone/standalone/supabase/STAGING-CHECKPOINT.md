# Isolated live authentication checkpoint — 2026-10-15

Project: DoctorCoach-Staging (`jbfkzkzcznfacsjdawmf`), London.
Production/pilot `nlnyvrbejaqzdbekwlgi` was not modified.

Applied to staging only:

- `session-active.sql`, migration `doctorcoach_isolated_session_check`.
- `restrict-auto-rls.sql`, migration `restrict_auto_rls_trigger_function`.

Actual verification: session-active RPC returned false without identity;
anonymous execute privilege false; authenticated execute privilege true.
The security advisor initially flagged the dashboard-generated `rls_auto_enable`
function. After restricting execute permissions, the repeated advisor returned
an empty finding list.

The owner configured SMTP and both OTP templates through the dashboard.
A live `/auth/v1/otp` request returned HTTP 200 and the owner confirmed receipt
of the email. Real code verification/refresh/logout remain pending user execution.
SMTP passwords and private keys are not in source.

## Local test screen

Download `../DoctorCoach-Staging-Login.html` and open it in a desktop browser.
Enter a controlled email, request a NEW code, then enter that code in the page.
The page validates the provider identity and the server-side session-active RPC,
offers refresh, and verifies RPC denial after logout. It only connects to this
staging project. A public/publishable project key is intentionally embedded;
no privileged key is used. Credentials stay in JS memory, never local storage.
The page sends nothing until the user explicitly requests a code.

This is an identity-provider smoke test, NOT full DoctorCoach login or old-account
linking. It does not touch the D1/R2 application or existing application owners.
Do not deploy it as a production login page. Prefer the existing server-cookie
gateway for the actual application.

Six script/DOM regression tests passed with synthetic transport, zero failures.
This is not a claim of a real-browser or end-to-end app login pass.

Run from the app directory:

```sh
node --test tests/live-staging-screen.test.mjs
```

No application deployment or PR merge was performed.
