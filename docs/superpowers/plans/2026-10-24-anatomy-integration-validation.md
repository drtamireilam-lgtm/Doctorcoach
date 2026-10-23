# Anatomy integration validation implementation plan

**Goal:** Close the verified gap where the integrated anatomy candidate passes CI while both anatomy browser suites are skipped.

**Architecture:** Retain the existing application, model assets, browser harnesses and CI jobs. Expand browser selection to anatomy integration pushes and pull requests targeting anatomy branches. Add real UI coverage for the integrated stretch links in both languages. Use the already combined PR #34 branch as the base; do not repeat its integrations.

**Tech stack:** GitHub Actions, Node 24, pnpm 11.25.0, Playwright, existing React/Vite application.

**Authorization:** The owner explicitly requested the first safe development task in a separate branch, tests and a PR. No merge or deployment is authorized.

## Constraints

- No main merge, LAB/Production deployment, medical content change, permission change or remote data writes.
- Preserve the current standalone atlas and divergent root application.
- Distinguish historical evidence, fresh local checks and fresh GitHub checks.

## Task 1

- [x] Read the complete master brief, requested completion audit, branch histories, PRs and exact-head CI steps.
- [x] Confirm the defect: run 39841196372 passed while all three browser setup/test steps were skipped; run 39804083398 executed them successfully.
- [ ] Expand `.github/workflows/ci.yml` triggers and browser step conditions for anatomy integration and anatomy-targeting PRs.
- [ ] Extend `apps/doctorcoach-standalone/scripts/anatomy/browser-smoke.mjs` with English/Hebrew stretch-to-muscle-to-stretch navigation checks, reload persistence and absence of contraction labels on stretch links.
- [ ] Record exact model/card/catalog/link inventory, source/review/laterality boundaries, live public asset hashes and integration recommendations in `docs/anatomy/PROJECT_AUDIT_2026-10-24.md`.
- [ ] Run existing tests, TypeScript, isolated build/preflight and browser suites where the local environment supports them; report every failure or block.
- [ ] Review the scoped diff, commit, push and open a PR against `integration/anatomy-rehab-stretch-20261022`; inspect its CI without deploying.

## Review focus

Check push versus pull-request contexts (including synthetic merge refs), unrelated branches retaining their current checks, both languages in stretch UI, no exercise IDs/medical data changed, and no deployment steps introduced.
