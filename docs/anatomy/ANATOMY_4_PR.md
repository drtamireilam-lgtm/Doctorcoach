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

Verified locally: TypeScript check passed; isolated standalone build passed; static isolated configuration gate passed; 24 focused annotation/navigation/exercise/stretch tests passed; viewer-controls smoke passed 20 checks across all 15 real GLBs with no page errors. The annotation browser fixture passed 19 checks with no page errors, including real touch raycasting and hover-to-card traversal. The complete unit suite and full-app browser run are still in progress. Fourteen coach-payments tests have failed and all 14 failures reproduce on unchanged base f115bd2: a JavaScript-only mocked clock expires the fixture license under SQLite real time. See baseline-billing.json; no billing code is changed.

Planned evidence includes the complete unit suite and TypeScript check, isolated standalone build, anatomy browser checks, and `node scripts/anatomy/annotations-smoke.mjs` with Chromium. The annotation fixture checks the real bundled shoulder GLB, camera and zoom projection updates, selected highlights, detail opening, hide/restore/isolate/clear behavior, no page overflow and bounded labels at 320, 390, 430, 768 and 1280 pixels in both languages.

Local screenshots and JSON are included under apps/doctorcoach-standalone/docs/anatomy/anatomy-4-evidence/. CI uploads its evidence in the `anatomy-browser-evidence` artifact under `annotations/`. Screenshot filenames are `annotations-{en|he}-{width}.png`; final visual inspection and links remain pending. These fixture screenshots do not establish authenticated full-application or physical-device coverage.

## Limits and migration risk

No database migration, schema update, account write, entitlement change, dependency update or new anatomy asset is required. This is a stacked PR; merging directly against the older `main` would obscure its scope with earlier unmerged application work.

The model retains its documented coverage gaps. Existing joint motions remain prototypes; muscles do not gain deformation, new rigging or validated attachment coordinates. Educational content and software rendering checks do not constitute clinical validation. Chromium software WebGL and viewport emulation do not establish real-phone frame rate, memory use or touch performance.

The shared canvas projection and selection lifecycle, annotation sizing, bidirectional layout, exercise navigation and styling interactions are the primary regression areas. Review final browser evidence before LAB release; deployment and production promotion are outside this PR's automated workflow.
