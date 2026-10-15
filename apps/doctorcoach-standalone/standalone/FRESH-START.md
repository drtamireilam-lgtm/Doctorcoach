# DoctorCoach fresh start — approved 2026-10-16

The owner explicitly chose to start tracking again rather than import the one-day history from ChatGPT Sites. This supersedes migration prerequisites for this fresh-start workflow only. MIGRATION-RUNBOOK.md and its preservation gate remain applicable if historical migration is requested later; their checks are not marked passed.

## Scope

- Keep the old Sites app and all its records unchanged.
- Use the separate deployed standalone Staging app and its existing test D1/R2 resources. Do not wipe them: the owner has already saved a test workout.
- New accounts, intake, consent, programs, workouts, private uploads and coach assignments start in the new app. Do not copy old IDs, clinical records or training history.
- Keep `DC_NEW_ACCOUNTS_ENABLED=true` and `DC_LEGACY_BRIDGE_ENABLED=false`; do not configure bridge signing keys or link old accounts.
- The provider support export request was submitted, but export is no longer a prerequisite for this fresh start. Do not interpret a future support response as permission to import, overwrite, delete, or migrate data.

## Exact account separation

`dr.tamireilam@gmail.com` is the owner/clinician login. `tamir234567@gmail.com` is a separate personal training login, with no administrator, clinician, operations or owner-program allowlist entry.

Set the following server-only variables to the owner address only, after successful owner account registration:

```text
DOCTORCOACH_ADMIN_EMAILS=dr.tamireilam@gmail.com
DOCTORCOACH_CLINICIAN_EMAILS=dr.tamireilam@gmail.com
```

Owner-program authority is derived by `careConfig` from the intersection of those two allowlists; there is no separate owner-program environment variable. Do not infer privileges from a display name or a client payload. Preserve all existing unrelated runtime variables and the D1/R2 binding IDs. Never commit the local configured Wrangler file or session secrets.

## Safe bootstrap order

1. With no staff reservation yet configured for this new owner, authenticate the owner address by OTP in the separate Staging app and explicitly create the new account. Reuse an existing verified new principal if already registered.
2. If registration reports an existing-account/ownership conflict, stop and inspect the new target's identity and reserved-email records. Do not delete reservations, enable the legacy bridge, or invent identity mappings to bypass the conflict.
3. Verify that the authenticated owner principal is active, new (`legacy=0`), unique for this email, and distinct from the personal account. Only then configure both owner allowlists and deploy the configuration to Staging. Sign out/in and verify the resulting role with the actual session.
4. Register Shira, Nadav and Alon by their own verified email-code sessions. Use their real login addresses, not assumed spellings. The read-only old Sites `care_staff` table inspection on this date returned zero rows, so it did not establish their addresses.
5. Add Shira and Nadav as coaches through the owner staff interface. Activate their personal training without granting medical/admin access. Leave Alon as a personal-only user; explicitly grant/activate his personal training entitlement if required.
6. Re-create intended coach-to-trainee assignments with the normal invitation and consent flow. Each coach sees only assigned trainees. Never bulk-link everyone to both coaches. Existing medical-consent and revocation rules remain enforced.

## Actual verification still needed

Automated synthetic tests cover independent new owner/personal identities without legacy imports, staff-personal program access and cross-coach isolation. Live owner registration, owner allowlists, other team account registration, assignments, sign-out/in role checks, private file checks, and the full first-workout flow for each role still require verification on the separate deployed app. This document is not evidence that these live steps have occurred.

The full migration deployment gate remains unchanged and does not authorize production. Fresh start is not permission to change the old pilot, use its database, disable medical consent, or publish a new production destination.
