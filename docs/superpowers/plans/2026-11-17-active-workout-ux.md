# Active workout UX continuation
User authorized implementing the five agreed improvements: fewer taps/scrolling, target versus actual effort, decimal next load, set/exercise navigation and truthful save/resume status.

Scope: presentation and draft-entry handling on exact deployed LAB union; existing effort/load policy, permission boundaries, owner-scoped recovery, performed dates and workout persistence remain authoritative. No schema or real-account writes.

Implementation: compact saved-set readback with explicit editing (keep inputs/effects mounted), keyboard progression across three entry fields, blank numeric fields remain null, concise load recommendation with expandable calculation details, correct global pending/save state, local next-set action.

Validation: RED/GREEN blank field and completed editing tests; existing persistence, recovery and load regressions; TypeScript/build/full suite; existing synthetic real-Page workout browser at HE/EN320/390/430/768 with added checks. One fresh final review. Publish scoped PR and release tested union to isolated LAB under existing authorization; preserve all bindings and rollback. Physical iPhone and real authenticated acceptance are not implied.

Task ledger: implementation in progress. Existing mechanisms reused; no new recommendation policy.

Review: 0 Critical, 3 Important. Fixed in one RED/GREEN pass: saved per-side basis, visible saved pain/withheld-load reason, and focus handoff after delayed cache acknowledgement. New component regression tests failed before fixes. No deferred minors.

Local browser preflight was blocked by Chromium process singleton socket restrictions; no application browser assertion ran locally. Use existing GitHub CI for runtime acceptance.
