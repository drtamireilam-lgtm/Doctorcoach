# DoctorCoach account migration preparation

Status: development preparation only. No old-runtime route is installed, no real
user backup is obtained by this package, and no pilot or production data is
changed. Do not enable the existing Staging legacy-bridge flag yet: its current
issuer is intentionally synthetic and no trusted old bridge is installed.

Validation of this preparation: 1,117 automated Node tests passed, 0 failed or
skipped; TypeScript and standalone production build passed. The built Worker
runtime smoke passed with a synthetic provider and disposable local D1/R2.
Six new route/key/handoff regressions cover disabled configuration, origin/CSRF
checks, forged identity, trusted session failure, dual-proof signing and key
bundle overwrite protection. These are preparation results, not live migration
evidence. The available Sites connector exposes table reads but no complete
database/private-object backup operation; a consistent provider export still
needs to be obtained through the authorized source backup mechanism.

## 1. Inventory and actual backup

Record the exact old application version, trusted identity issuer, D1 database
binding/provider, private object storage binding/provider, configuration and
ownership columns. Get these from the authorized source environment, never by
guessing from a matching email. Keep source and target resource IDs distinct.

Obtain a complete consistent source database export and a private object export.
The existing pilot uses Sites; access to GitHub and the new Cloudflare account
does not itself grant access to that pilot's underlying database or buckets.
Use the pilot provider's supported private backup/export mechanism. If a complete
source export cannot be obtained, stop migration; reading some API pages or
table rows is not a verified backup. Do not send source exports through chat.

For private objects, retain every exact key, owner reference, byte sequence,
content type, disposition, caching attributes, custom metadata and storage class.
Consume all pagination and record a complete manifest using the contract in
`CLOUDFLARE-SETUP.md`. Include deletion-journal objects. Preserve source files
unchanged and access-restricted. Record export time, source version, checksums,
counts and the provider's consistency boundary. A source export taken while
writes continue is not a final cutover snapshot.

The current new-account Staging database is not an empty migration target now:
it contains a test account and workout. Do not overwrite it. Use a NEW dedicated
restore target for rehearsals and real migration. Do not combine standalone and
legacy accounts or grant additional roles merely because emails match.

## 2. Restore and independently verify

Restore the actual source export into a separate test database/storage namespace,
without redirecting existing users. Export the restored database and objects
again. For local SQLite inspection copies, use Node >=22.13:

```sh
node standalone/scripts/snapshot.mjs compare source.sqlite restored.sqlite source-objects restored-objects
node standalone/scripts/r2-preservation.mjs source-manifest.json source-objects restored-manifest.json restored-objects
```

The first command verifies database integrity/foreign keys, original table rows,
schema and bytes. Additive identity tables are deliberately excluded, so do not
use it as proof that identity/session tables were backed up. New application
tables are allowed; original application tables must remain identical.
The second command independently verifies every manifest entry, file digest and
object metadata. Both must pass. Neither command exports, restores, uploads or
changes a cloud resource. Convert SQL exports to local SQLite with a controlled
offline SQLite tool; never execute an unreviewed export against a live database.

Retain before/after counts, byte digests, test logs and operator timestamps in a
private migration record, without clinical contents in public reports. Rehearse
source backup -> new target restore -> independent compare -> rollback before
allowing any existing-user writes on the new platform.

## 3. Signing keys for an isolated rehearsal

Create a new directory OUTSIDE the Git checkout. Example in PowerShell:

```powershell
node standalone/scripts/prepare-link-keys.mjs "$env:LOCALAPPDATA\DoctorCoach-Link-Rehearsal-Keys"
```

The command creates two independent Ed25519 pairs and refuses an existing output
directory. It prints no secrets and uploads nothing. On Windows, ensure the
directory inherits private user-only permissions; POSIX mode bits alone do not
establish Windows ACL protection.

| File | Destination after secure configuration approval |
| --- | --- |
| old-runtime-secrets.json | Isolated OLD runtime: legacy private signing key and new-runtime public verification key |
| new-runtime-secrets.json | Isolated NEW runtime: new private signing key and legacy public verification key |
| public-keys.json | Public verification material only |

Never copy either private key to the other runtime, the browser, Git or chat.
Use provider secret storage. Do not regenerate keys on a working environment:
rotation requires an explicit plan for in-flight proofs and a rollback window.
Use separate pairs for rehearsal and production.

## 4. Trusted old-runtime integration candidate

`legacy-route-candidate.ts` exports a disabled-by-default route factory. It is
NOT imported by `worker.ts` or installed at an application route. In an isolated
copy of the OLD application, a framework route at `/account/migrate` can call:

```ts
const route = createLegacyMigrationRoute({
  enabled: false, // enable only in an isolated rehearsal with verified config
  oldOrigin: pinnedOldOrigin,
  standaloneOrigin: pinnedNewOrigin,
  legacyIssuer: exactOriginalIssuer,
  externalPublicKey: parsedNewPublicKey,
  legacyPrivateKey: parsedOldPrivateKey,
}, async () => {
  const user = await getChatGPTUser(); // OLD trusted server-session adapter
  return user ? {userId:user.userId,email:user.email} : null;
});
export const GET = route;
export const POST = route;
```

This sketch requires the old app's genuine trusted server-session context.
Do not replace it with request headers from a public origin, query parameters,
email lookup, a browser callback or the new standalone account adapter. Confirm
the platform's header trust boundary and route authentication in the isolated old
runtime before installation. Missing session services deny access.

Pin distinct canonical HTTPS origins and exact issuer. Configure the new gateway
with the reciprocal keys and `DC_LEGACY_ORIGIN` set to the isolated old origin.
The Worker constructs only `/account/migrate` on that pinned origin; no
production-old URL is assumed. When the bridge flag is enabled, a missing,
noncanonical or same-app old origin fails closed. Leave the flag false until
all rehearsal configuration is verified.

## 5. Browser rehearsal matrix

- Complete restored legacy plan/history, private file access and medical consent
  checks before any linking. Record original owner IDs privately.
- Sign in to a fresh external identity. Authenticate independently to the old
  test app. Inspect both accounts; only explicit confirmation signs the old
  ownership proof. The new UI separately requires confirmation before linking.
- Verify the new external identity resolves to the original owner ID and retains
  original program, completed sets, RPE, history, medical consent and private files.
- Recheck trainee/coach/doctor/admin boundaries, cross-coach isolation and revoked
  consent after linking. Linking must not create a staff role.
- Reject missing/expired/wrong-audience proofs, wrong target, forged headers,
  cancelled confirmation, replay, blocked owner and external identity already
  attached to another principal. Test receipt/storage failures and retry.
- Confirm pending proof data is removed from the address bar, not logged, not
  stored in local storage and not sent via analytics/referrer headers.
- Test two browsers/phone, refresh, logout and old-token replay; retain actual
  results separately from synthetic automated test results.

## 6. Cutover and rollback preparation

Keep the old app available and unchanged throughout preparation. Do not change
DNS, migrate real users, install the pilot bridge or merge PRs without the user's
separate approval. Establish a maintenance/write-consistency window, take a final
verified backup, restore/compare again and document the rollback version and
resources before cutover. Local synthetic backups do not satisfy these checks.

If a rehearsal fails, stop new linking and writes to the isolated target. Keep
failed-target evidence; do not delete aliases, remap owners by email or rerun
imports over occupied databases. Restore a separate clean target from the
verified backup and compare again. The unchanged source remains authoritative.

After a future real cutover, reverting Worker code alone does not undo new user
writes. Reconcile target-only writes under an approved recovery plan before
redirecting users back; never restore an older backup over newer user data.
Disable new linking on both sides while preserving existing aliases/receipts and
backups. Do not revoke all user sessions or signing keys as an improvised rollback.

The release gate must continue to fail until actual provider backups/restoration,
trusted bridge, browser linking, secrets, TLS/domain and rollback evidence exist.
Do not tick evidence flags based on this preparation package.
