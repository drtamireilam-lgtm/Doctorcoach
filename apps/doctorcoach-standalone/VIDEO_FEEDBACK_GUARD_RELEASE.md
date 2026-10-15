# Video feedback persistence guards

Feedback writes now check the active care connection, captured staff role,
current required and media consents, and the ready review asset's owner/kind
inside the INSERT. Connection/scope/role/consent loss returns 403; unavailable
assets return 404. All existing non-coordinator care staff remain supported.

New feedback stores server-derived author_id. Exact retries require the same
author, asset and content; conflicts return 409 without changing the winner.
Names cannot establish identity. Authorization is rechecked before considering
a duplicate successful. The new nullable author_id migration is schema-only;
legacy feedback remains visible with no invented author or silent retry match.

Verification: TypeScript and all 274 tests passed. Twenty new cases cover
revocation, scope/role changes, required/media consent withdrawal and revision,
same-time consent ordering, asset deletion/status/kind/owner changes, exact
and concurrent retries, cross-author/asset conflicts, same-name authors and
legacy rows. Generated SQL, journal and snapshot were inspected; only one
nullable column is added. Production build and hosted migration run during
publication. Browser/mobile and actual account checks remain outstanding.
