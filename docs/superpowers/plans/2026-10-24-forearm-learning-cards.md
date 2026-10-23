# Posterior forearm learning cards implementation plan

Goal: Add six source-checked bilingual learning cards to existing catalog entries, reducing missing cards from 38 to 32. Base: PR #35 at `80a9415`; work is stacked on its validated browser infrastructure, without merging it.

Selected slugs: `extensor-digitorum`, `extensor-digiti-minimi`, `extensor-indicis`, `abductor-pollicis-longus`, `extensor-pollicis-brevis`, `extensor-pollicis-longus`.

Approach: Complete content first using existing card schema and navigation, with explicit pending clinical review. Licensed geometry acquisition is a separate task; neither catalog membership nor a new card creates a mesh. Primary references are the six University of Washington muscle-atlas pages and the UAMS upper-limb muscle table. No protected illustrations are copied. Preserve canonical IDs, existing cards, exercise links, manifests and permissions.

Implementation:

- [ ] Add a failing content regression test requiring all six cards, bilingual fields, per-card references, pending review metadata, posterior forearm region and absence of fabricated exercise/mesh links.
- [ ] Append six concise original summaries to `lib/prepared/anatomy-learning.json`, with empty exercise links and dated references. Distinguish EPB proximal-phalanx/MCP action from EPL distal-phalanx/IP action, and APL metacarpal/CMC action. UW's EPB action line names CMC; UAMS and Washington University identify MCP. Record the discrepancy rather than copying it.
- [ ] Type the existing optional review metadata in `lib/anatomy-learning.ts`; expose the explicit pending status in the expanded learning card through bilingual labels.
- [ ] Extend the real application browser harness to visit each new card in both languages, check complete content/review/source/no-geometry boundaries, and preserve existing navigation tests.
- [ ] Run targeted tests, TypeScript, full regression and the existing isolated CI/browser gates. Review the diff, commit and open a draft PR against the PR #35 branch.

Safety: no main merge, deployment, real data access, medical permissions, new geometry, clinical approval, exercise prescription or fabricated contraction/stretch relationships. No new dependencies.

Review focus: exact canonical identities, EPB/EPL/APL joint distinction, pinning valid sources instead of source existence alone, HE/EN parity, explicit absence of missing geometry, and unchanged old relationships. Clinician approval remains pending.
