# Membership request persistence guards

Requests now insert only against the captured enabled catalog version, price,
payment URL and instructions, with no active workout and no other open order.
Parallel requests cannot silently succeed for an ID that was never inserted.
The existing one-pending-order constraint remains in place.

Exact retries require the same owner, email, expected price and catalog version.
They preserve the original snapshot and reported/approved state even after later
catalog closure or changes. Foreign IDs return 403; changed payloads or another
pending request return 409. Request creation still never grants paid access.

A generated schema-only migration adds nullable catalog_version. Legacy orders
remain visible and processable; their unknown catalog version is not invented
and cannot establish an exact creation retry. No data backfill was performed.

Verification: TypeScript and all 338 tests passed. Sixteen new cases cover five
catalog races, workout start, foreign and identical ID collisions, parallel/open
order limits, catalog closure/report retries, changed price/version/email,
legacy rows, cancellation and access isolation. SQL, journal and nullable-column
snapshot were inspected. Build and hosted migration run during publication.
Browser/mobile and live account/payment checks remain outstanding.
