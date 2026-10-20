# Staff dashboard response guards

Twelve baseline regression cases failed before the fix: connection/scope changes
across four staff roles, medical-grant/role/disablement changes after clinical
fetches, and coordinator contact access through the wrong connection scope.

Dashboard clients now require coordinator scope for coordinators and care scope
for other staff. Before returning, one SQL read checks the captured active role
and all current connection grants. Missing or changed client connections, scope,
medical/nutrition grants, or captured foreign-thread access reject the entire
response with 403. It cannot return a partly stale clinical/client snapshot.
Configured clinician fallback never overrides explicit inactive/changed roles.

Intended medical, coaching, nutrition and scheduling fields remain unchanged.
Administrator-only accounts retain administrative operations without clinical
client access. This is response authorization, not a consistent snapshot of
every clinical value; unrelated data edits can still occur during retrieval.

Verification: TypeScript and all 379 tests passed. Sixteen new cases cover the
baseline failures, valid role projections/unread counts, nutrition grant loss,
multi-client rejection and admin-only isolation. No schema changes. Production
build runs during publication. Browser/mobile and live-account checks remain
outstanding. Care bundle and standalone thread assembly are next audit items.
