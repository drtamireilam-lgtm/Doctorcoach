# Premium UI 3 release QA implementation plan

Goal: verify PR 63 on PR 62 and repair demonstrated regressions without deployment or live data changes.

Architecture: preserve application components and permission guards; run existing synthetic unit, Worker and browser fixtures. Correct CI selection so Premium UI changes exercise the existing integration workflows.

- [x] Audit all 34 changed paths and verify base ancestry, CI logs and test selection.
- [x] Reproduce missing browser gates with push/PR event cases, correct only the relevant workflow predicates, rerun regression cases.
- [x] Run standalone tests, TypeScript, isolated build, Worker smoke and browser suites where the environment permits; distinguish download/environment blockers.
- [x] Inspect real rendered screenshots at seven widths in Hebrew and English, plus light/dark and staff workflows.
- [x] Update stale verification documentation with exact evidence and remaining LAB gates; commit/push a reviewable fix without merging.

Constraints: no deployment, remote migration, real Calendar writes, user data changes or permission relaxation. Existing LAB database schema and backup claims require fresh read-only evidence; otherwise mark Not Tested/Blocked.

Local execution and evidence are complete. GitHub CI remains queued; LAB remote verification remains blocked. No merge or deployment.
