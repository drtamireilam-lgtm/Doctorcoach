# Wellness bundle response authorization

Before returning assembled rehabilitation/nutrition records and return-plan
history, staff responses now check current connection, care scope, captured
role and any medical/nutrition grant used in the response. The same SQL check
validates current assessment team-sharing when nutrition summaries rely on it.
Permission loss discards the response with 403 and requests a refresh.

Owners retain personal history after team access or sharing withdrawal. Valid
role projections and nutrition isolation are unchanged. No schema migration or
automatic clinical decision was added. This is a response permission check,
not a transactionally consistent snapshot of every underlying record.

Verification: 16 of 18 new regression cases failed before the fix; all 434
regression tests and TypeScript pass after it. Production build/package is run
through Sites. Actual browser journeys and live D1/R2 accounts remain unverified.
