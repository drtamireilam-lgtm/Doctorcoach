# Medical document flow verification — 2026-10-11

20 focused automated document tests passed, including three new integrated service-flow tests with synthetic PDF bytes, SQLite migration-backed metadata and a memory-backed object store. Existing tests verify owner/doctor/coach/foreign-user isolation, revoked grants/consents, archival and restoration, deletion requests, concurrent lifecycle changes and rollback.

New flow tests verify exact uploaded bytes remain intact after archive/restore; a revoked doctor's captured permission is rejected; deletion requests prevent reads but preserve the object; revocation during storage write removes the rejected object; and duplicate uploads delete only their own retry object, preserving the committed original.

These are service integration tests, not browser, HTTP route or production R2 acceptance tests. No real patient records, account credentials, production writes or permanent deletion were used. Browser/phone and real-account acceptance cannot run here because the supported managed browser plugin is unavailable.

Pending acceptance: real-account owner upload/download, allowed clinician download, denied coach/foreign-user download, grant withdrawal, archive/restore/deletion request, Hebrew/English and phone interaction. Malware scanning is not implemented or certified by file signature validation. Archival restoration is not backup recovery; independent backup restore and retention policy validation remain pending.
