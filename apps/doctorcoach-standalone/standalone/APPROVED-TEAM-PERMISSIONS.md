# Owner-approved team permissions — 2026-10-16

Requested by the owner in this development conversation:

| Person | Requested access |
| --- | --- |
| Tamir | Owner administrator and clinician; full management access |
| Shira | Coach; only assigned trainees' training; personal program authoring |
| Nadav | Coach; only assigned trainees' training; personal program authoring |
| Alon | Personal program authoring; own records only; no staff role |

Coach access must not include medical information, staff administration, or another coach's trainees. Personal program authoring must not broaden access to other users. Existing consent, revocation, and medical-access guards remain in force.

## Verification and rollout boundary

The existing staff-personal-access and multicoach-isolation tests cover these capabilities. The combined approved-team-permissions regression additionally checks that activating personal training for both coaches does not widen their assigned rosters or medical permissions, and that a personal-only account remains a non-staff account.

These tests use synthetic identities only. No real account is assigned a role by name. The verified login addresses/principal IDs for Shira, Nadav, and Alon and their intended trainee assignments are still required before account-level setup. Tamir has used two email addresses in Staging; neither is silently added to administrator configuration by this change.

No pilot/production data, consent, role, configuration, or deployment is changed. Full source export and verified restore remain pending. A global clinical consent bypass is not implemented.
