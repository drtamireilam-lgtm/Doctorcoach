# Current DoctorCoach Site source import

This draft imports the complete tracked source of saved Site version 93 into `apps/doctorcoach-site/`. The root Vite/Supabase application, its migrations, dependency lockfile and CI remain unchanged.

## Provenance

- Site source commit: `34bd444ff0d99fee83586c4ce81ee037d382d43f`.
- GitHub base: `8b9c2f2dd77e7cb3d56acc4195049bb6d9e7b473`.
- All 491 source files and binary assets are exact copies. Runtime credentials, patient data, local database files, dependencies and build output are excluded.
- The hosting manifest identifies the existing Site. This PR does not deploy or apply migrations.

## Validate independently

Use Node 24 (validated runtime: 24.19.0) and pnpm 11.25.0:

```sh
cd apps/doctorcoach-site
pnpm install --frozen-lockfile
npm run typecheck
npm test
npm run build
```

Before import, this source passed TypeScript, a full production build and 668/668 automatic tests. Existing GitHub CI validates the legacy root app, not this nested app. No new automated workflow or paid service is activated.

## Review and next steps

Start with `apps/doctorcoach-site/docs/2026-10-10-feature-sprint.md`, the four new test suites and additive D1 migration 0017. Preserve the root account/RLS functionality while deciding how both implementations should be maintained. Their different identity and database models are not combined by this PR.

Weekly reports, in-app notification preferences, private medical documents/passport and extended messages are implemented in the imported code. Push transport, workout scheduling, medical-service entitlements, retention/erasure operations and privacy/security acceptance remain incomplete. Live version 89 is unchanged.

Browser/mobile acceptance was unavailable because supported preview controls were missing. Next: authenticated acceptance in a non-production environment with synthetic data, two trainees, authorized/revoked staff, both languages/themes and phone/desktop. No real medical data until remaining privacy/security checks are completed.

Follow-up: stage comparisons retain each episode's historical state at both week ends, including in the printed report. Individual reminder dismissal is available; unread message/appointment/program aggregates are not dismissed by that UI. Staff report reads recheck health consent before returning data. Two added tests cover stage history/time boundaries and consent withdrawal during a read.

The latest source adds an isolated administrator mock-payment ledger and Settings test panel, disabled by default. It does not alter real memberships, training permissions or live prices. See `apps/doctorcoach-site/docs/2026-10-11-billing-sandbox.md`. No provider adapter, trusted provider webhook or real checkout is implemented; mock event processing must never be presented as real verified payment processing.

The document lifecycle follow-up adds owner archive/restore and explicit deletion-request/withdrawal controls in My File, plus a metadata-only admin review queue in Settings. Additive migration 0019, atomic versioned audit writes and eight new tests cover this workflow. No permanent deletion is implemented. See `apps/doctorcoach-site/docs/2026-10-11-document-lifecycle.md`. No deployment, production migration or live data deletion was performed.
