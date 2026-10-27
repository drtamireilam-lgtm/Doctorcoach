# Unified whole-body skeleton implementation plan

Owner-approved priority: pause card completion and create one continuous full-body skeleton before further detail. Base: PR #37 at `10f8075`. Work in a separate branch and draft stacked PR; no merge or deployment.

Approach: use original BodyParts3D 4.0 geometry in its shared coordinate space, with both actual sides rather than mirrored right meshes. Fetch official bone-organ ELEMENTs plus the three sternum components, verify ZIP CRCs and source hashes, deduplicate by ELEMENT, and create a single self-contained GLB with separately selectable named bones. Keep existing regional assets and body navigation intact. This is an anatomically unapproved reference model, not a declaration of complete human anatomy.

1. Audit official IS-A/PART-OF mappings, source geometry bounds, laterality, multi-part hyoid/sesamoids, missing coccyx and auditory ossicles. Preserve explicit exclusions and pending review.
2. Write failing tests requiring the new model, bilateral structures, common scale/axes, exact provenance, no duplicate source geometry and preserved regional inventory.
3. Add a reproducible converter/catalog using the current converter's metres/Y-up transform, without per-bone translation, mirroring or invented joint tissue. Retain all source triangles initially; enforce measured byte/triangle budgets.
4. Add a full-body skeleton mode to the existing atlas viewer, with honest bilingual coverage, correct left/right labels, picking/search/hide/isolate and region navigation. Keep the existing schematic surface mode available and its explicit deep links compatible. Bare learning overview should open the skeleton.
5. Run asset/unit/type/build checks and real browser checks for all-body framing, bilateral picking, side labels, isolation/restoration, reload, mode switching and one owned canvas. Inspect screenshots, review the code independently, push a draft PR and verify exact-commit CI.

Constraints: no main merge, LAB/Production deployment, medical permission or database changes, new medical content cards or fabricated geometry. Source checking, geometric consistency and clinical review are separate statuses. Correct attachments/joint alignment remain subject to clinician review.
