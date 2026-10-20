# Standalone thread metadata read guard

Thread summaries now enforce current channel permissions in statistics SQL and
validate all captured foreign threads against one final role/connection/grant
snapshot before returning. Losing access discards the response with 403.
Explicit disabled staff records override configured clinician fallback.

Medical and nutrition recipients must have care scope as well as their grant.
Owners retain historical timestamps and unread counts after recipient revocation;
channel availability is refreshed at the final permission check.

Verification: 20 of 21 new regression cases failed before the change. All 416
tests and TypeScript now pass. Tests cover all four channels, connection/scope,
role/disablement, clinical grants, valid counts and owner history. No schema
change. This validates response authorization, not a transactionally consistent
snapshot of all messages. Actual browser journeys and live account behavior
remain unverified. Production packaging is performed by the Sites workflow.
