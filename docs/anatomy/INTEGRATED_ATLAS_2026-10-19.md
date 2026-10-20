# Integrated anatomy atlas — 19 October 2026

## Baseline and scope

Based on main `818e4ce6a4b3b48084f12f1791b98832f4228214`, preserving the current full standalone application, its theme work, exercise occurrences and authentication. The older `feature/lab-team-management` is a separate root-app lineage; it was inspected and not blindly merged. The 15-muscle procedural 3D prototype on `feature/anatomy-bilingual-20261019` was inspected. Its retained bilingual upper-body summaries are reused with canonical standalone muscle IDs, without importing its unvalidated ellipsoid geometry or adding a second app.

## Implemented in the actual application

- `#learn` now opens an original SVG navigation map with front/back, anatomical left/right, both-side selection, zoom and accessible region/list alternatives. Patient right is viewer left anteriorly and viewer right posteriorly. Highlighting identifies a region; it does not claim an exact muscle outline/depth.
- All 129 retained muscle/group records remain reachable and searchable in both languages. Foot interossei now resolve to foot records rather than hand records. Existing source links, movement descriptions, injury topics and educational injury/exercise mappings are retained.
- 42 main muscle cards have Hebrew and English location, origin, insertion, actions, joint/movement context and training explanation. Concise summaries are not exhaustive fascicle descriptions. The remaining 87 records retain their existing names/functions and explicitly identify missing attachment details. This release does not claim every historical record is a complete atlas article.
- 122 typed canonical exercise/muscle links distinguish primary, assisting and stabilizing roles; exercise pages link back to the corresponding muscle. No exercise is duplicated or added to a coached plan by browsing anatomy. RPE/RIR, e1RM, next-set calculation and plan permissions are unchanged.
- Region, muscle, side, view and search are encoded in the hash and restored on history navigation/reload. Language changes use the existing LanguageProvider and keep selection. Same-hash exercise-to-muscle navigation still exits the exercise overlay.
- Original elbow-flexion and knee-extension two-segment diagrams have play/pause/restart and manual position controls. They start static, respect reduced motion and stop on unmount. They do not model muscle deformation, force or individual ROM; unsupported muscles do not display empty playback controls.
- Existing selected Gray plates remain. Other records have an optional embedded OpenStax superficial-body reference, with attribution/license and a retry state. The published reference is not represented as isolating a deep/selected muscle. Network failure leaves the local SVG map, descriptions and navigation usable.
- The existing feedback service now accepts content-error and illustration-problem categories. Anatomy submissions retain canonical muscle ID, language and side in stored context while showing a readable muscle name in the dialog. Owner-only history and admin-only review use existing guards. No new database/schema is required.
- CSS uses shared appearance tokens with responsive layout, touch targets, logical spacing and reduced-motion support. No 3D engine, WebGL dependency or newly licensed model is shipped.

## Sources and asset provenance

New factual prose is a concise original summary, including retained source-checked prototype text. It is not copied instructional prose or a clinical reviewer sign-off. References inspected on 19 October:

- UAMS upper limb: https://medicine.uams.edu/neuroscience/education/medical-school-courses/human-structure-module/anatomy-tables/muscle-tables/muscles-of-the-upper-limb/
- UAMS lower limb: https://medicine.uams.edu/neuroscience/education/medical-school-courses/human-structure-module/anatomy-tables/muscle-tables/muscles-of-the-lower-limb/
- OpenStax head/neck/back: https://openstax.org/books/anatomy-and-physiology-2e/pages/11-3-axial-muscles-of-the-head-neck-and-back
- OpenStax abdominal wall/thorax: https://openstax.org/books/anatomy-and-physiology-2e/pages/11-4-axial-muscles-of-the-abdominal-wall-and-thorax

New OpenStax reference images:

- https://commons.wikimedia.org/wiki/File:Muscles;_anterior_view;_unlabeled.png (659 × 751)
- https://commons.wikimedia.org/wiki/File:Muscles;_posterior_view;_unlabeled.png (427 × 759)

Both source pages identify OpenStax and CC BY 4.0, with the unlabeled derivative uploaded by WaSu-Bio. They permit reuse/adaptation with attribution, license link and identification of changes. The app credits OpenStax / Anatomy & Physiology Fig. 11.5 / WaSu-Bio / Wikimedia Commons, links to each source and https://creativecommons.org/licenses/by/4.0/, and displays the derivative unchanged. They remain remote images: source availability on each user's device is not guaranteed. No restricted commercial atlas or model was imported. Existing Gray image metadata and provenance remain separate and unchanged.

## Verification

- Root `npm ci`, `npm test` (10 foundation + 6 PostgreSQL/RLS checks), `npm run build`: passed.
- Standalone dependencies reused from the identical locked existing installation; no dependency or lockfile changes. This subproject uses pnpm and has no npm lockfile.
- Standalone suite: 1,225 tests passed, including 10 new anatomy data/navigation/render/feedback checks.
- Standalone TypeScript: passed.
- Standalone LAB build / generated target check / synthetic Worker checks: see final recorded command results below.
- New tests verify all retained records remain region-reachable, bilingual fields/UI parity, link IDs and roles, Hebrew punctuation search, URL fallback/roundtrip, SSR map controls in both languages and both sides, static/reduced-motion defaults, feedback ownership and admin review. SSR/HTTP tests are not touch/browser tests or medical validation.

## Deployment and review boundaries

`wrangler whoami` reports unauthenticated in this execution session. No remote D1 mutation, Production deployment, merge to main or live-user action was performed. The configured isolated LAB uses D1/R2 app data and Supabase only for identity; no Postgres migration is needed for this change. Do not publish this standalone LAB via Sites or point it at Production resources.

No browser-control skill is available in the managed environment, so no preview server, browser install, substituted browser tooling, screenshots or claimed iPhone/touch/visual acceptance. Shared-token use and SSR checks do not establish visual contrast/layout on actual phones.

Outstanding: authenticated isolated-LAB deployment and real device verification; anatomical/editorial review; complete attachment articles for the remaining 87 records; a medically accurate selectable 3D model if commissioned/licensed in a later batch. The separate schematic 3D prototype is not silently promoted as an anatomical teaching model.

Final command outcomes: standalone TypeScript, `DC_ISOLATED_STAGING_BUILD=true npm run build:standalone`, `check-isolated-staging.mjs` and `runtime-smoke.mjs` all passed. The built workerd/D1/R2 checks covered OTP rejection, synthetic registration/sign-in, account isolation, private media, plan/workout persistence, all 13 current theme presets, role boundaries and logout replay. These use a synthetic provider; no real email or live LAB result is claimed. Final source also retains the legacy muscle movement descriptions and source catalog links.
