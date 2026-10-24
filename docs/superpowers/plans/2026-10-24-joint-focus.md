# Focused joint rendering and camera framing

> Execute inline with superpowers:executing-plans; TDD and independent review.

**Goal:** Reduce rendering work for the currently selected joint, preserving full-body visualization, all anatomy source geometry and current animation phase.

**Evidence:** Prior live acceptance timed out once during camera interaction while playing, then passed unchanged on retry. Software-WebGL samples are only ~1–5 updates/s. Existing focus changes the camera, but the merged static full-body bone batch remains in the frustum and draws unrelated triangles. This is a rendering-work diagnosis, not proof of the timeout's root cause or physical-phone performance.

**Design:** Compute source-bound active-bone context from movement and side; include proximal supporting bones (e.g. humerus for elbow, metacarpals/carpals for fingers), and never hide any active bone. Partition original static batches into context/outside groups without simplification, cutting or new meshes in the source asset. Add explicit Full body / Joint region scope controls. Scope changes alter visibility/camera framing, never playback phase or source transforms. Static muscles stay reference-only; local reference respects region and laterality. Unsupported movement returns to full-body scope. Use a multi-mesh bounds focus so the entire joint region is visible rather than one cropped phalanx.

- [x] RED/GREEN pure context and real-source rig tests: active bones always included, proximal reference retained, unrelated side/region excluded, all vertices retained in body mode, scope doesn't change pose, reset/layer guards preserved.
- [x] Implement batch partition and visibility scope with owned resource cleanup, plus multi-mesh camera bounds and actual rendered-triangle observability for browser verification.
- [x] Add bilingual scope controls, preserve playback while changing scope, fit the selected region, and restore full-body framing on explicit full-body action.
- [x] Browser regression: actual triangle reduction, context framing, pause/camera/phase stability, Hebrew, reference layers, blocked scope fallback and atlas cleanup. Record measurements without physical-phone claims.
- [ ] Independent review, final unit/types/browser/build/CI, draft stacked PR on PR42; LAB-only release and live acceptance preserving bindings and permissions.

No new physiological movements or moving-muscle deformation are claimed. Current catalogue remains 30 prototypes/31 blocked movements. Calibration, joint contact, patella tracking and real devices remain required.
