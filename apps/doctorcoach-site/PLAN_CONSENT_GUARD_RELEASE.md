# Independent program consent guards and guidance

Self-program upserts and template inserts now check required current-revision
terms/privacy/health/team consent before and inside SQL persistence. Post-write
denials distinguish missing consent with the actionable questionnaire message.
Owner plan history and exercise removal remain available after withdrawal when
self entitlement permits removal. Coached editing restrictions remain intact.

Required-consent errors direct users to the questionnaire in My File and state
that existing information is retained. Generic 403 screens use a neutral access
heading suitable for trainee consent failures and staff permission denials.
No schema migration or new external operation.

Verification: nine of ten baseline cases failed before the fix. All 577 tests
and TypeScript pass. Cases cover four consent withdrawals at upsert/template
persistence, old accepted revisions, unchanged plan on rejection and owner
read/removal after withdrawal. Production build/package runs through Sites.
Browser/live account journeys and visual message verification remain outstanding.
