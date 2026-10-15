# Account linking and restoration checkpoint

## User-observed remote Staging result

The user deployed the standalone application from the development branch to
`doctorcoach-standalone-staging.dr-tamireilam.workers.dev` with separate D1/R2.
Latest supplied deployment: `f0cd3792-a012-40d5-86c4-21900f05c825`.
The user reported OTP sign-in/registration, creating a split, selecting two
exercises, completing a first workout and finding it in history after reopening.
These are user-reported manual results, not independently automated browser tests.
The earlier unauthenticated API response and absent tail events remain unexplained.
Do not mark every authentication scenario passed from this single successful flow.

No legacy production account has been migrated or linked. The remote legacy
bridge remains disabled. PRs are not merged. The existing pilot is unchanged.

## Executed isolated restoration rehearsal

`tests/link-restore-rehearsal.test.mjs` uses synthetic data and local SQLite only:

1. Create a profile, consents, plan and completed two-set workout with weight,
   repetitions and actual RPE through the application stores.
2. Create an actual SQLite backup with the native backup API; restore that backup
   into a different database. Copy a synthetic private binary file separately.
3. Compare all pre-existing application table schemas and content plus file bytes.
4. Verify independent legacy/external ownership proofs; reject missing confirmation.
5. Link the external identity to the original owner ID, with no application row
   rewrites. Compare all original application tables and files again.
6. Reject proof replay; demonstrate that changing a plan owner or file bytes fails
   preservation verification.

This is a reproducible restoration test, not an actual provider D1 export/import,
R2 backup, live bridge verification or evidence about any existing user's data.

## Verification tool fixes

The snapshot verifier now reads exact 64-bit SQLite integers and encodes their
type, preserving distinctions from text and real values. It checks SQLite
integrity and foreign-key ownership before comparing snapshots. Non-regular
object files are rejected. CLI entrypoint detection uses fileURLToPath, making
Windows paths valid. These changes affect the local read-only verifier only.

Actual execution: 1,111 Node tests passed, 0 failed, 0 skipped. The built Worker
runtime smoke passed synthetic registration/linking rollback, roles, coach
isolation, private media, first workout, history and logout scenarios. No deploy
or production writes were performed for this checkpoint. The prior app source
build and TypeScript checks passed; this update changes verification scripts,
tests and this document only.

## Required before linking real existing users

- Obtain an authorized, complete backup of the actual source database and private
  objects, with source ownership, schema, object metadata and bytes recorded.
- Restore into a separate target and independently compare source/target. Do not
  treat the present empty/new Staging database as an existing-account restore.
- Prepare the trusted bridge in a development copy of the old runtime; verify
  actual old-session authentication, consent, both accounts and signing keys.
- Test browser handoff with synthetic users, cross-account collisions, replay,
  expired proofs and recovery. A pre-existing standalone account must not be
  silently merged with a legacy account, even when emails match.
- Request the user's explicit approval before installing or deploying any bridge
  to the old pilot/production. Approval for isolated Staging is not that approval.
- Re-run deployment readiness checks; do not change evidence flags to bypass
  missing provider restoration or legacy ownership evidence.

Do not send passwords, OTPs, provider tokens, signing keys, database exports or
clinical data through chat. Continue using secure provider tooling and private
authorized backups.
