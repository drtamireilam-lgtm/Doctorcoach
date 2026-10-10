# Standalone team response authorization

Client listing SQL now enforces the captured active staff role and care scope.
After retrieval, one SQL snapshot validates that role and all captured client
connections. Standalone roster retrieval rechecks the viewer after assembly.
The team GET route uses a combined overview that performs a final role/client
check after roster reads, rejecting stale responses with 403.

Coordinator views remain empty of clinical clients. Configured clinician
fallback respects explicit disabled staff rows. Client names, goals and pending
check-in/video counts are preserved for valid access. No schema changes.

Verification: 18 of 19 new cases failed before the fix. All 502 regression tests
and TypeScript pass. Cases cover clinician/coach/dietitian client reads,
connection/scope/role/disablement, standalone roster, overview races and valid
coordinator/count/admin projections. Production build/package runs through Sites.
Browser/live account QA remains open. These checks validate authorization at
response assembly, not a transactional snapshot of all roster/client fields.
