# Standalone setup checkpoint — do not deploy yet

The GitHub installation authorized from the phone permits Cloudflare to access
`drtamireilam-lgtm/Doctorcoach`. It does not authenticate Wrangler on this computer.
The photographed create-application form offered no branch selector. Do not
continue its default deployment: main contains the older root Vite app.

| Setting | Candidate value |
|---|---|
| Repository | `drtamireilam-lgtm/Doctorcoach` |
| Git branch | `feature/standalone-email-auth-v171-20261015` |
| App/root path | `apps/doctorcoach-standalone` |
| Worker name | `doctorcoach-standalone-staging` |
| Build command | `npm run build:standalone` |
| Automatic preview builds | Disabled |
| Public domain routes | None during preparation |
| Live/pilot environments | Never select or modify |

Cloudflare documents branch configuration under Worker Settings > Builds:
https://developers.cloudflare.com/workers/ci-cd/builds/build-branches/
Build configuration and repository root settings:
https://developers.cloudflare.com/workers/ci-cd/builds/configuration/

Do not create a throwaway public deployment merely to reveal the branch setting.
Use authorized local Wrangler OAuth or the account's supported setup flow to
configure the isolated target, then verify the selected branch and commit before
allowing any deploy command. Never change the GitHub default branch or main to
work around this UI. Keep the Netlify pilot integration unchanged.

## What can be run without account access

From the app directory, with the pinned dependencies already installed:

```
npm run build:standalone
node --experimental-strip-types standalone/scripts/runtime-smoke.mjs
npm run verify:standalone-release
```

The build entrypoint always sets the standalone target and invokes the installed
Vinext CLI directly, bypassing the Sites execution wrapper. It never deploys.
The release check intentionally exits 2 until required evidence is complete.
Do not put bare `npx wrangler deploy` in a connected automatic build while the
candidate remains blocked. No deployment automation is enabled by this commit.

## Before an isolated remote test

- Authenticate Cloudflare securely on an authorized computer. No pasted secrets.
- Create isolated D1/R2 targets and obtain the authorized original exports.
- Restore and compare them before allowing app writes; do not use empty tables
  as a substitute for existing users and clinical/training history.
- Apply only additive `standalone/migrations` to the restored D1 target.
- Prepare a separate Supabase Auth environment and approved email delivery.
- Install required Worker secrets through secure provider tooling.
- Finish the account-link bridge and use dual ownership proof, never email-only
  matching. The old bridge remains uninstalled; live Sites remains unchanged.
- Decide and enforce staging access restrictions before exposing a test URL.

## R2 export inventory contract

`r2-preservation.mjs` is read-only. It compares inventories from an authorized
source export and target re-export, and independently streams every local blob
to verify its size and SHA-256. It does not download/upload anything itself.

Each JSON inventory has `version: 1`, `complete: true`, `objectCount`, and an
`objects` array. Only the exporter may mark complete after consuming all pages.
Each object requires:

- `key`: exact original R2 key; keys are compared as hashes, never printed.
- `blobFile`: relative export filename, ideally a digest filename supporting any
  original key; paths must resolve inside the specified export directory.
- `size`, lowercase hexadecimal `sha256`, and `storageClass` (`Standard` or
  `InfrequentAccess`).
- `httpMetadata`: all original contentType/contentLanguage/contentDisposition/
  contentEncoding/cacheControl/cacheExpiry values; use `{}` when truly absent.
  cacheExpiry must be normalized ISO UTC, e.g. `2030-01-01T00:00:00.000Z`.
- `customMetadata`: all original string keys/values; `{}` when truly absent.

Provider-generated etags, upload timestamps and version IDs may change during
copying and are not compared. Exact application metadata, keys and bytes must
match; no metadata is inferred from filenames. Missing or extra manifest objects,
duplicate keys, incomplete exports and changed ownership/cache metadata fail.

```
node standalone/scripts/r2-preservation.mjs source.json source-blobs target.json target-blobs
```

A matching locally fabricated inventory is not proof of a production backup.
The actual source export, target restore and re-export remain mandatory.

## Evidence binding

The release CLI recomputes the candidate source hash and compares it with
`standalone/evidence.json`. Editing source invalidates old verification evidence.
Generated assets, dependencies, local secrets and the evidence file itself are
excluded from the hash. Future-dated and older-than-24-hour evidence is rejected.
The checklist is an operator verification aid, not cryptographic attestation or
a replacement for provider/browser/data-migration tests.
