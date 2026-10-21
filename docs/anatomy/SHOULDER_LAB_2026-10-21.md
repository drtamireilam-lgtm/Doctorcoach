# DoctorCoach interactive shoulder — LAB candidate, 2026-10-21

The existing Anatomy & Learning workspace now has a real, on-demand 3D right shoulder viewer. It is enabled only in local development and explicitly isolated LAB builds. Ordinary release builds disable both shoulder viewer entry points. Nothing has been merged to main or deployed to Production.

## Implemented

- Actual GLB geometry, direct mesh picking, selected-structure highlighting, mouse orbit/wheel zoom, touch controls with vertical page scrolling, four camera presets, reset and clear selection.
- Bone/muscle visibility excludes hidden meshes from picking. An accessible structure selector provides a keyboard alternative.
- Hebrew RTL and English LTR details reuse the existing learning and exercise catalogs. All nine modeled muscles have bilingual information, source-linked innervation and primary/secondary/stabilizer exercise relationships. Existing reverse exercise links remain in place.
- Canonical exercise deep links resolve only known library IDs. The live app exercise round trip restores the viewer and its selected structure using session-local UI state.
- GLB fetch size, checksum and exact named mesh inventory are checked before rendering. Local file inspection rejects external resource URIs and duplicate mesh names. Upload selection races cannot replace a newer file with an older result. No upload service was introduced.
- Lazy rendering module and asset loading, capped device pixel ratio, rendering on changes, abortable loading, listener/observer cleanup, and geometry/material/renderer/context disposal.
- Updated the pnpm lockfile and anatomy CI to install locked dependencies, typecheck, run the full suite, build the isolated candidate and run browser smoke tests. CI never deploys.

## Geometry and license

Source: [official BodyParts3D 4.0 archive](https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/isa_BP3D_4.0_obj_99.zip).

Creator/attribution: BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International.

The [official license page](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html), updated 2025-02-27, identifies CC BY 4.0 and permits redistribution and derivative works with attribution. [License text](https://creativecommons.org/licenses/by/4.0/). The official archive was used rather than older mirrors carrying older license notices.

18 source ELEMENT meshes were combined into 12 selectable structures. Original geometry was retained; millimetres were converted to metres and the coordinate basis rotated into Y-up. Vertex normals and plain materials were generated. No missing anatomy was synthesized. The GLB has 123,698 triangles and is under 3 MiB. Per-ELEMENT source/FMA mapping rows, SHA-256 values, GLB checksum, modifications and attribution are recorded in `apps/doctorcoach-standalone/lib/prepared/shoulder-model.json` and the served `/anatomy/source-and-license.json`.

Selectable structures:

| Bones | Muscles |
| --- | --- |
| Clavicle | Deltoid |
| Scapula | Supraspinatus |
| Humerus | Infraspinatus |
| | Subscapularis |
| | Teres minor |
| | Teres major |
| | Trapezius |
| | Serratus anterior |
| | Pectoralis major |

Separate joint geometry, tendons, ligaments, nerves and latissimus dorsi are not in this subset and are explicitly marked unavailable. Nerve information is text, not invented nerve geometry.

## Content review boundary

Source ELEMENT IDs were matched against the official `isa_element_parts.txt` mapping. Innervation labels were cross-checked against the [UAMS upper-limb muscle table](https://medicine.uams.edu/neuroscience/education/medical-school-courses/human-structure-module/anatomy-tables/muscle-tables/muscles-of-the-upper-limb/). Teres major received a short bilingual learning card. The existing attachment/action summaries and exercise relationships are educational content; an independent clinician has not approved this model, its Hebrew translations or the full existing catalog. The interface and manifest explicitly retain pending clinical review. Existing approved-asset admission gates remain unchanged.

## Validation

- TypeScript: passed.
- Complete unit suite: 1,247 passed, 0 failed, 0 skipped.
- Ordinary application build: passed.
- Isolated LAB build and generated configuration check: passed.
- Browser smoke: 16 checks passed, including direct geometry picking, actual WebGL rendering, language/layout changes, the integrated exercise round trip, restoration, no uncaught JavaScript errors and no HTTP 5xx responses. Evidence: `evidence-2026-10-21/browser.json` and `evidence-2026-10-21/shoulder-mobile.png`.
- Independent static review identified the missing LAB gate; the correction was reviewed and the finding resolved.

The existing billing test fixture used calendar-dependent SQLite trigger dates. Its initial membership history is now dated explicitly, with the JavaScript clock fixed in the fixture. No billing business logic changed.

Browser testing uses Chromium, a 390×844 touch-capable viewport and software WebGL. It does not replace iPhone/Safari and physical Android testing, real pinch/scroll validation, memory profiling or authenticated deployed LAB testing. An initial run exposed missing tables in the empty local test D1. The browser runner now applies the existing migrations using a hard-coded local-only dummy database binding before starting the app; the final run returned no HTTP 5xx responses. No remote migration was applied. Authenticated LAB behavior and existing LAB media were not verified.

## Deployment status

Not deployed. `wrangler whoami` reports: `You are not authenticated. Please run wrangler login.`

The checked-in isolated configuration identifies only Worker `doctorcoach-isolated-staging`, its dedicated D1/R2 bindings and Supabase project `jbfkzkzcznfacsjdawmf`. Target URL: https://doctorcoach-isolated-staging.dr-tamireilam.workers.dev. This URL is the configured target, not evidence that this candidate is live.

After the environment has Cloudflare credentials, recheck account/resource ownership and use the generated isolated configuration. Do not use the default Production configuration, merge main, apply remote data migrations or change Production data as part of this candidate.

## Reproduce

From `apps/doctorcoach-standalone`:

```sh
pnpm install --frozen-lockfile
npm run typecheck
npm test
npm run build
DC_ISOLATED_STAGING_BUILD=true npm run build:standalone
node standalone/scripts/check-isolated-staging.mjs dist/server/wrangler.json
pnpm exec playwright install --with-deps chromium
npm run test:anatomy:browser
```

A preinstalled Chromium can be selected with `ANATOMY_CHROMIUM=/absolute/path/to/chrome`. Test port defaults to 37851 and can be changed using `ANATOMY_TEST_PORT`.

To regenerate the asset, run `python scripts/anatomy/fetch-shoulder.py`, download the official `LATEST/isa_element_parts.txt`, then run `python scripts/anatomy/build-shoulder.py /tmp/dc-shoulder-source.zip /path/to/isa_element_parts.txt`. Source IDs are explicit, not inferred by fuzzy matching.

Next priority: authenticated isolated LAB/device acceptance and clinician review of shoulder geometry/content, followed by remaining structures and a second anatomical region using reviewed source mappings.

## Integration with the current LAB branch

Integrated the full Smart Load LAB branch at `49969c3cc5ef7051afa792b2e02bf4bbedbed7f1` into the existing anatomy development branch. This preserves the latest workout set actions, load calculations, import handling, navigation and premium themes. Merge resolutions retain the current LAB home/auth behavior, anatomy viewer/deep links, verified innervation additions and deterministic billing test dates. The two existing atlas content files were compared by slug: no current LAB cards were lost.

Revalidation: TypeScript passed; all 1,358 unit tests passed with no failures or skips; isolated standalone build and static target check passed; all 16 browser checks passed with zero uncaught errors or HTTP 5xx responses. These are local checks, not evidence of live LAB deployment. Cloudflare dashboard Worker identity was confirmed from the user-provided URL as `doctorcoach-isolated-staging`; deployment remains pending.
