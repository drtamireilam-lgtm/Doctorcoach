# Upper-limb atlas extension

Branch: feature/anatomy-asset-safety-stage36. Continues 7390433051d42e280f015c18287c3fbf33b60787 without changing authentication, Smart Load, program imports, permissions or database data.

## Available geometry

Right shoulder remains unchanged (12 structures). Arm now has nine structures including coracobrachialis. A dedicated forearm model has humerus, radius, ulna and nine muscles: brachioradialis, flexor carpi radialis/ulnaris, extensor carpi radialis brevis/longus, extensor carpi ulnaris, pronator teres/quadratus and supinator. Hand contains 27 bones (eight carpals, five metacarpals, fourteen phalanges) and three thumb muscles: abductor pollicis brevis, adductor pollicis and opponens pollicis.

Arm 947,864 bytes / 46,834 triangles; forearm 803,624 / 31,306; hand 329,172 / 12,834. Only the active model is loaded. Tendons, ligaments, nerves, cartilage and unlisted muscles are explicitly unavailable. Hand lacks radius/ulna context geometry. Other body regions remain navigation and learning content with an explicit missing detailed-model notice.

Shared viewer supports visible-mesh selection, highlight, layers, isolation, camera presets and geometry-based focus. Exercise Back retains the current selected muscle and originating model, including muscles appearing in more than one model.

## Source, licensing and reproducibility

BodyParts3D 4.0, The Database Center for Life Science. Official source https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/isa_BP3D_4.0_obj_99.zip and ELEMENT mapping isa_element_parts.txt. CC BY 4.0 permits commercial modification/redistribution with attribution; evidence https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html . Attribution, original file hashes, exact ELEMENT IDs, right-side mapping rows and modifications are preserved in model manifests and public source/license JSON.

fetch-upper-limb.py obtains CRC-checked entries; build-upper-limb.py is the sole arm/forearm/hand producer using upper-limb-parts.json. build-atlas.py now produces only the body navigation surface. audit-upper-limb.py compares packaged float32 positions and all triangles to original OBJ files, verifies right-side identity and unique selection materials: 63 structure instances passed across shoulder/arm/forearm/hand. Repeated context bones across models are intentional. No anatomy is synthesized.

Deltoid learning illustration now uses original uncolored public-domain Carter/Gray 1918 plate 410, eliminating the misleading colored derivative. Biceps and coracobrachialis use original labeled plate 411 instead of the partial forearm plate. Exact printed labels are provided; source metadata and public-domain evidence: https://commons.wikimedia.org/wiki/File:Gray410.png and https://commons.wikimedia.org/wiki/File:Gray411.png . No modern Netter, Sobotta or copyrighted atlas images were copied or compared.

## Content status

Bilingual attachments, actions, joints, training context and innervation for the modeled muscles were checked against UAMS upper-limb muscle tables and University of Washington Muscle Atlas. ECRB origin is the lateral epicondyle. FPB innervation is qualified for documented median/ulnar variation (https://pubmed.ncbi.nlm.nih.gov/29290870/). This is reference checking and source-fidelity verification, NOT documented clinical validation. Clinical review remains pending.

Existing canonical exercise records and role distinctions are reused. Generic grip exercises are assisting links for appropriate thumb muscles; APB has no invented thumb-abduction exercise link. Hebrew RTL and English LTR are retained.

## Acceptance evidence

Automated results and screenshots are stored alongside this report. Tests cover geometry validation and swapped node/mesh binding rejection, real rendered selection/focus/isolation, bilingual layout, exercise navigation, source images, mobile gestures, missing geometry, retry, WebGL cleanup and responsive layout. Browser acceptance uses touch-emulated Chromium with software WebGL, not a physical iPhone/Android. No new physical-device review or clinician review was performed.

Deployment target is exclusively doctorcoach-isolated-staging, Supabase project jbfkzkzcznfacsjdawmf. No main merge, Production deployment or database changes are authorized.

Local acceptance: typecheck passed; 1,368 unit tests passed (zero failed/skipped); standard build and isolated standalone build passed; static LAB target check passed; 34 rendered browser checks passed with zero uncaught or server errors.

## Source laterality discrepancy excluded

Live screenshot inspection exposed an FPB source inconsistency: the official table labels FJ1469M as right flexor pollicis brevis, but its unmodified coordinates place it at positive X, opposite all 27 right hand bones (negative X). Keeping it would show a disconnected contralateral muscle and distort camera fitting. FJ1469M is excluded, with the missing structure recorded explicitly. No mirroring or relabeling was performed. The learning card remains available without geometry. Build/audit scripts and a geometry regression check now require right-side spatial coordinates as well as source metadata. The geometry/source-fidelity count is 63, not clinical validation.
