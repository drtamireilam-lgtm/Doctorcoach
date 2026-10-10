# Legacy workout log persistence guard

The old /api/logs POST remained callable despite the current detailed workout
flow. It checked consent, medical safety and self entitlement before a later
unguarded insert. The new testable store preserves its response shape and
owner-scoped 50-entry history, while the insert atomically checks required
consents, active self entitlement, completed intake and no pending medical review.
The exercise count comes from current nonempty owner plan items in that insert.

No schema change or automatic medical clearance. Owner historical logs remain
readable after consent/entitlement loss. Input pain scores remain integers 0–10.
The shared training guard accepts exactly the plan-mode/program-ID fields it uses.

Verification: all ten new baseline tests failed before the fix. All 527 tests
and TypeScript pass after it. Tests inject entitlement expiration, mode changes,
intake incompletion, medical review creation, plan removal, four consent changes
and owner-scoped count updates immediately before persistence. Production build
runs through Sites; actual browser/live D1 account QA remains outstanding.
