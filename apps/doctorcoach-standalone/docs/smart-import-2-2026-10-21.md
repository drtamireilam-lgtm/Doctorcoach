# Smart Workout Import 2.0 — 21 October 2026

Base: PR #27, commit `63ffebdb3b7bf8475472ed255388e99721b21728`.

## Existing behavior

Bounded local XLSX/CSV/PDF readers, conservative bilingual exercise matching,
explicit coach review, editable prescriptions/day assignments, duplicate
confirmation, source kg/lb and per-side metadata, draft/assignment persistence,
and expandable preview cards were already present. PR #27 reports an earlier
LAB deployment; this session did not independently verify that deployment.

## Implemented

- Combine explicitly selected worksheets in workbook order. Each worksheet's
  days stay independent, with at most seven days. Invalid selected worksheets
  fail with their names; image-only worksheets are not silently imported.
- Keep source worksheet and row coordinates in preview. Distinct source keys
  prevent occurrence ID and React key collisions between worksheets.
- Move individual occurrences up/down within a day without deduplication.
- Recognize Hebrew singular note and update-weight headers. Preserve muscle
  group labels and truncated source-image loads as notes, never numeric loads.
- Add eight verified spelling/equipment/posture aliases. Generic exercise
  descriptions and uncertain variants still require explicit selection.
- Add original-source regression fixtures containing workout table cells only;
  original binary workbooks and embedded images are not committed.

## Tested

- All four original XLSX files were downloaded and read with the actual reader.
  All 82 exercise rows preserve source names, sets, repetitions and order:
  legs 8, A–D 26, grouped Hebrew plan 27, letter-block plan 21.
- Source kg/lb and per-side data checked. Repeated exercises retained.
- Invalid update load `17,17,18,17` blocks finalization. Truncated visible loads
  remain notes. No synthetic replacement was used for original-file inspection.
- Standalone test suite: 1,321 passing; includes import, persistence, security
  and ownership regression tests. Root tests: 10 foundation + 6 PostgreSQL
  ownership/concurrency tests passing. TypeScript and standalone/root builds pass.
- Scoped lint has no errors (one pre-existing unused-parameter warning).
  Full lint remains failing: 63 errors and 95 warnings across the repository.

## Pending / blocked

- No new LAB deployment or live authenticated acceptance in this session.
  Cloudflare credentials and a designated disposable LAB coach/trainee account
  are unavailable. No real accounts or user records were modified.
- Browser responsive checks and iPhone/Android device tests were blocked:
  Playwright is available but Chromium is absent and browser download failed.
  Preview server-rendering tests pass; this is not mobile browser verification.
- End-to-end live save, reassignment, login refresh and workout-history acceptance
  still require the disposable LAB accounts. Local tests are not live proof.
- Existing 30-exercise publish limit and seven-day limit remain unchanged.
- Many original exercise names remain ambiguous or have no exact library match;
  the files are not claimed to be ready for zero-touch import. Muscle groups
  remain notes, not inferred training days. Coach must set days when intended.
- Source program title still defaults to filename and is editable.
- Names such as Legs 1/2, broad squat descriptions, unspecified curl variants,
  cut-off loads, and multiple reported weights require coach decisions.

## Release status

Implemented and locally tested. Not deployed or verified in live LAB.
Pilot readiness remains conditional on the pending live and mobile checks.
No merge to main, Production deployment, database migration or real-data mutation.
