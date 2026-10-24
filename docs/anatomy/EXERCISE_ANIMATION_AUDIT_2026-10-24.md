# Anatomical exercise animation — phase 1 audit and prototype

## Scope and status

User requested audit, a working barbell-curl prototype, existing-library integration and tested LAB release, preserving the atlas and existing users/permissions. Source base: `f21adbfb071a6f5af0f8d19ec00861fac5cef962`, already deployed to isolated LAB as version `83d1b297-9231-4e23-9954-c678c5a58351`. Development branch: `codex/anatomy-exercise-motion-phase1-20261024`. No main merge or Production deployment is authorized.

**Implemented scope:** rigid bone-motion prototype plus a separate neutral active-muscle reference. **Not implemented or claimed:** clinically validated joint calibration, deforming/contracting muscles, bar grip/contact, resistance/force simulation, full physiological execution or individual clinical ROM. The UI makes these distinctions before playback. This is a technical prototype for review, not a completed anatomical exercise simulation.

## Branch and PR audit

Refreshed origin and inspected all 15 anatomy/rehab/stretch branch heads and open PR heads before coding. The latest anatomy head is PR39/base `f21adbf`; no newer anatomy branch was present.

| Branch | Relationship to selected base |
| --- | --- |
| feature/anatomy-asset-safety-stage36 | ancestor, 25 commits behind |
| feature/anatomy-completion-20261022 / PR30 | ancestor, 20 behind |
| integration/anatomy-rehab-stretch-20261022 / PR34 | ancestor, 9 behind |
| feature/stretch-anatomy-targets-20261022 / PR32 | ancestor, 16 behind |
| codex/anatomy-integration-validation-20261024 / PR35 | ancestor, 6 behind |
| codex/anatomy-forearm-learning-cards-20261024 / PR36 | ancestor, 5 behind |
| codex/anatomy-flexor-learning-cards-20261024 / PR37 | ancestor, 4 behind |
| codex/anatomy-unified-skeleton-20261024 / PR38 | ancestor, 2 behind |
| codex/anatomy-unified-muscles-20261024 / PR39 | selected latest base/current LAB source |
| feature/anatomy-completion-20261019 / PR20/25 | ancestor, 107 behind |
| feature/lab-apple-anatomy-integration-20261020 / PR26 | ancestor, 71 behind |
| feature/rehab-anatomy-links-20261022 / PR33 | divergent: 2 remote-only, 20 base-only commits; not reset/merged |
| test/anatomy-link-coverage-20261022 / PR31 | divergent: 1 remote-only, 20 base-only; not reset/merged |
| feature/interactive-3d-anatomy | older divergent branch: 55 remote-only, 158 base-only |
| feature/anatomy-bilingual-20261019 / PR15 | older divergent branch: 56 remote-only, 158 base-only |

The older team-management branch is also divergent (52 remote-only/158 base-only), so it was not blindly merged. Existing integration/atlas/stretch tests remain the regression boundary. No branch was reset, deleted, force-pushed or merged into main.

## Asset audit: anatomy skeleton is not an animation skeleton

Inspected the actual GLB JSON and mesh inventories, decompressing the existing lossless package first. All files use GLTF 2.0 mesh primitives, with shared source-coordinate vertices and separate named materials. The combined model has side-specific mesh IDs and canonical learning IDs.

| Asset | Meshes | Skins | Animation clips | Morph targets |
| --- | ---: | ---: | ---: | ---: |
| body | 16 | 0 | 0 | 0 |
| shoulder | 12 | 0 | 0 | 0 |
| arm | 9 | 0 | 0 | 0 |
| forearm | 12 | 0 | 0 | 0 |
| hand | 30 | 0 | 0 | 0 |
| hip | 14 | 0 | 0 | 0 |
| knee | 16 | 0 | 0 | 0 |
| lowerleg | 41 | 0 | 0 | 0 |
| foot | 37 | 0 | 0 | 0 |
| spine | 48 | 0 | 0 | 0 |
| torso | 28 | 0 | 0 | 0 |
| neck | 32 | 0 | 0 | 0 |
| thigh | 19 | 0 | 0 | 0 |
| skeleton | 201 | 0 | 0 | 0 |
| musculoskeletal.glb.gz | 379 | 0 | 0 | 0 |

Answers to the requested technical questions:

1. The original BodyParts3D meshes are in a shared metre/Y-up coordinate space; display centering is applied to the parent object. The combined asset contains 201 bone structures and 178 muscle structures, not a single fused mesh.
2. Bones and muscles are separate selectable objects with provenance and side metadata. The `body` surface is approximate region navigation, not muscle anatomy.
3. There is no `THREE.Skeleton`, GLTF skin, inverse-bind matrix, skin weight/index or authored animation clip in the existing assets. The file named `skeleton` depicts bones only.
4. The source has no articulated joints. Rigid pivot groups can drive existing bone objects without changing their vertex buffers, but joint landmarks/axes must be calibrated and reviewed before anatomical correctness can be claimed.
5. Muscles can ultimately be attached to a rig, but assigning them wholesale to forearm rotation would detach proximal attachments. There are no validated attachment/weight/morph data to support safe moving muscle deformation now. Phase1 therefore blocks it and shows original muscle geometry only at neutral.
6. Existing `GLTFLoader` supports GLB/GLTF animation data. Its returned clips would need an `AnimationMixer`/action driver; current atlas code does not play clips, and existing files contain none. The prototype uses a deterministic procedural rigid-joint driver instead of claiming nonexistent authored clips.
7. Atlas and exercise viewer share the same source asset, checksum admission, loader, camera and cleanup path. Each viewer owns its parsed scene, so exercise transformations cannot leak into the static atlas.

## Implemented engine and library integration

- `lib/anatomy-exercise-motion.ts`: canonical exercise profile, source checksum, explicit joint pivots/axes, bone descendants, reference role sets, bounded relative angles and periodic movement math. No duplicate exercise is added: `barbell-curl` is the existing Barbell Curl ID.
- `lib/anatomy-motion-rig.ts`: instance-local bilateral elbow adapter. Each side moves its 29 radius/ulna/hand descendants; upper arms and the rest of the body stay fixed. Rodrigues/axis-angle rotation preserves rigid distances and original buffers. No mesh simplification or newly generated anatomical asset.
- Runtime bone batching combines existing geometry into three rendering batches (static bones and each forearm/hand group), retaining every source vertex/triangle. Separate source objects remain picking proxies outside the camera layer. Batch GPU resources are disposed with the viewer. This optimization is exclusive to the opt-in exercise instance.
- `lib/anatomy-canvas.ts`: optional motion adapter; the default atlas path remains static and render-on-demand. Orbit and zoom remain enabled during playback.
- `components/exercise-anatomical-demo.tsx`: lazy opening in existing exercise details, paused by default; play/pause, 0.25–2× speed, source-relative 0–100° slider, reset/focus/orbit/zoom, Hebrew/English, independent reference bone/muscle layers and qualitative role legend. No real records or permission API is changed.
- Three modes: movement demonstration (bones only), active-muscle reference (neutral, motion disabled), skeleton/joints (moving bones plus schematic markers). Markers are not cartilage/ligaments. Neutral mode resets both elbow groups before showing original muscle meshes.
- Biceps and brachialis are primary, brachioradialis assisting, wrist flexors representative stabilizers. These are qualitative exercise-reference roles, not EMG, force, fatigue or patient-specific activation estimates. Existing anatomy card/exercise-link data is not overwritten.
- Animation scheduling is capped at 30 updates/s, independent of camera interactions; background/reduced-motion/unmount stops playback and frees the owned scene. React label updates are throttled. Video demonstrations and existing atlas links stay available.

The joint coordinates were provisionally inspected against humerus/radius/ulna source bounds; they are not validated anatomical landmarks. The angle is explicitly relative to the original model pose, not a goniometric measurement. Finger grip, wrist supination and bar contact remain unmodeled. No claim of anatomically correct loaded barbell execution is made.

## Validation and limitations

TDD started with missing-engine failures, then verified canonical identity, source admission, bounded periodic poses, both wrists moving anteriorly, fixed pivots, preserved distances, unchanged source buffers and neutral muscle-reference reset. A further RED/GREEN regression pins three lossless draw batches rather than 201 original bone draw calls. Source credit/licence links were added after independent review identified their omission.

Real browser tests exercise rendering at neutral/flexed poses, actual frame changes, pause, speed, orbit during playback, modes/layers/roles, source attribution, reduced motion, document visibility, Hebrew RTL, mobile overflow and WebGL disposal. Full-application tests open the canonical library entry in both languages and return to the unchanged static atlas. Exact final unit/type/browser/build/CI/LAB results are recorded in the PR and release evidence; they must not be inferred from this design description.

The first unbatched software-WebGL measurement was only four pose updates in 2004ms. This is a diagnosed bottleneck, not acceptable evidence of phone performance. After lossless batching, the same software-WebGL measurement reached 18 pose updates in 2002.6ms (approximately 9 updates/s). Ten motion-browser checks and 20 existing atlas controls/model checks passed without browser errors; final TypeScript and four motion-unit checks also passed. Even a successful desktop/software viewport run does not establish physical iPhone/Android performance. Clinical correctness, pivot review, collision clearance, real grip and muscle biomechanics remain unverified.

## Extension to hundreds of exercises

Keep one source model, a versioned joint/landmark/skin registry and separate canonical-ID exercise profiles. Add reviewed hip/knee/ankle channels for squat/deadlift; shoulder/elbow channels for bench/lateral raise; clinician-approved motion limits and handling for rehab/stretch profiles. Do not infer prescribed ROM or treatment from an exercise name.

For true moving muscles, reuse the original geometry in a rigging workflow (e.g. authored armature/weights or a validated attachment-preserving deformation adapter), not a replacement anatomical character. Record origin/insertion landmarks, tendon routing, joint axes and side mapping. Validate attachment continuity, mesh inversions/self-intersections, cross-section/volume changes, bone clearance and end-range behavior against reference evidence and clinician review. Only then enable a `validated-skin` driver/profile; until then the neutral-only guard remains intentional.

Authored GLTF clips can be loaded through the same validated source pipeline and played by a future mixer adapter; exercise-specific data remain separate. Add compression/LOD and asset-cache budgets without silently changing anatomical geometry, reuse renderer instances only with strict ownership/reset, and benchmark real devices (load/memory/frame timing/battery) before claiming mobile readiness. Future profiles must fail closed if their source hash or joint inventory changes.

## References

- [Three.js GLTFLoader](https://threejs.org/docs/pages/GLTFLoader): supported asset data and returned clips.
- [Three.js animation system](https://threejs.org/manual/pages/animation-system.html) and [SkinnedMesh](https://threejs.org/docs/pages/SkinnedMesh.html): clips/mixer and required skeleton/weights.
- [NCBI StatPearls: elbow joint](https://www.ncbi.nlm.nih.gov/books/NBK532948/?report=printable): elbow movers and stabilization context; not validation of these source-coordinate pivots.
- [BodyParts3D licence](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html): original required attribution retained in both viewers.

