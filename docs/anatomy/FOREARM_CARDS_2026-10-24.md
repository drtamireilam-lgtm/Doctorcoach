# Six posterior forearm learning cards

This candidate adds six original bilingual educational summaries to existing canonical records. Authored cards increase from 98 to 104; the catalog remains 136 records, leaving 32 without authored cards. No GLB, manifest, exercise link, stretch target, permission or deployment change is included. The base is PR #35 at `80a9415`; this is a stacked follow-up, not a merge of that PR.

Each new card includes location, origin, insertion, action, joints, training context, innervation, source URL and dated reference-check metadata. An explicit Hebrew/English notice displays that clinical content review is pending. Referencing a source does not mean a clinician has approved the card. No protected university illustration is copied.

| Canonical slug | Primary reference | Distinction retained |
|---|---|---|
| extensor-digitorum | https://rad.uw.edu/muscle-atlas/extensor-digitorum | Finger 2–5 extension and wrist assistance |
| extensor-digiti-minimi | https://rad.uw.edu/muscle-atlas/extensor-digiti-minimi | Little finger, not thumb |
| extensor-indicis | https://rad.uw.edu/muscle-atlas/extensor-indicis | Index finger extensor expansion |
| abductor-pollicis-longus | https://rad.uw.edu/muscle-atlas/abductor-pollicis-longus | First metacarpal insertion and thumb CMC action |
| extensor-pollicis-brevis | https://rad.uw.edu/muscle-atlas/extensor-pollicis-brevis | Proximal phalanx insertion and MCP extension |
| extensor-pollicis-longus | https://rad.uw.edu/muscle-atlas/extensor-pollicis-longus | Distal phalanx insertion and IP extension |

All six were cross-checked on 24 October 2026 against the [UAMS upper-limb muscle table](https://medicine.uams.edu/neuroscience/education/medical-school-courses/human-structure-module/anatomy-tables/muscle-tables/muscles-of-the-upper-limb/). The UW EPB action line names the carpometacarpal joint; the candidate uses MCP as identified by UAMS and the [Washington University hand evaluation table](https://nervesurgery.wustl.edu/evaluation-and-management/by-region/hand-2/). EPL is described by its IP action, without implying that this is its only contribution. No isolated-exercise or treatment claim was inferred from an anatomical action.

All new `links` arrays are empty because a reviewed canonical exercise mapping for these individual muscles has not been established. The current 210 relationships/79 distinct active exercise IDs and 24 stretch mappings remain intact. The existing missing-geometry notice is retained; a learning card must not select a substitute mesh. New 3D geometry, left-side anatomy, textbooks, clinical sign-off and physical-device acceptance remain outstanding.

Verification plan: eight new data regression checks, existing anatomy/asset/bilingual/exercise-ID tests, TypeScript and full regression. The real app browser harness visits all six cards in Hebrew and English, validates pending status and references, checks reload and missing geometry, and asserts no invented exercise buttons. Final executed results are recorded in the PR.

Safety: no main merge, remote database access, medical permission changes, LAB deployment or Production deployment. Next content batch can cover flexor digitorum superficialis/profundus and flexor pollicis longus, preserving the median/ulnar split and distinct PIP/DIP/IP actions with independent sources and review.
