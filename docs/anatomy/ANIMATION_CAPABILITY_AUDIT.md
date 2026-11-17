# Exercise animation capability audit

This audit covers the isolated LAB source at `bf154e0` plus the existing press preview commit `86112bf`. It updates the capability findings from the [October curl prototype audit](EXERCISE_ANIMATION_AUDIT_2026-10-24.md) for the three-exercise mission.

## Verified against the binary assets

Parsed the glTF 2.0 JSON chunks of all 15 checked-in model binaries under `apps/doctorcoach-standalone/public/anatomy/`, gunzipping the whole-body musculoskeletal asset first. Inspected the scene node tree, mesh primitives, attribute accessors, indexed materials, morph targets, skins, clips and textures. The decoded musculoskeletal SHA-256 is `e2a429905cf3def79b1e730cf49b1d47239ff3b39dbcb77695ef4f6c7886046c`, which matches the existing exercise adapter and manifest.

| Capability | Finding |
| --- | --- |
| Static anatomy | The 14 individual GLBs cover the body navigator, regional models and whole skeleton. The combined `musculoskeletal.glb.gz` contains 201 bones and 178 muscle structures. |
| Authored rig | None of the 15 binaries has a skin, joint/weight attributes, or an inverse-bind hierarchy. The 379 combined-model mesh nodes are flat scene roots with identity transforms. The skeleton asset contains anatomical bone surfaces. |
| Authored movement | No embedded animation clips or morph targets. The adjacent press MP4s are pre-rendered media. The October curl adapter and joint player generate rigid motion procedurally. |
| Addressable muscles | The combined model has one named mesh and one distinct indexed material per structure. The source manifest records the layer, side, optional canonical learning ID, and original source elements. |
| Anatomical deformation | No weights, attachment constraints, tendon routing, muscle morphs, reviewed joint calibration or deformation validation. Separate mesh visibility and colors work in the neutral pose. Rigidly attaching a joint-crossing muscle to one moving segment can detach it from the other segment. |

The build converts source millimetres XYZ to metres X Z −Y. The source pose is upright with arms down. +Y is superior, +Z anterior, and +X the model's left. Source bounds are X −0.324…0.324 m, Y −0.073…1.636 m, Z −0.025…0.236 m. The renderer centers the display through an object transform. Adapter pivots and axes use the original source coordinate system. The neutral pose predates any pilot and does not establish each exercise's grip, stance, equipment contact or joint angles.

### Asset cost and current renderer

The combined source is 25,084,865 bytes on disk (23.92 MiB gzip) and 32,752,504 bytes decoded (31.24 MiB). It has 973,489 position vertices, 1,501,926 indexed triangles, 379 materials and zero textures. The 201-mesh skeleton GLB is 10,077,308 bytes and 512,450 triangles. Regional GLBs range from approximately 0.31 to 5.90 MiB. This inventory measures the files and geometry, independently of HTTP transfer and rendered frame rate.

`lib/anatomy-models.ts` and `lib/anatomy-canvas.ts` implement abortable fetch, transport/decode and SHA-256 admission, manifest inventory validation, Three.js GLTFLoader, owned scene resources and on-demand rendering. They use a 35° perspective camera, OrbitControls with distance bounds, scene lighting, and a 1.5 device pixel ratio ceiling. Canvas teardown disposes the adapters, mesh geometry/materials, overlay geometry/material, controls and renderer, and loses the WebGL context. The existing loader fetches and parses per canvas instance, subject to browser HTTP caching. Neither the model scanner nor the legacy performance measurements establish current real-device performance.

### Mesh identity and reuse

`public/anatomy/musculoskeletal-source-and-license.json` gives the source inventory. `lib/prepared/musculoskeletal-model.json` provides the runtime inventory used by the canvas. Use the mesh ID for a particular side and the catalog's canonical learning identifier for educational relationships. A combined atlas row may use a side-stripped ID when an explicit learning ID is absent. Examples include the bilateral `biceps-brachii`, `brachialis`, `pectoralis-major`, `triceps-brachii`, `gluteus-maximus` and `vastus-lateralis` structures. A label match alone does not establish coverage or catalog identity.

## Existing motion controls and pilot constraints

- **Curl.** `lib/anatomy-motion-rig.ts` has a bilateral elbow hinge for the stable `barbell-curl` catalog ID. It moves radius, ulna and hand descendants, with source-space elbow pivots `[±.216, 1.041, .071]` and mirrored axes `[1, ±.168, 0]`. It preserves the original rigid bone geometry, supplies a neutral-only muscle reference, and documents the 100° setting as a provisional excursion from the source pose. An equipped demonstration additionally needs a calibrated grip and forearm orientation plus a contact-constrained bar or independently hand-attached equipment. The original hands have no grip rig.
- **Squat.** `lib/anatomy-joint-movements.ts` has provisional hip, knee and ankle channels based on the individual mesh inventory. The exercise needs a coordinated hierarchy, pelvis and trunk posing, and a fixed foot-contact solution. The isolated joint demo does not solve these constraints and excludes the patella from moving views because tracking is unavailable.
- **Bench press.** The `bench.mp4` press preview can be played and scrubbed as video. The prior implementation does not provide live orbit, per-muscle selection or exercise equipment contacts through a GLB runtime. The rigid joint registry explicitly blocks horizontal shoulder adduction and abduction pending elevated-arm and scapula/clavicle calibration. A live approximation needs a supine root pose, bench clearance, bilateral calibrated shoulder/elbow controls and a grip constraint. Scapulothoracic translation and clavicular coupling remain unavailable.

The existing joint adapter can instantiate nested local pivot groups and identify relevant bones from the checksum-bound source inventory. It also batches rigid bone draw calls while retaining source mesh proxies. Use this kind of adapter for a simplified teaching illustration when contact, clearance and movement pass visual inspection. Show the true muscle meshes in an identified neutral reference if the desired movement would otherwise visibly separate their attachments.

## Provenance and deferred asset work

BodyParts3D is © The Database Center for Life Science. The repository's combined manifest records the official BodyParts3D v4.0 OBJ archive, source element IDs, source and GLB hashes, transformations, geometry retention and CC BY 4.0 attribution. Preserve these credits and disclose derivative changes. The combined model's anatomy review remains pending. [BodyParts3D license](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html)

The detailed atlas is a separate build-generated asset. Its 634-entry manifest and preparation script are checked in, but `detailed.glb` was absent from the clean checkout scanned for this audit. Its source is Écorché by Charleeh, derived from BodyParts3D and Z-Anatomy, under CC BY-SA 4.0. The repository records that the build only renames nodes and materials while preserving the source geometry, transforms and vertex colors. It is outside the checksum-bound motion adapter. This audit does not infer a usable rig from its inventory. [Detailed atlas attribution](../../apps/doctorcoach-standalone/public/anatomy/detailed-attribution.md)

For deforming muscles, asset work would require documented joint frames and limits, author-reviewed skin weights or another attachment-preserving deformation method, verified landmarks and tendon routing, calibration across the target poses, and continuity/clearance QA. Artist-authored hand poses and a patella path are separate work from the rigid body movement. Keep the current atlas explorer as the educational reference and preserve its canonical muscle relationships when evaluating additional assets.
