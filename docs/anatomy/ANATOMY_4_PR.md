## Summary

Selecting anatomy now shows a compact structure label connected to its projected 3D mesh, with explicit actions to focus the structure or open educational information and exercises. The responsive viewer adds zoom buttons and groups camera controls in a dark teal and gold surface. Exercise context and a unified strength/stretch list extend discovery using the existing anatomy and exercise records. Pain persistence is explicitly deferred in a scoped privacy and authorization design document.

This change preserves the bundled BodyParts3D geometry and existing static atlas, regional navigation, layer controls and joint-motion foundations. It builds on the integrated application at PR #83 (`f115bd2`), including anatomy PRs #34–43, rather than recreating those features from `main`.

**Base branch:** `feat/program-editor-ux-20261115`

**Head branch:** `feat/anatomy-4-20261116`

## Behavior and implementation

- Labels use a mesh-derived world-space anchor projected through the active camera, and update during camera changes and resizing.
- Selecting a structure highlights it; opening details is an explicit action. Existing selection, isolation, hiding, restoration and exercise navigation remain available.
- Annotation placement keeps labels inside the stage in Hebrew and English, with wrapping controls and keyboard focus styles at narrow widths.
- Existing exercise associations are reused for muscle discovery. Pain mapping is documentation only in this PR; no pain UI, storage or diagnostic behavior is added.
- Anatomy CI runs the existing type checks, unit suite, isolated build and browser checks, plus a real-GLB annotation smoke script. No deployment is added.

## Verification

- `node node_modules/typescript/bin/tsc --noEmit`: passed.
- Isolated standalone build and static isolated configuration gate: passed, no deployment.
- All anatomy unit files: 126/126 passed. Focused navigation/exercise/stretch checks also passed.
- `annotations-smoke.mjs`: 19 checks passed, no page errors. Includes actual touch raycast and hover-to-card traversal; HE/EN at 320,390,430,768,1280px.
- `viewer-controls-smoke.mjs`: 20 checks passed, no page errors across all 15 bundled GLBs.
- Complete suite: 1,967 tests; 1,953 passed, 14 failed. All 14 coach-payments fixture failures reproduce on base f115bd2. The fixture mocks JavaScript time but SQLite uses real time, expiring its synthetic license before billing assertions. No billing code changed. See baseline-billing.json.
- GitHub push CI 43770780307 independently reported the same 1,953 pass / 14 fail. The job remains failing; subsequent independent build/browser evidence steps now run without hiding the failed unit gate.
- Full-app Windows browser smoke: local synthetic migrations passed, but Vite did not start listening during the observed setup window; interrupted before browser assertions. See full-app/setup-status.json. No full-app or physical Safari success is claimed.

Screenshots and JSON are committed under `apps/doctorcoach-standalone/docs/anatomy/anatomy-4-evidence/` and `docs/anatomy/anatomy-4-regression-evidence/`. Mobile screenshots were visually inspected and typography/hover defects refined. CI uploads `anatomy-browser-evidence`. Build output retains a >500kB chunk warning; physical iPhone performance is unmeasured.

**Merge readiness: draft / blocked** by the baseline suite failures, remaining full-app validation, clinical sign-off and physical Safari checks. No merge or deployment was performed.
## Limits and migration risk

No database migration, schema update, account write, entitlement change, dependency update or new anatomy asset is required. This is a stacked PR; merging directly against the older `main` would obscure its scope with earlier unmerged application work.

The model retains its documented coverage gaps. Existing joint motions remain prototypes; muscles do not gain deformation, new rigging or validated attachment coordinates. Educational content and software rendering checks do not constitute clinical validation. Chromium software WebGL and viewport emulation do not establish real-phone frame rate, memory use or touch performance.

The shared canvas projection and selection lifecycle, annotation sizing, bidirectional layout, exercise navigation and styling interactions are the primary regression areas. Review final browser evidence before LAB release; deployment and production promotion are outside this PR's automated workflow.
