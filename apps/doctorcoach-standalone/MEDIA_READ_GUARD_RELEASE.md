# Media response read guards

Review listings now retain the initial staff role and validate current care
connection/scope/role together with all captured ready assets after feedback
assembly. Owners retain personal video/feedback history after team revocation.
Public demo listings check publication; management checks current staff status.

Individual video metadata validates current permissions, status, publication
when public, and the exact owner/kind/object key/MIME/size. The GET route repeats
this check after storage retrieval, cancels the unread stream on rejection, and
retains private/no-store headers and existing range handling.

Verification: 13 review-list baseline cases reproduced stale access/deletion.
Additional tests cover demo withdrawal, staff management disablement, object
replacement and download confirmation. All 454 tests and TypeScript pass.
No schema change. Permission checks precede response delivery; they do not
revoke bytes already streamed. Actual browsers/live R2 accounts remain untested.
Production packaging is performed by Sites.
