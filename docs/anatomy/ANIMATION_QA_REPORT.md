# Exercise animation QA report

## Scope

Source base: `86112bf104a7a31511b9bb90308cb6a0d892b4a1` on `feat/anatomy-press-motion-preview`, one commit above the isolated November 17 LAB integration branch. This is local engineering QA. The pilots have pending anatomical review and no recorded professional approval.

## Technical results

- Node 24.22.0 on Windows. TypeScript passed and the complete standalone unit suite finished with 2,252 passes and zero failures. A final focused run passed 18 tests. Its assertions cover exact catalog resolution, blocked/unmatched entries, independently gated press clips, periodic bounded elbow motion, fixed pivots, rigid source buffers, and muscle role/color selection and reset.
- Isolated Chrome player smoke used the same interactive component, renderer and the original source asset. It covered playback and scrubbing, camera while playing, muscle reference/selection/reset, Hebrew RTL, reduced motion, tab hiding and cleanup. Twelve checks passed with zero page errors. Playwright checked page and control bounds in Hebrew RTL and English LTR at 320, 390, 430, 768 and 1280 px. Side captures at 0%, 25%, 50%, 75% and 100% had relative flexion of 0°, 50°, 100°, 50° and 0°. The two endpoints and the two symmetric mid-cycle frames matched byte for byte.
- Software WebGL through ANGLE SwiftShader recorded 3 pose submissions in 2.062 seconds during a concurrent local build. That run demonstrates poor performance in this environment. It cannot establish GPU device performance. Physical iPhone and Safari remain unverified.

- The isolated Vinext build completed and its generated Worker settings passed the static isolation check. The wrapper's 180-second limit was exceeded on this machine, so the build was run directly with the same isolated target flags.

- A separate Chromium resilience probe simulated unavailable WebGL and observed zero model requests. An injected HTTP 503 showed the retry prompt, and Retry loaded one canvas and enabled playback.

- Full exercise-detail smoke passed in Chrome 157.0.8103.78 on Windows using SwiftShader and the existing synthetic Miniflare runtime on loopback. It exercised the built application with disposable fixture data supplied by the existing pilotRuntime() Miniflare fixture, compatibility date 2026-05-15, with a loopback GET/HEAD bridge. The check runs from the standalone app with ANATOMY_TEST_ORIGIN set to the loopback origin and node scripts/anatomy/exercise-animation-detail-smoke.mjs. Curl rendered five repetition positions at 1280 × 960, and passed speed, play/pause, restart, camera, selection/reset and reopen checks. Hebrew RTL and English LTR fit at 320, 390, 430, 768 and 1280 CSS px. There were zero page errors.
- The built-app run recorded two pose submissions in 1.660 seconds. Opening and reopening produced two model requests with Playwright route interception disabling HTTP cache. The runtime keeps an owned parsed scene per opening and uses normal browser HTTP caching outside this test.
- The actual bench detail exposed the inherited clip and its media playback and seek APIs. The local fixture did not yield reliable video screenshots across the seek range, so movement inspection used the same original clip in its isolated preview component. The squat detail remained usable without a demonstration. Headless canvas recording yielded no usable video stream. The application PNGs and browser JSON provide the observed movement evidence.
## Movement assessment

- Curl neutral and peak poses show distinct bilateral elbow flexion with continuous rigid wrist and hand groups. Side view shows anterior hand travel without obvious trunk interpenetration in projection. The two arms overlap in that view, so the front captures complement it. Forearm orientation and finger posture come from the source; there is no grip, bar or moving muscle deformation. The muscle reference displays orange, blue and purple source meshes over subdued bones.
- Bench preserves the inherited illustrative LAB clip. Chrome 157.0.8103.78 at 752 × 640 played and scrubbed the four-second clip through the existing preview component in isolated Vite. The clip shows a supine skeleton and elbow movement with role colors. Hands stay open, the lower legs are cropped and the clip depicts no bar or bench. Some colored meshes appear separated in extension. Interactive supine support, shoulder/scapular calibration and hand-to-bar constraints remain open.
- Squat is unavailable. Coordinated lower-limb calibration, ground contact and a supported bar pose remain open.

See [pilot limitations](PILOT_EXERCISE_SPECIFICATIONS.md) and [model evidence](ANIMATION_CAPABILITY_AUDIT.md). A successful prototype check covers software behavior and a limited visual inspection. Anatomical plausibility and formal approval remain separate review decisions.
