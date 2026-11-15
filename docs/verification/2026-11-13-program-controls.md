# Program rest and ordering

Coaches can drag a dedicated handle to place an occurrence before another in the same day/section. Existing arrow controls remain for keyboard and touch; repeated exercises use occurrence IDs. The drag action only changes the private draft and follows existing draft/version/publish authorization.

Optional restSeconds accepts integer0–1800, null clears, absence preserves legacy unspecified behavior. Migration0063 adds nullable program_items.rest_seconds with validation. Coach JSON drafts, assigned versions and session snapshots retain it; no historical JSON is rewritten. Apply0061,0062,0063 in order only after separate authorized environment review. Local tests apply them to disposable databases only.

Importer recognizes Hebrew/English rest headers, explicit seconds/minutes and mm:ss. Header units are respected for bare minute quantities. Ambiguous ranges require manual correction; raw source text remains preserved. Program editor and complete prescription display include rest. No recommendation-engine changes or new dependencies.

Validation evidence is recorded in the final delivery report; use scripts/program-controls-browser.mjs for actual ProgramBuilder native drag, keyboard movement, rest editing, auto-save readback and overflow checks in HE/EN320/390/430/768/1363, using disposable SQLite and intercepted HTTP only. Native mobile drag is not assumed; arrows are the supported touch alternative. No native iPhone/Safari acceptance is claimed.

Local evidence: aggregate1845/1845 passed before the final template/review extension;20/20 affected checks passed after it. Final production build, typecheck and built Worker smoke passed. Actual builder10/10 HE/EN five-width native-drag/keyboard/rest/SQLite save-readback flows passed with zero browser errors and no horizontal overflow. Independent review found and verified the minute-header correction; no remaining actionable findings. The native pointer fixture uses instant scroll positioning to avoid measuring coordinates during smooth animation. Import-file acceptance and exact-head CI results are recorded in PR/final report.
