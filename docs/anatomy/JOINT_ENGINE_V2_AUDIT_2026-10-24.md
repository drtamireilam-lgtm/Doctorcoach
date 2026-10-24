# Full-body joint engine 2.0 — implementation and calibration audit

## Scope and source

This is an implemented reusable **bone-motion foundation**, not a completed clinically validated biomechanics engine. The user requested autonomous implementation, preservation of the existing atlas and LAB deployment after checks. No main merge, Production deployment, database migration, user-data write or permission change is part of this work.

Refreshed all remote branch heads before development. The most recent anatomy source remains PR40, `53008498f4a240b20076b5677f7bdde24a790bf5`; older stage36 is its ancestor and must not replace this work. New branch: `codex/anatomy-joint-engine-v2-20261024`, stacked on PR40. Previous branch audit/asset inventory: `EXERCISE_ANIMATION_AUDIT_2026-10-24.md`.

The existing renderer is Three.js with GLTFLoader and OrbitControls, not React Three Fiber. All 15 assets have no skins, morph targets, rigged skeleton or animation clips. The combined source contains 201 separate bone and 178 separate muscle structures. It is still byte-identical, bound to decoded GLB SHA256 `e2a429905cf3def79b1e730cf49b1d47239ff3b39dbcb77695ef4f6c7886046c`. Original materials/geometry are owned per parsed scene. Bilateral meshes are actual separate source objects, not newly mirrored geometry. Existing clinical cards have textual origins/insertions, not usable 3D attachment coordinates or skin weights.

## Implemented movement inventory

All enabled items below are **prototypes awaiting source calibration**; none is marked clinically validated. Extension/adduction/supination returning movements start playback at the source-neutral midpoint of the loop, avoiding unsupported hyperextension from the source pose.

| Region | Enabled bone demonstrations | Blocked movements / required data |
| --- | --- | --- |
| Shoulder | Flexion, extension, abduction, adduction, internal/external rotation | Horizontal abduction/adduction: calibrated elevated-arm setup and scapular/clavicular coordination |
| Scapula | None | Elevation/depression, protraction/retraction, upward/downward rotation: thorax sliding/contact, clavicle constraints and scapulohumeral coordination |
| Elbow | Flexion, extension | Clinical pivot validation; no hinge-based clinical accuracy claim |
| Forearm | Pronation, supination | Provisional proximal-radius to distal-ulna axis; crossing/clearance requires anatomical review |
| Wrist | Flexion, extension, radial/ulnar deviation | Carpal coupling is simplified to one rigid hand group |
| Fingers | Composite MCP/PIP/DIP flexion and return extension, digits 2–5 | Abduction/adduction: per-digit MCP axes and reference spread |
| Thumb | None | Opposition, flexion/extension, abduction/adduction: specimen-specific coupled CMC/MCP/IP axes/translation |
| Hip | Flexion, extension, abduction/adduction, internal/external rotation | Hip-center calibration; no ground contact, balance or loaded motion |
| Knee | Flexion, extension | Internal/external rotation: flexion-dependent roll/glide, screw-home and patellar tracking |
| Ankle | Dorsiflexion, plantarflexion | Talocrural axis/clearance calibration |
| Foot | None | Inversion/eversion: calibrated oblique subtalar axis and midfoot coupling |
| Toes | Composite flexion/extension, all five toes with individual phalangeal chains | End-cap pivots are approximations; no soft-tissue/contact validation |
| Cervical | None | Flexion/extension, left/right rotation and lateral flexion: unequal C0–C1/C1–C2/subaxial contributions and facet/disc constraints |
| Thoracic and lumbar | None | Flexion/extension, rotation, lateral flexion for each region: per-level landmarks, unequal segment contributions and thoracic rib-cage coupling |

Total: **28 enabled prototypes, 33 explicitly blocked movements**, in 14 UI categories (hand/thumb separate; thoracic/lumbar together with separate definitions). Selecting a blocked movement stops playback, resets visible bones and clears previous muscle associations; it never silently plays another movement.

## Architecture and controls

- `anatomy-joint-movements.ts`: source-bound catalogue, joint/channel IDs, bilingual names/regions, affected source bones, associated muscle IDs, axes/landmark definitions, start/end excursions, five-second continuous loop, status/reasons/reference provenance. Lower-limb textbook ROM values are separately labeled with assessment context and source; unknown values remain null. Demo excursion is deliberately different from physiological reference ROM.
- `anatomy-joint-playback.ts`: pure, tested paused/playing state, phase-preserving 0.5/1/2 speed, cosine complete-return-repeat cycles, source-neutral reset and finite elapsed-time checks. Cycle endpoints have zero mathematical velocity; actual rendering smoothness depends on device performance.
- `anatomy-joint-rig.ts`: per-instance articulated groups and parent channels. Source vertices and indices are unchanged; each active rigid part and static bones are batched without simplification. Finger/toe channels are hierarchical so distal parts inherit proximal rotations. Forearm rotates radius/hand about a proximal-radius/distal-ulna line while ulna stays fixed. Shoulder/hip axial rotation uses source long-bone lines with mirrored signs. Patellae are hidden during bone motion because tracking is unmodeled, and restored in source reference.
- `anatomy-joint-player.tsx`: one reusable, lazy, bilingual UI for all available movements; Play/Pause beside the selected movement, continuous loops, speed, Reset, independent Left/Right/Both, manual cycle scrub, orbit/pinch/wheel, front/back/side views and joint focus. Playback stops on movement/side changes, reference mode, reduced-motion preference, hidden document or unmount. Camera and speed changes preserve the phase. Labels are throttled; rendering is capped at 30 updates/s, not guaranteed to achieve 30fps.
- Atlas switch exclusively mounts this viewer or the existing static atlas, never both. Closing releases WebGL and restores the static atlas. Existing curl library demonstration/video/IDs, regional anatomy, source cards and atlas layer persistence remain available.
- Profiles already contain multiple parented channels, allowing future synchronized hip/knee/ankle sequences through explicit validated parent mappings. No duplicate per-exercise character or player is introduced. Ground contact, bar grip, loaded biomechanics and complete exercises are intentionally not implemented in this joint-foundation phase.

## Muscle integration and anatomical validation

Original muscles are available in **source-pose reference only**, with independent bones/muscles visibility and orange qualitative association highlighting on the selected side(s). Some long finger flexor/extensor meshes are absent from this asset; the UI reports missing associated muscles. Association is not measured activation, recruitment, force or contraction. No moving muscle deformation is enabled: validated origin/insertion geometry, routing and weights are absent. This remains an unmet part of the requested moving-muscle goal.

Existing source pose is not certified anatomical neutral. Reset is labeled source pose. Elbow pivots retain the previous explicit prototype coordinates. Other pivots use source mesh end-cap centroids; femoral/humeral centers use disclosed geometric approximations. End-cap positions and source long-bone axes are **not validated articular landmarks**. Static reference resets all groups exactly; no muscle is reparented onto a distal bone.

Reference checking established physiological direction conventions, the fixed-ulna/radius-hand distinction, region-specific spinal constraints and the need for coupled thumb/scapular motion. Automated tests establish transform behavior and source preservation, not clinical accuracy, contact, cartilage, ligament mechanics or patient-specific ROM. Gray's, Netter and Sobotta full editions were not available as legally accessible project sources; no claim is made that their full plates/text were consulted. Sources actually accessed:

- [Cunningham's Manual: forearm and hand](https://accessmedicine.mhmedical.com/content.aspx?bookid=3473&sectionid=286275178): proximal radial-head to distal-ulnar-head axis, radius crossing/hand carriage, ulna distinction.
- [StatPearls shoulder](https://www.ncbi.nlm.nih.gov/books/NBK536933/) and [scapulohumeral muscles](https://www.ncbi.nlm.nih.gov/sites/books/NBK546633/): shoulder-girdle coupling and coordination.
- [StatPearls elbow](https://www.ncbi.nlm.nih.gov/books/NBK532948/): hinge/radioulnar distinctions and muscle associations.
- [StatPearls hand muscles](https://www.ncbi.nlm.nih.gov/books/NBK537229/?report=printable) and [MCP joints](https://www.ncbi.nlm.nih.gov/books/NBK538343/): finger/wrist roles and joints.
- [Brukner & Khan, clinical biomechanics, table 8.1](https://accessphysiotherapy.mhmedical.com/content.aspx?bookid=1970&sectionid=168689485): position-dependent lower-limb ROM references, distinct from demonstration excursions.
- [Thumb CMC biomechanics study](https://pmc.ncbi.nlm.nih.gov/articles/PMC11154835/): coupled rotations/translations require specimen coordinates.
- [Subtalar anatomy](https://pubmed.ncbi.nlm.nih.gov/30097077/) and [Clinical Methods](https://www.ncbi.nlm.nih.gov/books/NBK266/?report=reader): subtalar/tarsal constraints and toe joint examination.
- [Cervical spine](https://www.ncbi.nlm.nih.gov/books/NBK557516/), [thoracic vertebrae](https://www.ncbi.nlm.nih.gov/books/NBK459153/) and [lumbar vertebrae](https://www.ncbi.nlm.nih.gov/books/NBK459278/): region-specific and unequal segment constraints.
- [BodyParts3D licence](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html): attribution retained in joint viewer.

## Verification and remaining work

RED/GREEN tests cover missing catalogue/rig, bilateral source geometry, looping state, full inventory and explicit blockers. Additional direction test caught reversed hip internal-rotation signs; corrected to the mirrored source longitudinal axis. Independent review caught stale muscle highlights after switching to blocked movements; reproduced with a failing test and fixed with explicit movement/side data in neutral rendering.

Real-browser checks cover one-canvas ownership, visible pose changes, looping/speed/pause, orbit during playback, side/reset controls, all enabled region adapters, blocked compound motions, source-reference layers/attribution, reduced motion/background pause, Hebrew/mobile and disposal/static-atlas return. Full application integration covers both languages with real CSS and routes. Exact final CI, test counts, source SHA, PR, release version and live LAB acceptance are recorded in the PR and release evidence; this document does not assert an unexecuted check.

Current software-WebGL measurements are low and vary by environment; desktop emulation does not establish physical iPhone/Android performance. Next work: reviewed landmark registry and local joint coordinate frames, landmark/clearance acceptance on each enabled prototype, actual-phone load/memory/frame-time measurement, then constrained scapular/spinal/thumb/subtalar adapters and attachment-preserving muscle skinning using the original geometry. Only after these gates should statuses become anatomically validated or be used in loaded exercise/rehabilitation demonstrations.
