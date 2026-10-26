# Clinical learning — LAB implementation and source review

Review date: 2026-10-24. This is an educational literature summary, not approval by Dr. Tamir, individual dosing, diagnosis or a treatment service.

## Implementation

LearningArea retains one main-navigation destination. Three internal sections use `#learn`, `#learn?section=physiology` and `#learn?section=supplements`. An article ID determines its section even if a contradictory section parameter is supplied. Unknown values fall back safely; old region, muscle, RPE and DoctorCoach routes remain supported.

The typed bilingual catalog in `lib/clinical-learning-content.ts` stores stable IDs, summaries, practical implications, expandable detail, source links, related IDs and review dates. Supplement safety, interactions and consultation criteria are visible without expanding details. Cross-links use existing shareable article URLs; articles receive keyboard focus. Direct clinical routes do not mount the heavy atlas before hash synchronization.

The existing appearance provider, account ownership, preference API, palette presets, storage keys and save behavior are unchanged. `clinical.css` uses semantic tokens, reduces shadows and background decoration, and adds readable cards, spacing and mobile layouts. It does not override medical warning/error colors.

NutritionScope is visible before the authenticated nutrition-data gate and alongside the public nutrition-service catalog. Personal nutrition care belongs to a licensed clinical dietitian. The physician contributes medical assessment, blood-test interpretation and coordination. Disease-specific pathways are explicitly planned and unavailable; no expertise, service availability or outcome is promised.

## Source-to-content map

- ATP and contraction: [OpenStax Anatomy and Physiology 2e, 10.3](https://openstax.org/books/anatomy-and-physiology-2e/pages/10-3-muscle-fiber-contraction-and-relaxation) and [10.4](https://openstax.org/books/anatomy-and-physiology-2e/pages/10-4-nervous-system-control-of-muscle-tension). The summary describes simultaneous energy pathways, calcium/ATP and neural recruitment; it avoids attributing fatigue or delayed soreness to a single metabolite.
- Adaptation: [Currier et al., ACSM position stand, 2026](https://pubmed.ncbi.nlm.nih.gov/41843416/), DOI 10.1249/MSS.0000000000003897; publication independently confirmed by [ACSM](https://acsm.org/science-spotlight-acsm-releases-new-position-stand-on-resistance-training/). Scope is healthy adults, not individualized clinical programming.
- Supplement context: [NIH ODS health-professional fact sheet](https://ods.od.nih.gov/factsheets/ExerciseAndAthleticPerformance-HealthProfessional/).
- Creatine: [Kreider et al., ISSN, 2017](https://pmc.ncbi.nlm.nih.gov/articles/PMC5469049/), DOI 10.1186/s12970-017-0173-z. Kidney cautions also checked against the publicly available abstract of [Filler, Nature Reviews Nephrology, 2026](https://www.nature.com/articles/s41581-026-01121-w), DOI 10.1038/s41581-026-01121-w. The latter is commentary, not a controlled trial; subscription-only full text was not reviewed. Healthy-adult evidence is not generalized to kidney disease, pregnancy or young people.
- Caffeine: [Guest et al., ISSN, 2021](https://pmc.ncbi.nlm.nih.gov/articles/PMC7777221/), DOI 10.1186/s12970-020-00383-4. Interaction with ciprofloxacin checked against [MedlinePlus](https://medlineplus.gov/druginfo/meds/a688016.html). No automatic dosing advice; sleep and individual variation remain explicit.
- Protein: [Morton et al., BJSM, 2018](https://bjsm.bmj.com/content/early/2018/01/18/bjsports-2017-097608), DOI 10.1136/bjsports-2017-097608. The summary distinguishes modest average supplementation effects from a requirement for powder, and emphasizes overall intake. Levodopa caution checked against [NICE NG71, nutrition recommendations](https://www.nice.org.uk/guidance/ng71/chapter/Recommendations); no instruction to reduce protein or change medication timing.

## Verification scope

`tests/clinical-learning.test.mjs` checks section resolution, invalid hashes, legacy compatibility and completeness of the bilingual catalog/reference graph. The existing smart-workout UI regression continues to distinguish RPE guides from the DoctorCoach overview; its hook fixture was updated for the new language context and internal section state.

`scripts/clinical-learning-smoke.mjs` checks actual React UI routes, cross-links, refresh/back, native disclosure keyboard use, RTL/LTR and viewport overflow. Optional `DC_TEST_APPEARANCE_FIXTURE=true` exercises the real appearance UI against an isolated API fixture, allowing light/dark refresh verification without modifying a user account. This is not a claim of authenticated live-account verification. Existing atlas WebGL tests remain separate.

Only `standalone/wrangler.isolated-staging.json` may be used for this release. No schema migrations, main merge, Production deployment or user-data writes are part of this change.
