# Anterior forearm learning cards implementation plan

Goal: Complete four existing catalog entries for flexor digitorum superficialis, flexor digitorum profundus, flexor pollicis longus and palmaris longus. Authored cards 104 → 108; missing cards 32 → 28. Base PR #36 at `a7e1e62`; create a stacked PR without merging.

Architecture: append content to the existing prepared JSON and reuse the existing bilingual card, source list, pending-review notice and missing-geometry behavior. No new UI or schema is needed. Use the four individual University of Washington muscle pages and UAMS upper-limb table checked on 24 October 2026. Do not copy copyrighted illustrations.

- [ ] Add regression tests for bilingual complete fields, canonical IDs, sources/pending review, no invented exercise links/meshes, FDS middle phalanx/PIP versus FDP distal phalanx/DIP, FPL thumb IP and FDP median-AIN digits 2–3 versus ulnar digits 4–5.
- [ ] Run tests and observe missing-card failures before adding content.
- [ ] Add four original referenced cards with front view, empty links and dated clinical-review-pending metadata. Avoid conflicting precise origin fractions in source tables; summarize the supported proximal ulnar attachment.
- [ ] Extend the existing browser loop from six to ten unmodeled forearm cards in both languages, retaining review/source/reload/geometry/no-exercise/RTL checks.
- [ ] Run targeted tests, TypeScript, full CI, isolated build/preflight, viewer/full-app browser suites and synthetic authorization checks; compare all 104 old cards unchanged.
- [ ] Obtain an independent code review and create a draft PR against `codex/anatomy-forearm-learning-cards-20261024`. Record executed evidence in the PR.

Constraints: no main merge, deployment, remote data changes, permission changes, new dependencies, geometry, exercise prescriptions or clinical sign-off. Source checking is distinct from clinical approval. Review focus: digit-specific nerves, correct joint/attachment distinctions in both languages, preserving the previous 104 cards and existing canonical exercise relationships.
