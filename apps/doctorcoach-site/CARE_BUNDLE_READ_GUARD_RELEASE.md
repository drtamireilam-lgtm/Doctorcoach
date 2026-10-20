# Shared care bundle response guards

Fourteen baseline races failed before the fix: connection/scope/role/disablement
changes across clinician, coach and dietitian, and medical/nutrition grant loss
after private notes had been fetched.

Before returning a staff care bundle, a single SQL permission check requires
the captured active role and care connection, plus every clinical/nutrition grant
used to assemble the response. Revocation discards the entire assembled response
with 403. Configured clinicians cannot override explicit inactive/changed roles.

Owners retain their own profile, medical data and shared history after team
revocation. Intended staff field projections and internal-note isolation remain
unchanged. The guard validates response authorization, not a consistent snapshot
of every clinical value. No schema or navigation changes were made.

Verification: TypeScript and all 395 tests passed, including sixteen new cases
covering baseline races, valid role projections and owner retention. The earlier
dashboard guard changes are included in this publication after interrupted
publication was resumed. Production build runs during packaging. Browser/mobile
and live-account verification remain outstanding.
