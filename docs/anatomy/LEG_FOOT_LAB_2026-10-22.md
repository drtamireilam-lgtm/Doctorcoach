# Right lower leg, ankle and foot atlas extension

Continues feature/anatomy-asset-safety-stage36 from fccf8ccbc15e33f8b3fa37c127c5974f64a55f2d. Existing body, shoulder, arm, forearm, hand, hip, knee, Smart Load, program imports, authentication, roles and user data are preserved. No database migration, new runtime dependency or lockfile change.

## Available geometry

Two separately loaded original right-side subsets:
- lowerleg: 1,466,152 bytes / 62,318 triangles, 41 selectable structures. 29 bones (26 major foot bones plus femur, tibia and fibula for attachment context) and 12 calf muscles: gastrocnemius (two heads combined), soleus, plantaris, tibialis anterior/posterior, fibularis longus/brevis/tertius, extensor hallucis/digitorum longus and flexor hallucis/digitorum longus.
- foot: 1,065,096 bytes / 40,340 triangles, 37 selectable structures. 26 major foot bones plus tibia/fibula and nine muscles: tibialis anterior/posterior, fibularis longus/brevis, abductor hallucis, flexor digitorum brevis, extensor hallucis brevis, flexor hallucis brevis (two heads combined), adductor hallucis (two heads combined).

The major foot skeleton consists of seven tarsals, five metatarsals and fourteen phalanges. Sesamoids, ligaments, cartilage, capsules, nerves and unlisted muscles are unavailable. Tendons contained in original muscle assets are not separately selectable or presented as independently modeled tendons. The calf asset excludes intrinsic foot muscles; the foot asset includes only the five listed intrinsic muscles, not the complete intrinsic musculature. Explicit viewer notes and public manifests preserve these limits.

Default calf framing uses actual soleus bounds. Foot framing uses actual talus bounds and a medial view, retaining complete original geometry so users can zoom out or focus a full muscle. Reset uses the configured model default. Existing models retain front defaults and stored user cameras remain restored after initial framing.

## Source and licensing

BodyParts3D 4.0, The Database Center for Life Science, CC BY 4.0.
- Source archive: https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/isa_BP3D_4.0_obj_99.zip
- Mapping: https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/isa_element_parts.txt
- Current license evidence: https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html

Required attribution is preserved: BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International. Official license permits commercial redistribution/adaptation with attribution. No other provider's license is assumed.

leg-foot-parts.json records every selected ELEMENT. Prepared/public manifests record source hashes, mapping rows, modifications and final GLB hashes. Original vertices and triangles are retained, coordinates convert mm XYZ to metres X Z -Y, normals and one unique material per selectable structure are added. No mirroring, fabricated anatomy or cropped geometry.

Both source audit and independent read-only review compared exact float32 vertices and triangles against original OBJ files for all 78 mesh instances across the two assets, along with official right-side mappings, hashes and negative-X placement. Shared bones/muscles across assets are intentional. This is source fidelity verification, not clinical validation.

Rebuild from app directory:
- python scripts/anatomy/fetch-upper-limb.py scripts/anatomy/leg-foot-parts.json /tmp/dc-leg-foot-source.zip
- python scripts/anatomy/build-leg-foot.py /tmp/dc-leg-foot-source.zip /tmp/dc-element-parts.txt
- python scripts/anatomy/audit-upper-limb.py /tmp/dc-leg-foot-source.zip /tmp/dc-element-parts.txt scripts/anatomy/leg-foot-parts.json

NumPy is offline conversion tooling. The existing upper-limb fetch/audit defaults remain intact.

## Bilingual content and exercises

Fourteen new cards complete the newly modeled muscles; existing soleus and tibialis anterior cards gain referenced innervation. Gastrocnemius reuses the previous checked card. Every modeled muscle has bilingual attachments, actions, joints, innervation and training context. Sources are UAMS lower-limb tables and individual UW Muscle Atlas pages; no copyrighted UW illustrations are copied. Fibularis and peroneus naming are synonyms, with canonical library names retained. Flexor hallucis brevis innervation qualifies the lateral head's possible lateral plantar supply.

Clinical review remains pending. Reference checking and source fidelity do not establish documented clinician approval.

Existing canonical exercises are reused: tibialis raise, ankle inversion/eversion with band, standing/seated calf raises, short foot and toe yoga. Roles remain conservative: generic control exercises are assisting links, not isolated intrinsic-muscle strengthening claims. Muscles without an appropriate dedicated exercise link explicitly say so. No exercise database duplication or invented exercise records.

Canonical calf exercise reverse links now resolve to the newly available calf model; a valid current knee or foot context remains preserved on Back. Shared tibialis anterior in the foot model returns to that originating model with selection/camera intact, while canonical reverse navigation can open its calf model.

## Validation

- Three new tests initially failed for missing models/resolution, then passed against actual GLBs.
- TypeScript passed.
- Full unit suite: 1,376 passed, zero failed/skipped.
- Standard build and isolated standalone LAB build passed; static Worker/Supabase LAB target check passed.
- Rendered browser acceptance: 49 checks passed, zero uncaught errors/server 5xx. New cases cover 41/37 structure inventories, calf and foot body navigation, configured medial Reset view, soleus exercise return, intrinsic isolation, short-foot reverse links, shared calf/foot navigation, Hebrew RTL and foot GPU context release.
- Existing shoulder/arm/forearm/hand/hip/knee selection, gesture, invalid GLB retry and scene cleanup cases remain green.
- Independent reviewer found no important actionable defects and independently verified geometry and new unit tests.
- Mobile screenshots were inspected for full calf and side-view foot framing.
- Browser tests use touch emulation/software WebGL. Physical iPhone/Android and clinician reviews were not performed.

Deployment is authorized only for doctorcoach-isolated-staging, Supabase LAB jbfkzkzcznfacsjdawmf. No main merge or Production data/deployment changes. After deployment, live acceptance verifies exact published checksums plus rendered models, default framing, bilingual content and exercise navigation, not Cloudflare Ready alone.
