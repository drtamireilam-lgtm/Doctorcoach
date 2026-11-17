# Exercise animation QA report

## Scope

Source base: `86112bf104a7a31511b9bb90308cb6a0d892b4a1` on `feat/anatomy-press-motion-preview`, one commit above the isolated November 17 LAB integration branch. This is local engineering QA. The pilots have pending anatomical review and no recorded professional approval.

## Technical results

- Node 24.22.0 on Windows. Focused assertions cover exact catalog resolution, blocked/unmatched entries, independently gated press clips, periodic bounded elbow motion, fixed pivots, rigid source buffers, and muscle role/color selection and reset.
- Isolated Chrome player smoke used the same interactive component, renderer and the original source asset. It covered playback and scrubbing, camera while playing, muscle reference/selection/reset, Hebrew RTL, reduced motion, tab hiding and cleanup. Twelve checks passed with zero page errors. Playwright checked page and control bounds in Hebrew RTL and English LTR at 320, 390, 430, 768 and 1280 px. Side captures at 0%, 25%, 50%, 75% and 100% had relative flexion of 0°, 50°, 100°, 50° and 0°. The two endpoints and the two symmetric mid-cycle frames matched byte for byte.
- Software WebGL through ANGLE SwiftShader recorded 3 pose submissions in 2.062 seconds during a concurrent local build. That run demonstrates poor performance in this environment. It cannot establish GPU device performance. Physical iPhone and Safari remain unverified.

- The isolated Vinext build completed and its generated Worker settings passed the static isolation check. The wrapper's 180-second limit was exceeded on this machine, so the build was run directly with the same isolated target flags.

## Movement assessment

- Curl neutral and peak poses show distinct bilateral elbow flexion with continuous rigid wrist and hand groups. Side view shows anterior hand travel without obvious trunk interpenetration in projection. The two arms overlap in that view, so the front captures complement it. Forearm orientation and finger posture come from the source; there is no grip, bar or moving muscle deformation. The muscle reference displays orange, blue and purple source meshes over subdued bones.
- Bench preserves the inherited illustrative LAB clip. Chrome 157.0.8103.78 at 752 × 640 played and scrubbed the four-second clip through the existing preview component in isolated Vite. The clip shows a supine skeleton and elbow movement with role colors. Hands stay open, the lower legs are cropped and the clip depicts no bar or bench. Some colored meshes appear separated in extension. Interactive supine support, shoulder/scapular calibration and hand-to-bar constraints remain open.
- Squat is unavailable. Coordinated lower-limb calibration, ground contact and a supported bar pose remain open.

See [pilot limitations](PILOT_EXERCISE_SPECIFICATIONS.md) and [model evidence](ANIMATION_CAPABILITY_AUDIT.md). A successful prototype check covers software behavior and a limited visual inspection. Anatomical plausibility and formal approval remain separate review decisions.
