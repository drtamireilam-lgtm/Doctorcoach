# LAB continuation and OTP refresh recovery — 19 October 2026

Continues PR #22 at 68b2c83247e97b050eca33d38c91994dd9babc4b. No main merge or Production change. CI run 39280289202 was still queued at the last check; no failed job exists to diagnose yet.

## Live observations and blocker

Cloud Browser loaded the dedicated LAB /auth/signin page, showing the Hebrew isolated-test notice, email entry, send-code button and English switch. This establishes public page availability from that browser; it does not establish the deployed commit, remote resource isolation or a completed login. The earlier shell HEAD 403 was not proof the site was unavailable.

Cloudflare CLI remains unauthenticated; a plugin-directory search found no Cloudflare plugin. Cloud Browser reached the Cloudflare dashboard login, with Google/Apple/GitHub/SSO/email options. Secure browser authentication returned submitted with Apple selected. Automatic browser approval review then denied observation of appleid.apple.com because a trusted user message had not explicitly authorized Apple as the Cloudflare sign-in method. No workaround or alternative authentication route was attempted. Explicit approval for that cross-service authentication step is needed before retrying. Browser sign-in alone also does not authenticate the CLI.

No remote bindings, secret settings, database migration ledger, backups or deployed source could therefore be independently inspected. No remote writes, migrations, deployments, account creation, real email OTP or real clinical data access occurred.

## Reproduced and fixed

The code-entry form was only opened after the in-memory send-code callback. Reloading the sign-in page while its valid HttpOnly challenge cookie still existed hid code entry and did not restore it. This is one reproducible cause consistent with the previously reported missing code field; it does not prove the cause of every prior live incident.

Added a same-origin POST /auth/pending endpoint that reads only the opaque challenge cookie and returns the pending email/resend time for an unconsumed, unexpired, non-exhausted challenge. It never returns the challenge token, OTP or session tokens and does not create authentication. Unknown/expired/exhausted/consumed challenges return pending:false. Responses remain no-store, cross-origin requests are denied. No browser storage is used.

The sign-in page now restores code entry after a 401 session-status result if a valid pending challenge exists. It restores the resend cooldown, clears the code input and sends no extra email. Both languages use the same behavior. Existing send-code transitions hide email entry and focus code entry. Existing switch-email behavior is retained.

Three new regression tests failed before implementation and passed afterward. The built Worker smoke also checks pending challenge recovery and its absence after successful verification.

## Verification

- Targeted authentication/UI suite: 36 passed, 0 failed.
- Full standalone suite: 1,222 passed, 0 failed, 0 skipped.
- Standalone TypeScript: passed.
- Isolated standalone build: passed, existing bundle-size/route-classification advisories remain.
- Generated isolated-target preflight: passed.
- Expanded built Worker HTTP smoke: passed, including pending-challenge recovery/consumption, five role types, cross-user isolation, registration rollback and thirteen themes. All identity-provider responses are synthetic; local D1/R2 only.

Previous root tests were not repeated: this change is confined to the standalone application and no root implementation/dependency input changed.

## Remaining acceptance

No live OTP delivery, completed browser authentication, physical-phone/mobile-layout acceptance, second-device session persistence or live coach-to-trainee workout was performed. The code is not deployed. Pilot readiness remains unverified. Continue with explicit Apple-method authorization, safe authenticated Cloudflare resource inspection and LAB-only deployment, followed by dedicated test-account real-email/mobile acceptance. Do not infer live data isolation from configuration names or successful local tests.

## Follow-up after explicit Apple-method authorization

The user explicitly approved continuing Cloudflare sign-in via Apple. Secure credential handoff authenticated Apple and displayed the existing Cloudflare continuation screen. After continuing, Cloudflare returned to its login page with the visible error: "Apple sign-on did not work. Try again or contact support." Cloudflare authentication did not complete. No automated retry or change of sign-in method was attempted. This error alone does not prove bot detection or a credential failure. Manual sign-in in the same Cloud Browser is the remaining authentication step; signing in elsewhere does not authenticate this browser or the CLI.

Additional public LAB browser checks: Home showed the seven required navigation areas and team; Exercise Library showed 125 entries; searching `bench` returned seven results; English switching set document lang=en and dir=ltr, with no horizontal document overflow at the observed desktop viewport (pageWidth 1348, viewport 1363); My program exposed no personal plan and disabled Start workout/Print while signed out. These are public desktop/browser observations, not mobile or authenticated acceptance. English mode still contains Hebrew appearance-save guidance and untranslated incline/close-grip bench entries; recorded as nonblocking localization follow-up, without prioritizing cosmetic work over pilot access. No live application data or infrastructure settings were changed.
