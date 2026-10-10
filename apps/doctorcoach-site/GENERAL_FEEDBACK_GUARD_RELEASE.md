# General feedback submission guards

General suggestions and contextual educational feedback now enforce the existing
20-per-owner hourly limit inside the INSERT. Parallel submissions cannot exceed
the cap, and other owners retain independent capacity.

Exact retries compare owner, context, category and content. They succeed even
at capacity without updating the existing response, state, version or timestamps.
Foreign-owner ID collisions return 403; changed same-owner payloads return 409;
new requests above the cap return 429. No conflict overwrites a saved record.
The existing administrator review/version policy remains intact. No schema or
navigation changes are introduced.

Verification: TypeScript and all 309 tests passed. Twelve new cases cover parallel
capacity, a competing twentieth submission, exact retries after review, changed
fields, foreign and same-owner collisions, older submissions, validation and
admin/stale review isolation. Production build runs during publication.
Browser/mobile and actual account checks remain outstanding.
