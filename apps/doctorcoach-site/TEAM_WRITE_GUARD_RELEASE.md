# Atomic team messages and professional notes

Reproduced message and note writes after concurrent revocation using temporary
copies of the pre-change stores. Four baseline test groups failed; the fixed
stores pass the regression cases. Temporary baseline files were removed.

Message inserts now check the current active recipient/author connection, scope,
role and relevant medical/nutrition grant inside the SQL write. Clinical channels
also require current required consent. Owner messages require a currently
available authorized recipient, not just an earlier recipient snapshot.
Scheduling retains its coordinator connection/role checks without requiring
health consent. Exact retries and concurrent ID collisions compare stored author,
client, channel and content; mismatches return 409 rather than false success.

Professional notes check author connection/role/grant, consent and any mentioned
recipient inside the insert. Existing training-note authors remain permitted
active non-coordinator care staff. Exact retries compare author, client, kind,
content, sharing state and mention. No blocked insert changes existing content.

Staff read markers also check current channel access at write time. Owners retain
their own conversation history/read markers after recipient revocation.
Configured clinician fallback is limited to missing explicit staff rows;
disabled/changed-role rows override it.

Verification: TypeScript and all 180 tests passed. Seven new groups cover staff
and trainee races across four channels, scope/grant/role/active-state changes,
clinical consent withdrawal, author/mention note races, scheduling, retries,
cross-author conflicts, read-marker revocation and concurrent ID collisions.
Production build runs during publication. Browser and live-account checks
remain unverified.

Boundary: read queries and other domain writes need separate review. No schema,
notification delivery, clinical decision or consent-screen changes.
