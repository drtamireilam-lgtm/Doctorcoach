# Four anterior forearm learning cards

Base: PR #36 at `a7e1e62`. This stacked candidate adds four original bilingual cards to existing canonical catalog entries. Authored cards rise from 104 to 108; 28 of the 136 records remain without authored cards. Existing UI, source-review notice and navigation are reused.

| Canonical slug | University of Washington reference | Review focus |
|---|---|---|
| flexor-digitorum-superficialis | https://rad.uw.edu/muscle-atlas/flexor-digitorum-superficialis | Middle phalanx/PIP action; median nerve |
| flexor-digitorum-profundus | https://rad.uw.edu/muscle-atlas/flexor-digitorum-profundus | Distal phalanx/DIP; median AIN digits 2–3, ulnar digits 4–5 |
| flexor-pollicis-longus | https://rad.uw.edu/muscle-atlas/flexor-pollicis-longus | Thumb distal phalanx/IP with MCP contribution; median AIN |
| palmaris-longus | https://rad.uw.edu/muscle-atlas/palmaris-longus | Palmar retinaculum/aponeurosis attachment, not a finger phalanx |

The four UW pages and [UAMS upper-limb table](https://medicine.uams.edu/neuroscience/education/medical-school-courses/human-structure-module/anatomy-tables/muscle-tables/muscles-of-the-upper-limb/) were read on 24 October 2026. FDS radial-origin and FDP ulnar-origin fractions differ between summaries; the candidate uses supported attachment locations without presenting a disputed fraction as exact. The external WUSTL page could not be freshly fetched and is not claimed as a checked source for this batch. No copyrighted university illustrations were copied.

All cards retain `reference-checked; clinical review pending`, the dated references and empty exercise links. Source checking is not clinician approval. Generic grip exercises were not assumed to isolate these muscles. All 13 GLBs, source manifests, 210 active relationships/79 exercise IDs and 24 stretch mappings remain unchanged. No geometry is fabricated; the application must retain its missing-geometry notice and clear selection for these slugs.

Verification: six new data checks first reproduce missing-card failures, then require complete HE/EN fields, references and the important nerve/joint distinctions. Existing atlas tests check canonical IDs, bilingual content and asset integrity. The full browser harness now visits all ten newly authored unmodeled forearm cards in both languages, retaining reload, reference, pending-review, no-substitute-mesh and no-fabricated-exercise assertions. Final executed results are recorded in the PR.

No merge, LAB/Production deployment, medical permission change or real-data access is included. Remaining work includes other missing cards, licensed geometry, both-sided detail and clinical review. A logical next hand-content batch is lumbricals and interossei, with separate median/ulnar and hand/foot identities.
