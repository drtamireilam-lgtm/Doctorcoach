# Success-story consent and version read guards

Public and management lists now validate every captured story's version and
current publication consent in one final SQL read. Public stories also require
current publication. Revocation, edits, deletion or publication changes discard
the response with 409 and a refresh message. Internal versions are omitted from
the public DTO; personal owner history remains accessible after withdrawal.

The shared resource state now clears cached public/management story content on
409, so a stale previous response is not retained in the story grid. Other
resource conflicts and private owner story history keep existing behavior.
No schema or external publication operation was added.

Verification: seven of nine story cases failed before the fix. Ten new cases
cover consent/publication/version/deletion, personal history, public DTO and
cache handling. All 517 tests and TypeScript pass. Production build/package
runs through Sites. Live browser/account QA remains open. Already delivered
content cannot be retroactively recalled by these response guards.
