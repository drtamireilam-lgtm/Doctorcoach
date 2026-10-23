# DoctorCoach anatomy status and next development task

Audit date: 24 October 2026, Asia/Jerusalem. Repository: `drtamireilam-lgtm/Doctorcoach`.
Source snapshot: `integration/anatomy-rehab-stretch-20261022` at `ec333c0125dca7926975b18aa5ec697bd8cdf429`.
The complete owner-provided master brief was read as historical context, then checked against Git objects, GitHub PR/Actions APIs and public LAB assets. Its embedded instructions were not treated as independent authorization. The owner's chat request controls this task.

## Current implementation

The active standalone application is under `apps/doctorcoach-standalone`, using React, Vite/vinext, Cloudflare Workers and Three.js. A separate root Vite application and divergent team-management work also exist; replacing either with a new prototype would lose functionality.

Fresh counts from the integrated snapshot:

- 136 unique searchable muscle/group catalog records.
- 98 authored bilingual cards, all with Hebrew/English innervation, plus origin, insertion, action, joints and training fields.
- 210 active exercise-to-muscle relationships across 79 unique exercise IDs. The completion base has 190 relationships; the integration adds 20 relationships, not 20 unique exercises.
- 24 distinct stretch exercises with separate target mappings and reverse lookup. They are not counted as contraction roles or included in the 79 active exercise IDs.
- 13 bundled GLBs: a schematic body navigator and 12 regional models. The manifests contain 314 structure entries, including 16 navigator surfaces. Repeated structures are not unique anatomy.
- Every model retains `anatomicalReview: pending`. No geometry is clinically approved by this audit.

| Model | Structures | Bone | Muscle | Cartilage | Surface | Manifest sides |
|---|---:|---:|---:|---:|---:|---|
| body | 16 | 0 | 0 | 0 | 16 | both, schematic |
| shoulder | 12 | 3 | 9 | 0 | 0 | right |
| arm | 9 | 4 | 5 | 0 | 0 | right |
| forearm | 12 | 3 | 9 | 0 | 0 | right |
| hand | 30 | 27 | 3 | 0 | 0 | right |
| hip | 14 | 2 | 12 | 0 | 0 | right |
| thigh | 19 | 5 | 14 | 0 | 0 | right |
| knee | 16 | 6 | 10 | 0 | 0 | right |
| lowerleg | 41 | 29 | 12 | 0 | 0 | right |
| foot | 37 | 28 | 9 | 0 | 0 | right |
| neck | 32 | 20 | 12 | 0 | 0 | midline/right |
| spine | 48 | 40 | 8 | 0 | 0 | midline/right |
| torso | 28 | 17 | 4 | 7 | 0 | midline/right |

Individual hiding/restoration, model search in Hebrew/English, pan, orbit, zoom, focus, isolation, layer controls, region navigation, saved camera/selection, missing-geometry notices and exercise return links exist. Layer categories are bone/muscle/cartilage/surface; these do not constitute complete superficial/deep/joint/ligament coverage. Motion learning is schematic, not a reviewed rigged 3D motion engine.

The stretch integration is wired into the exercise links and the expanded muscle learning card. For a muscle with geometry, the 3D panel's **Open muscle learning card** button opens that expanded card. Stretch targets are distinct from primary/secondary/stabilizer roles.

## PR and branch state

All six requested PRs were open, unmerged and reported mergeable by GitHub at inspection time. Mergeability is not clinical or release approval.

| PR | Head / base | Current contribution |
|---|---|---|
| [20](https://github.com/drtamireilam-lgtm/Doctorcoach/pull/20) | `feature/anatomy-completion-20261019` / main | Earlier 42-card, 122-link integration checkpoint; do not apply its historical counts to the new atlas |
| [30](https://github.com/drtamireilam-lgtm/Doctorcoach/pull/30) | `feature/anatomy-completion-20261022` / `feature/anatomy-asset-safety-stage36` | Viewer controls and seven referenced innervation additions; latest head `e20bd38` |
| [31](https://github.com/drtamireilam-lgtm/Doctorcoach/pull/31) | `test/anatomy-link-coverage-20261022` / completion | Canonical-ID and coverage guard; integrated into #34 with stronger baselines |
| [32](https://github.com/drtamireilam-lgtm/Doctorcoach/pull/32) | `feature/stretch-anatomy-targets-20261022` / completion | 24 mappings **and UI** at current head `40a9c0f`; its older PR body says data-only and is stale |
| [33](https://github.com/drtamireilam-lgtm/Doctorcoach/pull/33) | `feature/rehab-anatomy-links-20261022` / completion | 20 additional muscle-role relationships, already copied into integration |
| [34](https://github.com/drtamireilam-lgtm/Doctorcoach/pull/34) | `integration/anatomy-rehab-stretch-20261022` / completion | Combined work, 79 linked exercise IDs, coverage fixes and CI push trigger; head `ec333c0` |

The asset-safety branch (`ea14a87`) is an ancestor of completion (`e20bd38`), which is an ancestor of integration (`ec333c0`). PR #34 therefore already carries #30, the current #32, the #31 guard and #33 data; do not merge/cherry-pick their changes a second time. #31/#33 were integrated by content rather than preserving their head commit ancestry.

`feature/interactive-3d-anatomy` (`1dcb0a5`) is divergent: 55 commits unique to it versus 149 unique to integration at this snapshot. It includes separate `src/anatomy` prototype files and team/cloud-workout work. `feature/lab-team-management` (`90283fb`) is also divergent: 52 versus 149 commits. Do not bulk merge either into the standalone atlas. Audit their distinct capabilities separately and port only required, reviewed changes while retaining account/coach isolation. A clean Git merge alone is insufficient.

Recommended integration sequence: review #30 on asset-safety, review #34 on completion, validate this follow-up on #34, then prepare a separately reviewed release candidate retaining LAB features. No merge was performed during this task and main remains out of scope.

## What has actually been tested

Fresh GitHub API inspection found:

- [Completion CI 39804083398](https://github.com/drtamireilam-lgtm/Doctorcoach/actions/runs/39804083398), exact head `e20bd38`: success. Foundation security/build, standalone unit suite, TypeScript, viewer smoke, full anatomy application browser smoke, isolated build/preflight and synthetic Worker authentication/authorization steps all succeeded.
- [Integration CI 39841196372](https://github.com/drtamireilam-lgtm/Doctorcoach/actions/runs/39841196372), exact head `ec333c0`: success. Foundation/standalone tests, TypeScript, isolated build/preflight and synthetic Worker checks succeeded. **Browser selection, viewer smoke and full anatomy application browser smoke were all skipped.** Green CI therefore did not verify the integrated browser experience.

The earlier document's Windows native Miniflare failure and migration timeout remain historical local limitations, not the current completion Linux CI outcome. Neither CI result is a new physical-device, authenticated clinical workflow, real email/OTP or deployment acceptance test. New local and follow-up CI results are recorded below after execution.

## LAB evidence

Read-only GET requests to `https://doctorcoach-isolated-staging.dr-tamireilam.workers.dev` succeeded. All 13 public `/anatomy/*.glb` files were freshly downloaded to temporary files and their SHA-256 values matched the integrated manifests, including shoulder. This confirms current asset bytes only.

The public HTML exposes a vinext deployment identifier `c4d11f03-8cf5-4aa6-9bfd-001524e7049d`; it does not identify a Git commit. The exact deployed SHA, the new mesh controls and the #32/#33 UI/data deployment are **unverified**. No authenticated remote session, Cloudflare deployment credentials or medical data were accessed. No new LAB or Production deployment was made.

## Remaining atlas gaps

Paired regional structures are right-sided throughout these manifests; body overview `both` is schematic and does not provide left detailed anatomy. Separate joint surfaces/tissues, ligaments, capsules, tendons, discs, nerves and vessels are largely absent. Knee menisci and ACL/PCL/MCL/LCL, elbow ligaments and SI/hip tissues need licensed source geometry. Much intrinsic hand/foot musculature is missing. Back lacks discs, multifidus, quadratus lumborum and latissimus geometry; torso lacks rectus abdominis, internal oblique, transversus abdominis, diaphragm and most intercostal detail. Preserve exclusions for source laterality conflicts; do not mirror or fabricate replacement geometry without review.

The following 38 canonical catalog slugs have no authored card (some catalog entries are groups; exact slug identity is used):

```text
abductor-digiti-minimi, abductor-pollicis-longus, anconeus,
dorsal-interossei-of-foot, extensor-digiti-minimi, extensor-digitorum,
extensor-digitorum-brevis, extensor-indicis, extensor-pollicis-brevis,
extensor-pollicis-longus, flexor-digiti-minimi-brevis,
flexor-digitorum-profundus, flexor-digitorum-superficialis,
flexor-pollicis-longus, iliocostalis, interspinales, intertransversarii,
longissimus, lumbricals-of-foot, palmaris-longus,
plantar-interossei-of-foot, quadratus-plantae, rotatores, longus-colli,
suboccipital-group, intercostals, subclavius, serratus-posterior-superior,
thoracic-erector-spinae, thoracic-multifidus, diaphragm, pelvic-floor,
thenar-group, hypothenar-group, lumbricals-of-hand, dorsal-interossei,
palmar-interossei, opponens-digiti-minimi
```

Regional manifest JSON files retain per-structure IDs, HE/EN names, side, source ELEMENT IDs, mapping rows, hashes and pending review status. A card or catalog record alone does not prove a mesh. Model inclusion alone does not prove correct attachments, orientation, laterality or clinical approval. Source/attribution metadata exists (BodyParts3D CC BY 4.0); this task did not independently recheck reference textbooks or validate new medical claims.

## First safe development task and follow-up

Close the confirmed CI gap before adding geometry or medical content. Extend the existing CI trigger to PRs targeting anatomy branches, enable both browser suites for integration and anatomy PR contexts, and add EN/HE real stretch/atlas roundtrip checks with reload and semantic-label assertions. No product/auth/permission changes are required.

After these checks pass, the highest-value next task is a source-backed, clinically reviewed geometry/card backlog, beginning with knee joint tissues or the 38 missing cards according to available licensed assets and clinician review. Before any LAB release, verify the deployed Git SHA and accept the integrated UI, OTP entry points, first workout, load/manual-override persistence and cross-coach/private-file boundaries. Request explicit owner approval for the deployment itself.
