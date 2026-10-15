# DoctorCoach — Multi-coach permission audit (2026-10-15)

Scope: source review plus executed synthetic regression tests on an isolated development checkout. No production data accessed or changed.

## Confirmed existing guards
- `lib/care-store.ts` uses `care_connections` keyed by client and staff email, active flag, and scope to limit roster and client file access.
- Medical access requires clinician role plus `medical_access`; nutrition requires dietitian role plus `nutrition_access`.
- Coordinators cannot open clinical files; program authorship is separately guarded.
- `lib/staff.ts` uses server-side configured email allowlist for administrative authorization.
- `standalone/auth-store.ts` creates new accounts only when `allowNewAccounts` is enabled, and does not map existing owners by email.

## Risks requiring tests before enabling public enrollment / external coaches
1. **Staff role trust and lifecycle**: `careStore.staffFor` grants the role recorded in `care_staff` to any authenticated account with the matching email. Verify that verified provider email is required and staff role changes/revocations immediately invalidate access; external coach onboarding must never auto-create staff roles.
2. **Cross-coach isolation**: Test coach A cannot read, write, assign programs to, or access videos of coach B's clients. Include revoked and expired connections, and a client assigned to two coaches.
3. **Medical data separation**: Test coach and dietitian responses omit `medical_json` and medical notes even with an active care connection; clinician access requires both role and explicit medical grant. Test every media and notes endpoint, not only the care bundle.
4. **Role escalation**: Test a self-registered trainee cannot call `saveStaff`, impersonate a clinician, or create a care connection without an authorized invitation. Verify admins alone can grant coach roles and only configured owner can grant clinician role.
5. **Tenant boundaries**: The existing model is connection-based, not an explicit coach-organization tenant. Before nationwide rollout, document ownership of coach rosters, payments, referrals and exports; enforce tenant IDs server-side if multiple organizations are introduced.
6. **Race/revocation**: Verify permission rechecks at write time, after invitation acceptance, and on private media delivery. Revoke while a request is in flight.
7. **Registration**: `DC_NEW_ACCOUNTS_ENABLED` remains off in staging until reservation/import and regression tests pass; initial role must be trainee, never coach/clinician/admin based on client input.

## Release gates
- Run all auth, registration, linking, care permissions, private media, training and first-workout tests in an isolated environment.
- Add negative authorization tests for each API route, with two independent coach identities and two trainees.
- Verify old D1/R2 backups and rollback plan; no production migrations or deployment until approved.

## Execution update — 15 October 2026

- The original 3 multi-coach tests passed before changes.
- Added 2 regressions: clinician role AND explicit medical grant are required; two consented coaches can share a client and revoking one preserves the other and the owner.
- All 5 multi-coach tests passed. The complete PR #9 Node suite passed: **1,086 tests, 0 failed, 0 skipped**.
- Combined PR #7 + #8 + #9 verification is recorded in `docs/verification-2026-10-15.md`.
- This does not assert every API route was individually audited or that real production/provider/browser validation is complete.
