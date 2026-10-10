# Clinical content-review list authorization

Review records now check current clinician role in their SQL read. A final role
check after hashed catalog assembly rejects responses if the reviewer was
disabled or changed role during loading. Explicit staff rows override configured
clinician fallback. Catalog hashes, existing review states and write guards stay
unchanged. These records are clinical-content review notes, not patient files.

Verification: four of five new cases failed before the fix. All 507 tests and
TypeScript pass after it. Cases cover configured fallback and explicit clinicians,
disablement/role changes, valid catalog hashes and pending states. No migration.
Production build/package runs through Sites; browser/live account QA remains open.

Read-path reconciliation recorded the next source finding: public success-story
consent/publication withdrawal during retrieval. No complete security-audit claim
is made from these focused regressions.
