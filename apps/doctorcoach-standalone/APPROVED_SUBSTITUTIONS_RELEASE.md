# Coach-approved substitutions — 2026-10-05

Coaches can optionally choose up to ten alternatives per assigned exercise.
Alternatives must be known, unique and use the prescribed measurement unit.
Old plans without an allowlist still prohibit substitutions in coached mode.

The trainee sees only approved alternatives not already in the current session.
Server authorization uses the stored session allowlist, never client-provided
approvals. Swaps require confirmation, no completed sets, current program access,
medical/intake clearance and the current session version. Existing owner and
revocation checks remain in force. Independent paid-mode swaps are unchanged.

Approved swaps preserve sets, quantity, effort target and RPE/RIR preference,
reset weight and results, and change only the current session. The original
exercise becomes an allowed return option; no unrelated alternative is added.
The coach must choose alternatives appropriate for the preserved prescription.
These options are not automated clinical clearance or equivalent-load advice.

Verification: SQLite-backed regression tests, TypeScript check and hosted build.
Browser/mobile and distinct real-account acceptance checks remain pending because
the required browser QA capability is unavailable. No new database migration or
changes to authentication, staff permissions, subscriptions or site audience.

Next master-plan feature: structured workout days in a coach-assigned program.
Production payment automation, clinical/legal approval and real-user acceptance
remain separate unfinished work. This release does not claim the whole plan is done.
