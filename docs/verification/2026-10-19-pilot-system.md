# Pilot system verification — 19 October 2026

## Source and scope

Work branch: `stabilize/pilot-system-20261019`, based on PR #21 head `824f035b386dfcc5e367b394a11a0a6fc45d3972`. PR #21 remains an open draft; its inspected CI run 39277085309 passed. Main was `818e4ce6a4b3b48084f12f1791b98832f4228214`. Premium is three commits ahead of main. `feature/lab-team-management` diverges by 50 main-only and 52 branch-only commits and is the separate root Supabase application; it was not merged or replaced.

The full application is `apps/doctorcoach-standalone`, D1/R2 with standalone Supabase identity. Production URL from repository evidence: https://doctorcoach.dr-tamireilam.chatgpt.site. Dedicated LAB configuration: https://doctorcoach-isolated-staging.dr-tamireilam.workers.dev, D1 `0e7a9467-5758-4d6f-b52a-ee4385a2d37d`, R2 `doctorcoach-isolated-staging`, identity project `jbfkzkzcznfacsjdawmf`. These are configuration facts, not independent verification of remote bindings or deployed source.

## Fixed

The isolated deployment preflight accepted configs with production zone routes/custom domains or additional Durable Objects/queue/email/analytics bindings. Two regression tests reproduced that acceptance before the fix. The checker now rejects these configurations and requires dedicated workers.dev hosting with preview URLs disabled. Three regression tests pass. CI now builds the isolated target and checks the generated configuration before HTTP smoke tests. This reduces accidental deployment risk; it does not certify remote resources or replace Cloudflare account inspection.

Expanded built Worker HTTP smoke with an independently linked synthetic dietitian: assigned nutrition access, medical redaction, foreign-trainee denial, private medical document denial and immediate revocation. Existing smoke covers synthetic trainees, two coaches, clinician/admin, OTP, refresh/logout, registration rollback, private files, history, repeated occurrences and all thirteen theme preferences.

## Executed verification

- Frozen standalone dependency installation: passed, lockfile unchanged.
- Root `npm test`: 10 foundation tests plus 6 PostgreSQL/RLS tests passed.
- Root `npm run build`: passed (bundle-size advisory).
- Standalone full `npm test` after fix: 1,219 passed, 0 failed, 0 skipped.
- Standalone `npm run typecheck`: passed.
- `DC_ISOLATED_STAGING_BUILD=true npm run build:standalone`: passed (bundle-size/route-classification advisories).
- Generated `dist/server/wrangler.json` isolated preflight: passed.
- Expanded built HTTP smoke, including dietitian scope/redaction/revocation: passed; provider requests are synthetic and D1/R2 are ephemeral local stores.
- Four-day Powerlifting test in full suite executes draft/assignment, ten exercise occurrences, all sets, four completed workouts, graph series and program revision without history rewriting.
- Permission, consent/revocation races, nutrition qualification, partial session persistence, pain/ROM, RPE/RIR/e1RM, next-set suggestions, occurrence identity and appearance persistence are covered by the executed suite. These are automated checks, not physical-device acceptance.

## Failures and boundaries

An initial test run before standalone dependency installation failed on missing packages (including fflate and wrangler). The installed rerun passed. The two new regression tests initially failed as intended and passed after the fix.

Fresh `wrangler whoami` reports unauthenticated. Read-only HTTP HEAD probes returned LAB 403 and Production 401. No OTP was sent, no real accounts/clinical rows were read or changed, and no secret values were printed. Live secret settings, resource ownership, database isolation, migration ledger and remote recovery cannot be certified here. Chromium executable is absent, so no mobile browser or physical iPhone/Android visual QA was performed. Real email delivery, second-device persistence and actual offline/reconnect behavior remain unverified.

No remote migration, LAB deployment, Production change, main merge, paid-service activation or real-data write occurred. Pilot readiness is **not certified**. Highest priority: authenticated read-only inspection of the dedicated Cloudflare LAB and its bindings/migration ledger, then safe LAB deployment and a controlled real-email/mobile acceptance run for all five roles using test accounts.
