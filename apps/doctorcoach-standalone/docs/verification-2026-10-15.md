# DoctorCoach isolated verification — 15 October 2026

All execution used synthetic users, ephemeral in-memory SQLite/PostgreSQL and local workerd D1/R2. No production/pilot databases, remote objects, accounts, auth settings, DNS, deployment or real email were changed. No PR was merged. No user data was exported or transferred.

## Tested sources and actual results

PR #7 input: `962b2869ccfb008403d4301358349da44b290202`.
PR #8 final code: `527c2b1b883f11d92fd01b28be4f768431aa006c`.
PR #9 input: `ac7cb1b4373a6f88e4829a6e6afca5eda7fdace4`, plus the two regression tests committed alongside this report.
Base of all three: `fcb2ae3b400fb766eaf23e23708ff0656690551c`.

A separate local validation checkout applied the three PR patches together. This is a test composition, not a merge into any remote branch. Dependency versions came from the existing frozen lockfile; no dependency upgrades were made.

| Check | Passed | Failed | Skipped |
|---|---:|---:|---:|
| PR #7 full app Node suite | 1,083 | 0 | 0 |
| PR #8 full app Node suite after fixes | 1,086 | 0 | 0 |
| PR #9 full app Node suite after added coverage | 1,086 | 0 | 0 |
| Combined final app Node suite | 1,093 | 0 | 0 |
| Repository foundation suite | 10 | 0 | 0 |
| Repository local PostgreSQL/RLS suite, including parent test | 6 | 0 | 0 |

These are overlapping runs; do not add the individual PR counts to the combined count.

- Combined standalone `npm run typecheck`: exit 0.
- Combined `npm run build:standalone`: exit 0; real production Worker/SSR assets built locally.
- Root `npm run build`: exit 0, including root TypeScript check. Root Vite emitted a nonfatal chunk-size warning.
- Extended `node --experimental-strip-types standalone/scripts/runtime-smoke.mjs`: exit 0 against the built Worker with actual local D1/R2, synthetic identity-provider HTTP transport and synthetic signing keys.
- `git diff --check`: passed for code changes.
- Deployment evidence gate: exit 2 / `ready:false`, intentionally blocked. This is a release blocker, not a passing deployment check. No deployment was attempted.

## Failures reproduced and corrected in this session

1. **Node/workerd linking-key incompatibility.** The initial extended built HTTP run failed `/auth/link/inspect` with 401. A minimal workerd reproducer reported `DataError: JSON Web Key Algorithm parameter "alg" ("Ed25519") does not match requested Ed25519 curve.` Node 24 exports the equivalent algorithm spelling `Ed25519`; workerd expects JOSE `EdDSA`. The linking crypto adapter now validates `kty=OKP`, `crv=Ed25519`, allows only these equivalent spellings or an absent algorithm, then normalizes to `EdDSA`. Other algorithms/curves/key types and wrong signatures remain rejected. The original generated Node keys now pass through the built HTTP route.
2. **Partial registration after a storage failure.** A trigger aborting the new-account details insert reproduced an orphan identity: registration failed, then `current()` returned 403 `Account needs verified identity details`. Account principal, alias and required identity details now commit in one D1 transaction. The regression verifies complete rollback and successful retry; a simultaneous registration test verifies one complete principal.
3. The first expanded HTTP test fixture omitted required `care_notes.author_id`; this was a test-fixture error, corrected before final execution.

The earlier PR #8 atomic legacy-link correction was retained and revalidated. Local D1 triggers now also prove that failed registration AND failed legacy-receipt storage roll back the external identity and allow retry with the same valid proof. No legacy clinical/workout rows or private object keys are rewritten by linking.

## Runtime coverage actually executed

- Correct/wrong OTP, explicit self-registration, provider-token refresh, spoofed identity-header rejection, logout replay denial.
- Verified signed legacy linking, proof replay denial, reservation of staff email addresses against accidental self-registration.
- Distinct trainee, coach, doctor and admin behavior via the built HTTP API.
- Two independently linked coaches and two clients: roster isolation; cross-client file, note, program-write and progress access denied.
- Medical profile/notes omitted from coach response; private medical PDF denied to coach and readable by explicitly granted doctor.
- Private video readable by its owner and authorized coach, denied to another coach, immediately denied after connection revocation.
- Own program creation, first workout, two recorded sets with weight/repetitions/RPE, RIR setting, next-set load application and completed workout history.
- Exact synthetic PDF/video bytes retrieved from R2 with private caching; foreign-user access denied.
- Final workout still present after account/role tests.
- Node suites additionally cover consent/revocation races, ownership isolation, invalid/expired/replayed OTP, old-owner mapping preservation, e1RM, fractional next-set loads, body-weight/pain/ROM/weekly progress and related guards.

The five dedicated multi-coach regressions pass. New cases verify that clinician role AND medical grant are required, admin rights alone do not grant client access, and revoking one of two consented coaches preserves access for the remaining coach and trainee.

## Reproduce locally

At repository root:

```bash
npm test
npm run build
```

At `apps/doctorcoach-standalone`, with its frozen dependencies installed:

```bash
npm test
npm run typecheck
npm run build:standalone
node --experimental-strip-types standalone/scripts/runtime-smoke.mjs
node standalone/scripts/deployment-gate.mjs standalone/evidence.json
```

The last command is expected to remain blocked until reviewed release evidence exists. PR #8 owns the expanded runtime script; use its final revision together with PR #7 and #9 for the combined candidate.

## Not yet verified / required before launch

- Real SMTP/OTP delivery and a live isolated Supabase project's token refresh/revocation and session-active RPC. The existing pilot project was not changed.
- Real desktop/mobile browser interaction. The DOM harness ran, but Playwright could not launch because its Chromium executable is absent; no browser pass is claimed.
- Installation and validation of the old-account bridge in its trusted runtime; audited recovery for users unable to sign into the old account.
- Authorized, consistent D1/R2 backup, verified isolated restore, table/schema/content/object/metadata comparison and rollback rehearsal. Synthetic preservation tests do not substitute for a production backup.
- Production secret/config review, domain/TLS/redirect preparation and remaining feature smoke checks.
- The existing evidence file still refers to an older candidate; the release gate correctly reports `candidateSourceMismatch`. It was not changed to claim readiness.
- Current GitHub CI is limited to PRs/pushes against `main` and runs the root app checks; these app/combined results were executed locally, not by a GitHub Actions run.

Launch and any production change require separate user approval after these checks. Current PRs remain review-only development drafts.
