# Full LAB audit and integration plan

Goal: integrate already developed Calendar and management repairs with the deployed Premium Home, then verify all requested subsystems without changing real-user data.
Architecture: preserve PR58 content; apply the existing PR54→57 content delta with its migrations and feature-off default. D1 holds application records; Supabase supplies identity and session validation.
Spec: user request in this session, 27 October 2026.

Constraints: LAB only; no main merge, Production deployment, secrets exposure, real-user grants or deletion. No live Calendar writes without explicit approval. Verify remote schema and backup before any migration-dependent rollout.

Review focus: old D1 schema; feature-off authorization compatibility; overlapping page/runtime edits; historical false Calendar receipts; unchanged stored appearance.

- [x] Inventory remote PRs/branches/CI and local integration overlaps.
- [x] Integrate existing PR57 (including55/56) with PR58 in isolated audit branch. Preserve18 themes and both Home/navigation paths. Run Calendar tests before and after integration where possible.
- [x] Run complete app/root suites, types, builds and isolated target checks. Run built Worker HTTP with synthetic providers and all available browser workflows (Calendar, management, OAuth, import, cardio, Premium).
- [x] Inspect live public LAB and available Cloudflare/Supabase access read-only. Record identity/schema/provider blockers; do not infer from local tests.
- [ ] Review final diff, publish draft integration PR against existing LAB branch, verify CI. Deploy only if remote schema and backup prerequisites can actually be verified.
- [ ] Produce Hebrew evidence report with verified results, open gates and3 priorities.

Execution ruling: the user explicitly requests uninterrupted autonomous execution; proceed with native execution without a plan approval pause. Existing tested systems are integrated rather than reimplemented.

Review: independent reviewer found missing anatomy CI condition (fixed), and mandatory0060 old-schema failure (kept as deployment block). Local1690 tests,16 root tests, builds/types, Worker and available requested browser workflows passed. Auth entrypoint harness initially matched hidden retained onboarding DOM; corrected to visible links, all12 pass. No real Calendarwrite/realusergrant.
