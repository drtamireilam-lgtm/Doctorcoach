# Import unresolved-row review follow-up

Goal: classify all 85 unassigned development-corpus rows and make manual review actionable without guessing variants. Continue existing isolated task checkout and draft PR #53; no new environment or deployment. User approved this exact follow-up in chat.

Design: preserve the conservative matcher and all 106 existing assignments. Add a separate review-only diagnostic helper and localized UI component. Curated candidate IDs are suggestions only, filtered to the active catalog. Missing library variants have an explicit explanation and no misleading near-variant shortcuts. Empty names and headings are retained for explicit coach review, never silently dropped. Do not add aliases when the remaining source names cannot safely identify an existing entry. Unknown names use existing suggestions. Reuse actual importer component in a local browser harness with synthetic input and isolated HTTP fixtures; this is not live LAB validation.

Tasks:
- [x] Add failing helper tests for all observed unresolved input classes, safe candidate lists, unknown fallback and filtered custom catalogs; implement pure helper.
- [x] Add localized component tests and wire into existing importer, replacing misleading fuzzy buttons for known unresolved cases.
- [x] Run actual importer in local browser at desktop/mobile sizes; upload synthetic CSV/XLSX/text-PDF, review/manual selection/skip, draft acceptance and proposal download. Record limits.
- [x] Classify actual 191-row corpus privately; commit aggregate counts only. Run full tests, typecheck, lint, build and matcher retention check.
- [ ] Independent review, commit/push with expected-head lease, update PR and verify new CI.

Review focus: no blank-name row silently removed; no machine/angle/grip/posture inferred; unknown names preserve fallback suggestions; HE/EN diagnostics follow language; synthetic browser checks do not imply authenticated live saving/assignment.

Progress: 106/191 automatic targets retained, all 85 unassigned rows classified, zero new aliases due insufficient variant evidence. Independent reviewer fixed custom-catalog wording and harness row-filter assertion. 12 local browser flows pass; full suite/build verification is recorded in recognition-3/UNRESOLVED_REVIEW.md. Remote push/CI pending.
