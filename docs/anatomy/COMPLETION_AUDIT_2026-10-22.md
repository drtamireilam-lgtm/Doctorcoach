# Anatomy completion audit and incremental candidate — 2026-10-22

This is a partial implementation, not a completed or clinically validated atlas.
Base: `ea14a877d17fafe4a113be2db4388c21a72bb3bf`, anatomy asset safety stage36.
Working branch: `feature/anatomy-completion-20261022`. No main merge or Production deployment.

## Repository findings

The base already has 13 bundled GLBs (body navigator plus 12 detailed models), 98 authored bilingual learning cards, 91 cards with innervation and 190 exercise relationships. The searchable catalog contains 136 muscle/group records: catalog presence is not a completed learning card or mesh. There are 314 model structure entries including 16 schematic navigator regions; repeated structures across regions are not unique anatomy.

| Area | Baseline status | Evidence / remaining gap |
|---|---|---|
| Shoulder, scapula, clavicle | Partially Implemented | 12 entries, nine muscle meshes; right-sided only |
| Arm / elbow | Partially Implemented | Nine entries, five muscles; separate joint tissues absent |
| Forearm | Partially Implemented | 12 entries, nine muscles |
| Wrist / hand | Partially Implemented | 30 entries, three intrinsic muscles; source laterality exclusion retained |
| Hip / pelvis / sacroiliac | Partially Implemented | 14 entries, 12 muscles; no separate SI joint tissues |
| Thigh / groin | Partially Implemented | 19 entries, 14 muscles |
| Knee | Partially Implemented | 16 entries, ten muscles; menisci, cruciate/collateral ligaments absent |
| Lower leg | Partially Implemented | 41 entries, 12 muscles |
| Ankle / foot | Partially Implemented | 37 entries, nine muscles; most intrinsic foot muscles absent |
| Cervical region | Partially Implemented | 32 entries, 12 muscles; discs, nerves, vessels absent |
| Thoracic / lumbar back | Partially Implemented | 48 entries, eight muscles; discs, multifidus, quadratus lumborum, latissimus absent |
| Chest / abdominal wall | Partially Implemented | 28 entries, four muscles, seven costal cartilages; rectus and deep abdominal muscles absent |
| Search / orbit / zoom / focus / isolation / layers | Implemented | Existing engine retained; mobile viewer smoke verified |
| Individual hiding / pan / mesh search | Missing at baseline | Added by this candidate |
| Anatomical clinical review | Untested / pending | All 13 manifests retain `anatomicalReview: pending` |
| Full authenticated regression | Blocked locally | Native Node/Miniflare failure and local migration timeout; CI verification required |

Remote branches inspected include the primary anatomy branch, older bilingual/completion branches, Apple integration and LAB team management. Anatomy PRs #15, #20, #25 and #26 remain open, with no merged timestamp. Team-management is divergent (52 commits unique to it, 133 unique to this base); it was not blindly merged or reset. Historical integration documents are checkpoints, not proof of current deployment.

## Changes

- Individually hide a mesh, restore hidden meshes, preserve the hidden set per model, filter unknown persisted IDs, and respect hidden layers during isolation.
- Preserve deliberate hiding when reloading a muscle deep link. Reveal a newly requested muscle when the selection prop changes.
- Search actual model structures using existing Hebrew/English normalization; retain current selection in the list while filtering.
- Four touch-sized pan controls translate camera and target together without changing zoom. Arrow direction describes displayed model movement. Existing scroll/orbit touch handling remains.
- Complete seven missing innervation fields in both languages: latissimus dorsi, erector spinae, multifidus, rectus abdominis, internal oblique, transversus abdominis and quadratus lumborum. All 98 authored cards now have innervation and a reference. No new exercises or training plans.
- Add regression coverage and a real-GLB browser harness independent of Workers; make the existing full browser evidence directory portable. Add the viewer browser check to CI for anatomy completion branches.

No new geometry, joint tissues, left-side meshes, medical validation, private data access or database migrations are claimed.

## Sources and verification boundaries

BodyParts3D license was checked on its official page: CC BY 4.0 with required attribution. All 13 live LAB assets were fetched read-only and their SHA-256 hashes matched the base assets. That proves byte identity, not anatomical correctness.

Seven new innervation summaries were checked against:

- https://rad.uw.edu/muscle-atlas/latissimus-dorsi
- https://medicine.uams.edu/neuroscience/education/medical-school-courses/human-structure-module/anatomy-tables/muscle-tables/muscles-of-the-back-region/
- https://medicine.uams.edu/neuroscience/education/medical-school-courses/human-structure-module/anatomy-tables/muscle-tables/muscles-of-the-abdominal-region/
- https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html

No protected illustrations were copied. Netter, Sobotta and Gray reference volumes were not accessible in this session and were not claimed as checked. Clinical review of origins, insertions, orientation, fiber direction, relationships and motion remains outstanding. The new content metadata explicitly distinguishes source checking from clinical approval.

## Local evidence

- 67 anatomy tests passed, including asset budgets/hashes/bindings, exercise IDs, bilingual content, hiding and complete innervation fields.
- TypeScript passed. Standard standalone build passed; isolated LAB build and static isolation preflight passed.
- Real Chromium software WebGL, simulated 390×844 mobile: 16 viewer checks passed; all 13 GLBs loaded; one canvas retained across transitions; zero uncaught browser errors. This is a viewer harness, not full app/physical iOS or Android acceptance.
- Full isolated test run: 1,384 passed, one native-process failure in `google-calendar-worker.test.mjs`. Node 24.22 and bundled 24.19 abort at `node::InternalCallbackScope::Close`; Node 22.23.4 stalled. Tests were not disabled or weakened.
- Full application browser smoke stopped at local D1 migration timeout before browser assertions. The separate viewer harness does not replace authenticated regression.
- A separate code review found and led to fixes for deep-link hidden-state restoration and reversed pan direction.

## Release status

Implemented, Tested, Deployed and Anatomically Verified are separate statuses. Local successful builds are not deployment evidence. New LAB release is gated on a passing complete regression run and integration acceptance. Main, Production, remote data and user programs remain untouched.

Next priorities: unblock the Workers regression in Linux CI; validate actual integrated application/navigation; complete source-backed absent geometry and the 38 catalog records without authored cards; obtain clinical review before marking anatomy verified. Preserve divergent LAB features when preparing a release.
