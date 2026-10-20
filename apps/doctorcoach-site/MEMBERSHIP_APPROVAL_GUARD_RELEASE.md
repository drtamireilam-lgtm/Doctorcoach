# Verified membership approval guards

Membership approval now creates a unique audit receipt only for a still-pending
order/version, unused verified payment reference, no active workout and an
unchanged entitlement snapshot (including mode, assigned program, expiry and
update stamp, or absence of an entitlement). The receipt gates order approval
and entitlement activation in the same D1 transaction. Any statement failure
rolls back order, entitlement and audit together.

Concurrent renewals/plan changes cannot be overwritten using an earlier expiry.
Competing approvals do not extend access twice. Reference reuse returns 409
without granting a second membership. Existing administrator-only explicit
verification and calendar-month extension remain intact. Switching to an
already-paid independent mode also checks active workouts inside its UPDATE.
No schema changes or automatic payment confirmation were added.

Verification: TypeScript and all 322 tests passed. Thirteen new cases cover
workout-start races, expiry/mode/program/deletion/creation changes, competing
approvals, reused references, three rollback failure points, initial entitlement
creation and self-mode switching. Production build runs during publication.
Browser/mobile and live-account/payment verification remain outstanding.
