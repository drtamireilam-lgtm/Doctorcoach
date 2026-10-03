# P0 access boundary — prepared 2026-10-03

Baseline: GitHub `main` at `8d6ee337d429e3b409e989bc6b2b813a0c5332c7`.
The latest three CI runs passed. This change is not a repair of the old CI failure.

## Changes

- Production and invalid runtime modes do not mount the demo app, so its role selector and browser-data effects cannot run. An unconfigured release build also blocks demo entry. Development defaults to local mode; explicit local/pilot builds remain available for fictional data.
- Backend setting strings are labelled as configuration only, not production readiness.
- Athlete access requires ownership or an active assignment with a matching staff role. Admin status alone grants no athlete access. Optional required staff scope prevents a coach assignment from satisfying medical access. This helper expects trusted server context and still requires separate action and consent checks.
- The prepared HTTP adapter rejects requests without a token before sending them.
- Node tests cover runtime defaults, cross-athlete access, role removal, inactive assignments, scope separation, multi-role users and missing authentication. CI runs these before the build.

## Existing environment

The user-selected Supabase project `nlnyvrbejaqzdbekwlgi` is active. A read-only inspection found no tables in its `public` schema. No project, table, policy, account, permission or deployment was changed.

## Limits and next work

Validation: all seven foundation tests passed; TypeScript and Vite production build passed using the available cached dependencies (TypeScript 5.9.3, Vite 8.0.13, React 19.2.6). A fresh dependency install and browser UI test were not performed. The repository still uses `latest` dependency ranges without a lockfile, so clean-install reproducibility remains separate work.

This is a fail-closed boundary for the existing prototype, not a production authentication integration. The current product still uses browser-local storage and simulated roles in explicit demo modes. The API helper is not yet connected to the UI or a live server. A frontend mode gate is not a database security policy.

Next: prepare the actual Supabase identity/profile adapter and athlete/staff assignment schema with row policies and tests for two independent users, a linked professional and revoked access. Reuse the existing project; apply schema and access changes only after explicit approval. Preserve medical consent boundaries and keep demo records out of the live database.

The GitHub app and the earlier Sites app are distinct source trees. This patch changes only the GitHub source snapshot, with no replacement of the live Sites application.
