# Anatomical exercise engine phase 1 implementation plan

> Use superpowers:executing-plans; final fresh-context code review.

**Goal:** A working, LAB-only barbell-curl bone-motion prototype using the existing shared atlas asset, plus neutral active-muscle reference, without speculative muscle deformation.

**User scope:** Independently audit relevant branches, implement if technically possible, preserve atlas/assets/IDs/data/permissions, validate and deploy only to LAB. No main merge/Production deployment. This request authorizes LAB release after verification.

**Base:** f21adbfb071a6f5af0f8d19ec00861fac5cef962 (current LAB, PR39). Remote refresh found no newer anatomy work. stage36 is 25 commits behind; its descendants plus unified model work are preserved. Older interactive/team branches are divergent, not blindly merged. See audit for exact inventory.

## Design decisions

- All 15 original GLBs have zero skins, clips or morph targets. The whole-body model contains separately selectable meshes, not an animation skeleton. Keep every asset byte-identical.
- Runtime joint adapter reparents only bilateral forearm/hand bones into rigid pivot groups; upper arm/body remain fixed. Joint locations/axes are provisional source-coordinate calibration, pending clinical review. Motion is 0–100 degrees *relative to source pose*, not a personal/clinical ROM measurement.
- Moving soft-tissue anatomy is blocked until attachment landmarks and skinning are validated. Active-muscle mode pauses at neutral, showing original biceps/brachialis (primary), brachioradialis (secondary), wrist flexors (qualitative stabilizers). It is a reference, not measured activation or contraction. No new clinical card or existing role mapping is overwritten.
- Shared createAnatomyCanvas gets an opt-in motion adapter only. Atlas default remains static. GLTFLoader supports authored animations, but existing assets contain none; no fabricated clips or skinned anatomy are claimed.
- Separate exercise data (canonical ID, asset hash, joint mappings, role sets, bounds) from runtime rig and player UI. Future validated joint/skin drivers can reuse the source model for squats, deadlifts, bench, lateral raise and rehabilitation profiles; unsupported exercises get no duplicate entry or placeholder animation.
- Lazy entry in the existing exercise details, preserving video and anatomy links. Three modes: bone-motion prototype, neutral active-muscle reference (optional bone layer), skeleton with schematic joint markers. Original full skeleton+muscle atlas stays available. Do not imply neutral muscles deform during movement or that symbolic markers are cartilage.
- On-demand canvas; one scene, maximum 30 animation frames/s, paused by default, stops when hidden/reduced-motion/unmounted, original camera orbit/zoom retained. No physical-phone sign-off from desktop emulation.

## Tasks

- [x] Record 15-asset rig/animation inventory, branch/PR provenance, feasibility and clinical limits.
- [x] RED tests for canonical profile, source admission, bounded/periodic motion, role sets, rigid transforms, descendant inventory, immobility of other bones and exact neutral reset.
- [x] Implement pure profile/math module and opt-in Three.js rigid joint adapter with resource cleanup.
- [x] Integrate lazy bilingual controls into existing barbell-curl details without altering video, exercise ID or atlas state.
- [x] Real browser tests: model/frame changes, orbit during playback, pause/resume/speed/seek, modes/layers, neutral muscle roles, reduced motion/background/unmount cleanup, Hebrew/mobile and existing atlas regression.
- [ ] Full unit/type/browser/build checks and independent code review; draft stacked PR, exact-head CI.
- [ ] Build, preflight, preserve live LAB bindings/roles, deploy approved source only to LAB; verify live prototype and atlas. Record actual results and limitations.

## Review focus

Wrong source/laterality must fail closed; no mutated geometry/materials can leak to atlas; hidden/paused scenes must not animate; relative angle must not be presented as clinical ROM; neutral muscle reference must never inherit a flexed skeleton pose.

