# Unified muscle layer — 2026-10-24

## Result and scope

Fresh Learn overview now opens a combined skeleton and muscle model. `#learn?atlas=musculoskeletal` selects it explicitly. `#learn?atlas=skeleton` and `#learn?atlas=body` preserve the skeleton-only and original navigation-map modes. The existing viewer toggles bones/muscles independently and supports bilingual search, selection, hide/restore, isolate, focus and saved camera/layer state. Regional assets and medical content are preserved.

The combined model contains 201 existing skeleton structures and 178 muscle structures: 89 existing regional muscle groups per side, using 214 distinct original muscle ELEMENTs. These are source/UI counts, not a count of every human muscle. Existing grouped heads and scalenes remain grouped; full trapezius replaces the overlapping upper-trapezius entry. Canonical `learningId` values preserve existing cards and exercise associations while mesh IDs distinguish sides. Left-side cards and exercises are available inline. A separate left regional/card navigation button is withheld where it would open a right-only model. Returning from an exercise restores the combined overview and selected side.

## Geometry and provenance

Official [BodyParts3D downloads](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html), [licence and attribution requirements](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html). The asset includes the required CC BY 4.0 attribution and original per-ELEMENT hashes/mapping rows. The explicit catalog is `scripts/anatomy/musculoskeletal-parts.json`, derived from the existing regional inventories and exact officially named contralateral mappings. Each source is included once. Source geometry and side/position consistency are checked before conversion.

All 201 bone position buffers are retained byte-for-byte from the validated skeleton. Muscle coordinates use the same millimetres XYZ → metres X,Z,-Y conversion as regional models. All source triangles are retained; no newly generated mirroring, bone repositioning, cropping or mesh simplification. The official source contains M-suffixed elements: preserving them does not claim that both sides were independently acquired.

- Decoded GLB: 32,752,504 bytes (31.24 MiB), within the 32 MiB decoded application budget.
- Published lossless gzip package: 25,084,865 bytes (23.92 MiB), below the Workers 25 MiB individual static-asset limit. The raw intermediate is not published.
- Package SHA256: `1bf7c14973d3b8247f454dac591784be4c5c6623cd77b8ff75a9ff59cb828f12`.
- Triangles: 1,501,926, including 512,450 skeleton and 989,476 muscle triangles.
- GLB SHA256: `e2a429905cf3def79b1e730cf49b1d47239ff3b39dbcb77695ef4f6c7886046c`.
- Muscle ZIP SHA256: `fc417f89b99dca5561f38f33315608246a2e73325bf0bf655cc8abb1f8ae5107`.
- Skeleton base SHA256: `59bb680ea241ad612a716316f1c1f6356279823c05059577ebaddec7951d8248`.
- Official mapping SHA256: `a3de74423f943b0d724ae8f59b3a817f87c423a544f8db98113b1980817cbeaf`.

## Reproduction

Use the source-directory setup documented in `UNIFIED_SKELETON_2026-10-24.md`: official `isa_element_parts.txt` plus the final archive-directory byte range. From `apps/doctorcoach-standalone`, with Python/NumPy and curl:

```text
python scripts/anatomy/fetch-skeleton.py SOURCE_DIRECTORY muscle-subset.zip scripts/anatomy/musculoskeletal-parts.json
python scripts/anatomy/build-musculoskeletal.py muscle-subset.zip SOURCE_DIRECTORY/isa_element_parts.txt
```

The optional catalog argument reuses the bounded ZIP range downloader. Its existing skeleton default is unchanged. Every response length and extracted ZIP CRC is checked; the builder verifies the source mapping and skeleton checksum, unique source/geometry identity, official side labels and geometric laterality. It refuses inventory or budget drift. For compressed responses the browser verifies package SHA256 and size before bounded gzip decoding, then verifies the original GLB hash and mesh inventory. If HTTP Content-Encoding already decoded the response, it verifies the decoded budget, original GLB checksum and inventory directly. Existing uncompressed assets use the original path. Raw downloads remain outside the repository. Both model metadata copies use UTF-8.

## Limits and validation

This is partial muscle coverage. Latissimus dorsi, rectus abdominis, internal oblique, transversus abdominis, multifidus, quadratus lumborum and unlisted muscles remain absent. Coccyx, auditory ossicles, teeth, discs, separate tendons, articular/costal cartilage, ligaments, nerves and vessels are also absent. The interface discloses the omissions; model and content clinical review remain pending.

Initial new tests failed because the model/default mode did not exist. A subsequent regression caught reordered biceps component buffers; catalog order was corrected to retain the regional representation. Four targeted muscle tests then passed. A fifth regression failed for the absent lossless transport, then passed with packed/decoded size limits, exact byte identity and corruption rejection. A browser regression exposed transparent HTTP gzip decoding by the local server; admission now supports both representations, with a regression proving already-decoded bytes cannot bypass integrity verification. The anatomy/stretch suite passed 99 tests, with no failures/skips; TypeScript passed. Front/back combined screenshots were visually inspected. Extended browser checks cover actual layer rendering, bilateral selection and learning, hidden/layer reload, Hebrew isolation, exercise round trips and all three overview modes. The local viewer harness passed 20 checks with no browser errors across all 15 GLBs. Independent code review found no actionable defects and confirmed all 178 structures resolve canonical learning cards. Full-application browser/build evidence is recorded in the PR.

The 32 MiB decoded budget and 25 MiB hosting limit are measured packaging constraints, not a performance sign-off. Software WebGL and simulated mobile viewports do not establish physical phone performance. Validate loading, memory and interaction on representative devices before LAB acceptance; if reduction is needed, preserve the original high-detail source and clinically check any derived mesh. No deployment, main merge, production changes, database changes or medical-permission changes are part of this work.
