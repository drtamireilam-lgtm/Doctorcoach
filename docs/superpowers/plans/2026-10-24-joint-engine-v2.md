# Joint engine 2.0 implementation plan

> Execute inline with superpowers:executing-plans; independent whole-branch review.

**User specification:** Full Body Joint Animation Engine 2.0, attached text read in full. User explicitly requests autonomous implementation without confirmation between stages. Work on dedicated branch from latest PR40 (`5300849`), preserve atlas/assets/data/permissions, LAB only after checks.

**Architecture:** Keep existing curl and static atlas intact. Add a generic source-bound movement catalogue, a per-instance hierarchical bone rig and one reusable bilingual joint player accessible from the atlas. Definitions describe laterality, channels, duration, source pose, conservative demonstration excursion, physiological-reference provenance and unresolved calibration. Same definitions compose synchronized channels later. Original muscles remain neutral-only until attachment/skin data exist.

**Ruling:** Rigid approximation can demonstrate uncomplicated bone motion, but cannot establish clinical anatomical accuracy. Do not fabricate clinically validated pivots, numerical physiological ROM or muscle skin weights from bounding boxes. Expose pending calibration for enabled prototypes, and explicit reasons for blocked compound movements. The requested comprehensive validated library is not achievable from these assets alone; implement independent safe foundation rather than silently equating illustrative rotations with validated biomechanics.

**Alternatives considered:** Replace source with rigged character (violates reuse goal); rotate arbitrary region meshes including muscles (breaks attachments); reuse original bone geometry in explicit articulated groups (chosen, preserving source and fail-closed admission). Complex scapular contact/rhythm, vertebral coupled motion and thumb opposition need source-calibrated landmarks/constraints. No invented full-body accuracy claim.

## Tasks

- [x] Record current branch/source inventory and legally accessible biomechanical references; catalogue all requested regions/movements, enabled versus blocked status and reasons.
- [x] RED/GREEN catalogue/state tests: valid source IDs, independent sides, finite bounded periodic zero-velocity loop endpoints, speed/pause/reset/movement changes and future multi-channel data.
- [x] RED/GREEN actual-source rig tests: local joint chains, exact neutral reset, unchanged source buffers, source mismatch rejection, rigid lengths, pronation keeps ulna fixed, opposite side fixed, disposal and draw batching.
- [x] Implement a single lazy player in atlas with joint/movement selectors, adjacent Play/Pause, 0.5/1/2 speed, Reset, side selection, orbit/zoom/view controls, neutral reference layers, compact Hebrew/English controls. Never render static atlas and animation WebGL scenes simultaneously.
- [x] Real source browser tests for loops/state/sides/camera/reduced motion/visibility/RTL/cleanup; retain previous curl and atlas tests. Independent review and fix concrete issues.
- [ ] Full unit/TypeScript/build/browser/Worker CI, draft stacked PR; deploy exact checked source to isolated LAB preserving bindings, live public acceptance, release evidence and explicit remaining movements.

**Validation gates:** No true anatomical neutral claim for original source pose; no measured activation; no phone performance claim from emulation; no detailed clinical ROM unless directly reference-supported and separate from demonstration excursion; source attribution remains visible. Unsupported compound motion is unavailable, with a reason, rather than a plausible-looking generic rotation.

**Files:** `lib/anatomy-joint-movements.ts` (catalogue), `lib/anatomy-joint-playback.ts` (pure state/loop), `lib/anatomy-joint-rig.ts` (source-bound hierarchy/batches), `components/anatomy-joint-player.tsx` (shared UI), `lib/anatomy-canvas.ts` (opt-in adapter), `components/anatomy-atlas-viewer.tsx` (exclusive viewer switch), new unit/browser tests, audit report, CI step.
