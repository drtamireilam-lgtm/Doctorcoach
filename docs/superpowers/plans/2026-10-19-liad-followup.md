# DoctorCoach account-navigation follow-up

**Goal:** Complete the approved separation of account settings from More while preserving the existing Liad refactor and all thirteen themes.

**Base:** `stabilize/trainee-ux-liad-20261019` at `5949c00`. The preferred LAB team branch is divergent, older and lacks the full application. Do not merge main or deploy Production.

**Execution:** Inline and continuous, as explicitly requested by the user. No additional design approval requested.

- [x] Fetch remote branches with certificate verification enabled; inspect current code and prior Liad report. No fuller original notes located.
- [x] Observe failing component/navigation tests for separating Settings, persistent shortcut selection and nested account returns.
- [x] Remove Settings from More; add a shared localized header shortcut with 44px minimum target, themed focus and account-page selection. Keep existing guarded `go` navigation.
- [x] Account pages and staff pages do not falsely select More; retain progress under My file. Desktop already used the same selection helper as phone in the freshly fetched base; no second implementation was needed.
- [x] Update tour and English translation; preserve legacy hashes and all features.
- [x] Run root installation/tests/build, full app tests/typecheck/build and review changes. Record environment failures separately from test assertions.
- [ ] Publish a dedicated review branch with CI; LAB deployment only after a fresh valid build and authenticated target inspection.

**Review focus:** account access at narrow widths, draft leave protection, English navigation labels, stale staff access, no writes to real user data. Existing theme tests cover all requested presets and owner-scoped persistence; real browser relogin acceptance still needs a test account and deploy access.
