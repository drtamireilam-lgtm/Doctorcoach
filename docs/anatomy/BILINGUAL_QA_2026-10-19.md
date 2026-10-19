# Bilingual anatomy prototype — 19 October 2026

Branch `feature/anatomy-bilingual-20261019`, based on the separate anatomy prototype at `1dcb0a55f8aac570752e6d4d274ce6d8b9b17fa4`. No Production integration, deployment or imported third-party model/media.

## Implemented

- Language switch with browser-local language preference only; Hebrew RTL and English LTR. Selection, camera, zoom, layers and animation state are preserved when switching language.
- All 15 retained muscles have translated location, origin, insertion, innervation, action and coaching note, plus a plain-language explanation in both languages. Existing English text and identifiers remain; translations do not create new clinical claims. Both names stay visible. The English heading is the standard anatomical muscle name; deltoid parts remain labeled as parts.
- Every UI control, layer, navigation action, error, schematic-motion warning and exercise role is localized. The three existing linked library exercises have Hebrew labels and retain their original IDs.
- Selected name and detail navigation appear directly below the model. Details remain inside the app with a return-to-model control. Optional source links do not replace the internal content.
- Canvas context-loss handling unmounts the failed renderer and keeps the muscle list and readable details usable. Rendering exceptions and unsupported WebGL have a localized textual alternative.
- Lazy 3D viewer chunk: main entry is approximately 252 kB / 78 kB gzip, with a separate approximately 936 kB / 247 kB gzip viewer. Previously the entry was approximately 1,186 kB / 324 kB gzip. This reduces the initial entry, not total bytes and not a measured phone loading-time improvement. Demand rendering, DPR cap 1.5 and low-power preference retained/set. No real-device FPS or memory measurement.
- Logical CSS alignment, wrapping controls and responsive canvas height for small screens.

## Content source check and limits

Existing concise attachment/action/nerve summaries were cross-referenced against professional university anatomy tables on 19 October. No source prose, anatomical image, donor photograph or mesh was copied. Hebrew text is a translation of the retained draft summaries. All geometry, biomechanical accuracy, exercise-role interpretation and clinical teaching use still require a qualified review; the draft warning remains visible in both languages.

Sources inspected:
- UAMS Department of Neuroscience — Muscles of the Upper Limb: https://medicine.uams.edu/neuroscience/education/medical-school-courses/human-structure-module/anatomy-tables/muscle-tables/muscles-of-the-upper-limb/
- UAMS — Nerves of the Upper Limb: https://medicine.uams.edu/neuroscience/education/medical-school-courses/human-structure-module/anatomy-tables/nerve-tables/nerves-of-the-upper-limb/
- Texas Tech anatomy tables — axilla/posterior shoulder/arm: https://anatomy.ttuhscep.edu/musculoskeletal_system/axilla_tables.html
- OpenStax Anatomy & Physiology 2e 11.5: https://openstax.org/books/anatomy-and-physiology-2e/pages/11-5-muscles-of-the-pectoral-girdle-and-upper-limbs

NCBI pages encountered a browser-verification wall and were not treated as successfully read. Sources corroborate summary facts, not complete field-level certification or the schematic geometry. No nerve-root expansion or exercise prescription was inferred.

## Actual checks

`npm ci`, `npm test`, `npm run build` and `npm run anatomy:build`: PASS. Root suite reports 10 foundation and 6 profile/RLS tests. Existing anatomy script validates 15 records, geometry parameters, all deep links, selection policy, zoom bounds, exercise references, CPU raycasts and animation limits. Added bilingual script validates 15 × 2 languages × 7 content fields, complete UI-key parity, script/language content, storage failure behavior, directions, existing linked exercise translations and static lazy/context-loss/demand-rendering wiring. These scripts are not browser/touch tests.

CI now includes this feature branch and an explicit isolated anatomy build in addition to existing root checks. Remote CI result must be checked on the saved commit.

## Still unverified

Real iPhone/Android touch orbit/pinch/tap, actual viewport screenshots, WebGL recovery on devices, assistive technology, GPU memory/FPS, clinical sign-off and integration with the full standalone app. This prototype stays separate. No passing end-to-end LAB-to-anatomy journey is claimed.
