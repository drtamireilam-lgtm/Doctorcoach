# Whole-body detail implementation plan

Goal: add detailed anatomy across the whole body and reversible exploration.
Spec: docs/superpowers/specs/2026-11-16-whole-body-detail.md

1. Write failing source-admission/conversion tests: checksum, 634 unique structures, exact binary retention, per-mesh materials, source layers, no guessed canonical matches. Implement pinned build preparation and local downloadable attribution/license. Verify reproducible output.
2. Add the detailed model, routing mode and source-preserving vertex-colour rendering. Add superficial/deep toggles, reversible hide undo, and exact canonical exercise context. Preserve old regional/motion workflows. Add behavioural tests.
3. Typecheck, full suite, isolated build and browser CI. Review actual new-model rendering/controls plus existing workflows. Fix only reproduced failures. Independent source/code review. Publish PR and deploy verified candidate to isolated LAB under existing owner authorization; report limitations.

Review focus: quantized source root scale, cloned shared materials, source tint multiplied by selection colours, unknown names mapped to incorrect learning cards, old model deep-link/region callbacks, hidden-state restoration, damaged downloaded asset and reproducible build. No schema/auth/provider writes.
