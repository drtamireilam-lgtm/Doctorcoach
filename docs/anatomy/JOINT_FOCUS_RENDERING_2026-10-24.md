# Joint-region rendering and camera continuation

Base: latest deployed PR42, `47c1536a2a1cc857ab01bb00614c95ebdc23448e`, checked against refreshed remote branches. New work is isolated on `codex/anatomy-joint-focus-20261024`.

## Problem and implementation

Prior software-WebGL measurements were slow, with one public acceptance timeout during a camera click that did not recur on retry. That timeout's cause was never established. A separate concrete rendering issue was found: camera-only joint focus still submitted the large merged static full-body bone batch, including unrelated anatomy.

The new `jointContext()` maps each enabled movement/side to original bone structures and neutral-reference muscles. Every moving bone is included, together with proximal context: humerus for elbow/radioulnar motion; forearm plus hand for wrist; carpal/metacarpal reference for fingers; pelvis/sacrum for hip; femur for knee; lower leg for ankle; foot bones for toes. Unsupported movements have no focused context and fall back to full-body display. Associated muscle references are qualitative, as before; all muscle display stays source-pose-only.

Static rendering batches are partitioned into context and outside-context subsets, without duplicate source vertices, decimation, cuts, retopology, repositioning or altered asset files. Moving groups keep their existing joint hierarchy. Full-body mode renders both subsets; Joint region hides unrelated batches and picking proxies. Layer toggles and neutral muscle-reference rules remain intact. Owned resources are disposed in both modes.

The player adds explicit bilingual Full body / Joint region buttons. Changing scope does not pause, reset or restart playback. Camera framing uses bounds of the entire context, including hidden reference bones when the bone layer is off, instead of cropping to one small phalanx. Local front/back/side view changes retain the local target and distance. Explicit Full body restores the original wide front framing even if body scope is already selected. Unsupported movement selection returns to body scope and framing. Changing supported movement or laterality recalculates context; focused mode reframes the new context.

The original static atlas and existing Curl viewer remain on their prior default paths. The only shared camera refactor is bounds-based focus, retaining single-mesh focus behavior. No models, user records, permissions, remote schemas or medical role settings are changed.

## Measurements and checks

An initial successful actual-source browser comparison for bilateral elbow motion recorded:

| Measurement | Full body | Joint region |
| --- | ---: | ---: |
| Submitted bone triangles | 511,834 | 30,538 |
| Pose updates in sample | 5 | 64 |
| Sample milliseconds | 3015.2 | 3023.3 |
| Approximate updates/s | 1.7 | 21.2 |

This is a 94% reduction in submitted triangles for that movement and view, using identical source geometry. It is a software-WebGL sample, not a phone benchmark, guaranteed FPS or proof that the earlier timeout is fixed. Full-body rendering still has its original high triangle cost. A preceding cold/full-body sample failed the existing minimum update-count check; warm-up now waits for actual animation progress before timing, and the minimum check remains.

Eight source/unit tests cover the complete movement inventory and sides, original buffer preservation, local context inclusion/exclusion, proximal reference, unchanged pose on scope changes, full-mode vertex restoration, layer and muscle guards, plus prior source-plane/rotation tests. Browser coverage checks actual renderer triangle counts, automatic loop/play/pause, scope changes during playback and while paused, local camera behavior, repeated Full body action, unsupported fallback, neutral layers, Hebrew/mobile and WebGL/atlas cleanup. Full-app English/Hebrew checks exercise focused scope with real application CSS/routes. Independent review found the repeated Full body framing issue; an actual-canvas RED test reproduced it before correction.

Final exact-head CI, release version and live LAB acceptance are recorded in the PR/release evidence after execution; this design report does not assert unexecuted checks. No anatomical correctness or physical-phone sign-off follows from these renderer tests.

## Remaining scope

The catalogue remains **30 provisional bone demonstrations and 31 blocked compound movements**. This continuation improves rendering and framing; it does not add physiological movements, validate joint landmarks/contact, simulate patellar tracking, skin muscles, measure activation or enable loaded exercises. Original-geometry landmark/attachment validation and actual iPhone/Android load, memory, frame-time and interaction measurements are still needed.
