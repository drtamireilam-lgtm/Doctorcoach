# Full application local Staging runner — 2026-10-15

This candidate composes the tested PR #7/#8/#9 source changes and the local OTP
smoke page, without merging any PR. Nothing is deployed.

## Isolation

- The application runs on `127.0.0.1`, advertised as `http://localhost:8788`.
- Identity calls may reach ONLY `jbfkzkzcznfacsjdawmf.supabase.co` and the six
  required auth/session-active endpoints. All other server egress is denied.
- No production binding, cloud database ID, privileged key or old-account bridge
  is configured. Existing pilot and production settings remain unchanged.
- Local D1/R2 are disposable and empty on startup. Existing records are not
  copied. Restarting discards local accounts, sessions, plans and workouts.
- A fresh random session-encryption key is generated for each process. Provider
  credentials stay on the local server behind the actual app's HttpOnly cookie.
- A loopback-only control page offers a confirmed test entitlement in the LOCAL
  `training_access` table after actual gateway authentication. No payment is made.
  It requires exact same-origin POST, explicit confirmation and a new local
  `dc:` identity. It does not create consents or complete onboarding for the user.
  The grant route is absent from the deployed Worker entrypoint.

## Start on a development computer

Use Node >=22.13, the project-pinned dependencies and this branch's complete
`apps/doctorcoach-standalone` source (not an isolated HTML file).

```sh
npm run build:standalone
node standalone/scripts/live-staging-server.mjs
```

Open `http://localhost:8788/__staging` ON THE SAME computer as the process.
This address is not a remotely reachable user preview or public deployment.
It cannot be opened from another user's computer or phone merely by sharing it.

1. Choose sign-in and request a fresh OTP for a controlled test email.
2. Enter the code in the local application; explicitly create a new local account.
   Do not attempt to import/link the old app account.
3. Return to the control page and explicitly enable the local test entitlement.
4. Open the full application. Complete intake and consents in its own screens.
5. Build a simple two-set program, start the first workout, record reps/weight/RPE,
   finish, verify history/progress, then sign out.

The public staging key defaults to the one in the committed identity smoke page.
Only a publishable key is accepted. No SMTP password is needed in source.

## Actual execution this session

- Combined Node app suite: **1,102 passed, 0 failed, 0 skipped**.
- Standalone TypeScript: passed, exit 0.
- Standalone production build: passed, exit 0.
- `node standalone/scripts/live-staging-smoke.mjs`: **9 HTTP checks passed**,
  including full public app/sign-in rendering, anonymous/forged identity denial,
  origin/Host checks and confirmed/authenticated local-grant gating. This run sent
  no OTP and made no remote data writes.
- `node --experimental-strip-types standalone/scripts/runtime-smoke.mjs`: passed
  against built workerd/local D1/R2 with a SYNTHETIC provider, including complete
  registration, account linking, role isolation, private media, first workout,
  set recording, history, refresh/logout and actual D1 fault rollback.
- Syntax checks and `git diff --check`: passed.

The new HTTP runner initially used a compatibility date newer than the installed
workerd binary; it now uses the same tested 2026-05-15 profile as the existing
runtime smoke. Its Node-to-Miniflare adapter now passes explicit URL/method/header/
body values instead of relying on cross-library Request object compatibility.

## Evidence boundary / next handoff

The user reported successful live OTP, refresh and logout in the standalone HTML
identity smoke page. That is NOT evidence of live-provider full-app registration
and first workout. The new runner is configured to use the real Staging provider,
but live-provider end-to-end completion through this runner is still pending.

For a browser link accessible to the user without a developer setup, a separately
authorized isolated staging deployment is needed, with its own D1/R2, server keys
and domain. Current source neither deploys nor changes the existing pilot. Do not
relax the production deployment evidence gate or expose the local test-grant route.
