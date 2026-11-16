# Anatomy tissue rendering implementation plan

Goal: reduce the clay-like appearance of the existing licensed anatomy meshes.
Approach: retain source geometry and normals; tune nonmetallic tissue materials, warm muscle and ivory bone colors, balanced key/fill/rim lighting and filmic tone mapping. No fabricated fibers, tendon geometry, new dependencies, database changes or medical claims.

- [ ] Introduce presentation-only material/lighting helpers and connect the atlas renderer. Preserve selection, layers, joint motion and source asset hashes.
- [ ] Run existing anatomy regressions, typecheck/build and real GLB browser controls; inspect rendered front/back regional and full-body screenshots. Compare baseline and candidate.
- [ ] Publish a reviewable branch/PR, verify CI and deploy the verified candidate to isolated LAB using the existing build trigger. Record visual/device limitations.

Review focus: source materials may be shared; selection must not recolor neighboring muscles. Preserve texture maps and geometry. No postprocessing or per-frame animation cost. Bone-motion adapters retain their own colors. Phone performance and clinical validation are separate.
