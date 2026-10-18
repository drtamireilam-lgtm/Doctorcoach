# DoctorCoach interactive anatomy prototype

Date: 2026-10-18. Branch: feature/interactive-3d-anatomy.

## Isolation and baseline

Based on LAB commit 90283fb (feature/lab-team-management), preserving that work. No active navigation, training engine, backend, database, hosting configuration or deployment workflow changed. Main and Production are untouched. The prototype is an explicit separate Vite entry: `anatomy-lab.html`; the ordinary Vite build still builds only `index.html`. No merge or deployment performed.

## Existing anatomy inventory

The root LAB app's `src/ServicesEducationWorkspace.tsx` has region/topic placeholders, not a detailed muscle atlas. `src/exercise-library.ts` contains the existing exercise IDs used by this prototype.

A richer independent app exists on `feature/current-site-source-v90`, under `apps/doctorcoach-site`. Its anatomy data, original image-source metadata, navigation, muscle JSON records, exercise ID lists and anatomy components are preserved as read-only snapshots in `inventory/`, with the exact source commit recorded there. These retain all existing muscle records and external URLs from the inspected anatomy data. Existing assets and live app files are not replaced. Existing image metadata includes Wikimedia Gray's Anatomy plates and public-domain claims; anatomy.ts includes AAOS shoulder/spine/hip references. Those legacy license claims were inventoried, not independently recertified. No external image/model is loaded by this new viewer. This prototype does not claim those other branches were merged into LAB.

## Implemented

- React Three Fiber renders original procedural Three.js sphere meshes with real volume, bilateral unique mesh names (`muscle-id-left/right`). 15 selectable muscle IDs: pectoralis major/minor; anterior/middle/posterior deltoid; trapezius; latissimus; rhomboid major/minor; biceps; triceps; four cuff muscles.
- Three.js OrbitControls supplies full azimuth rotation, wheel/pinch zoom, mouse and touch gestures; front/back and zoom buttons offer alternatives.
- Superficial/deep/frame toggles, gold selection highlight, keyboard-accessible list equivalent to mesh picking.
- Hash-addressable internal muscle detail panel with Hebrew/English name, location, origin, insertion, nerve, actions, trainee and coach explanations. No external-site navigation needed.
- Play/pause/resume/reset bilateral shoulder abduction schematic, limited to 0–90 degrees. Upper-arm/forearm groups rotate; shoulder/trunk meshes do not deform. Pink functional highlighting is not activation measurement.
- Typed draft primary/secondary/stabilizer relationships resolve existing exercise IDs, without changing workouts or duplicating exercises. Only a starter subset is mapped.
- WebGL error boundary/fallback preserves text access, responsive layout, visible focus, touch targets, no autoplay, reduced-motion preference change stops playback.

## Engine choice

Three.js provides geometry, camera, picking and OrbitControls; React Three Fiber fits the existing React/TypeScript application and provides scene lifecycle management. No extra model, texture or animation packages are necessary. Official references: https://threejs.org/docs/pages/OrbitControls.html and https://github.com/pmndrs/react-three-fiber . DPR capped at 1.5, low mesh subdivision, demand rendering outside playback, no texture/network asset downloads. Prototype bundle is about 1.17 MB / 321 KB gzip; this is a separate entry, not added to the active app bundle. Real-device FPS and GPU memory remain unmeasured.

## Local review

`npm ci`, `npm run anatomy:dev`, then open `/anatomy-lab.html` on the local server. `npm run anatomy:test`; `npm run anatomy:build`; existing checks: `npm test`, `npm run build`.

## Verification limits and next steps

Browser-control skill is not available in this managed environment. Following the Sites managed-preview constraint, no preview server/browser installation or substitute screenshot path was used. Consequently there are no genuine runtime screenshots, mobile/browser interaction results, visual QA, FPS measurements or accessibility audit results in this delivery. Code implementation is not evidence that these checks passed.

Before integration: browser-test rotation, pinch/zoom bounds, mesh/list selection, occlusion, front/back/reset, pause/resume/repeat, layer changes, hash/back navigation, unsupported WebGL fallback, keyboard/screen reader, 375 px and landscape layouts, reduced motion and representative iOS/Android devices. Measure frame rate and memory. Capture front/back/deep/mobile screenshots only after that review.

For full body: commission original medically reviewed low-poly/glTF meshes with documented rights; model bones/landmarks and separate muscle origins/insertions; add artist-controlled topology, tendons, left/right IDs and LOD; rig shoulder/clavicle/scapula and add serratus anterior; validate movement and scapulohumeral coordination; expand legs/core/forearms/neck; map the richer app's canonical muscle/exercise IDs through an explicit adapter; verify licensing, clinical content and device budgets. Human anatomy artist and medical reviewer are required before using geometry for instruction. No automatic integration or publication is authorized here.

## Executed checks

- `npm ci`: PASS before additions; locked Three.js/R3F/@types added through npm.
- `npm test`: PASS, 10 foundation checks + 6 PostgreSQL/RLS tests.
- `npm run build`: PASS, including TypeScript noEmit.
- `npm run anatomy:build`: PASS, including TypeScript noEmit.
- `npm run anatomy:test`: PASS: unique records/required draft fields, geometry parameters, existing exercise references and role enums, no duplicate links, animation endpoints/bounds and active-entry isolation.
- `git diff --check`: PASS before commit.
- Build warning: separate anatomy chunk exceeds 500 KB (about 321 KB gzip). Optimize/split before app integration. No measured device-performance claim.
