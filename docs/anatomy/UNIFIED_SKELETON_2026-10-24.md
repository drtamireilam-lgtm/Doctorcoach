# Unified skeleton — 2026-10-24

## Result

The Learn overview now opens a single bilateral whole-body skeleton. `#learn?atlas=skeleton` selects it explicitly; `#learn?atlas=body` retains the original region map. Existing regional assets and learning cards are retained. Selection, search, hide/restore, isolate, focus, and Hebrew/English labels use the existing viewer. Regional detail links require a matching source element on the same side; a left bone never opens right-only regional detail. A direct or refreshed region URL retains the historical body-map return default.

## Audited inventory

201 selectable structures contain 205 distinct BodyParts3D ELEMENT meshes: 84 left, 84 right, 33 midline structures. These are interface/source counts, not a claim that the model contains every anatomical bone. The sternum combines three components and foot sesamoids are grouped by side. The downloaded 206-element subset contains one exactly duplicated hyoid (FJ2772), excluded after comparison against FJ3201.

Coverage includes skull/hyoid, spine and sacrum, ribs/sternum, bilateral shoulder girdles, arms, hands, pelvis, legs and feet. Source positions remain shared across the body: millimetres XYZ become metres X,Z,-Y. No per-bone recentering, mirroring, welding or invented joint tissue. All 512,450 source triangles are retained. The self-contained GLB is 10,077,308 bytes, below the 12 MiB budget.

Missing: coccyx, auditory ossicles, teeth, intervertebral discs, articular/costal cartilage, ligaments, muscles, nerves and vessels. The skeleton remains pending clinical review. Physical-device performance and clinical completeness have not been signed off.

## Provenance and reproduction

Official [BodyParts3D download](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html) and [CC BY 4.0 licence](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html). Source attribution and per-element hashes are embedded in both manifests. Source archive: `isa_BP3D_4.0_obj_99.zip` (142,903,898 bytes).

From the official LATEST download directory, save `isa_element_parts.txt` and bytes 142700000–142903897 of that archive as `archive-directory.bin` in a source directory. The fetch script requests bounded ranges and verifies exact response sizes and each extracted entry's ZIP CRC. Raw downloads are not committed.

From `apps/doctorcoach-standalone`, using Python with NumPy (validated with 2.3.5) and curl:

```text
python scripts/anatomy/fetch-skeleton.py SOURCE_DIRECTORY skeleton-subset.zip
python scripts/anatomy/build-skeleton.py skeleton-subset.zip SOURCE_DIRECTORY/isa_element_parts.txt
```

Mapping SHA256: `a3de74423f943b0d724ae8f59b3a817f87c423a544f8db98113b1980817cbeaf`.
GLB SHA256: `59bb680ea241ad612a716316f1c1f6356279823c05059577ebaddec7951d8248`.
Two independent conversions produced the same GLB hash. Manifest writes explicitly use UTF-8.

## Validation

- Anatomy/stretch suite: 92 passed, no failures or skips, including seven new skeleton tests.
- TypeScript: passed.
- Viewer browser harness: 18 checks passed, no browser errors; all 14 GLBs loaded. Tested bilateral selection, independent hiding/restoring, source-safe regional links, Hebrew RTL and mobile viewport. Front/back screenshots visually inspected.
- Added two full-application browser scenarios (English and Hebrew): default skeleton, persistence, regional round trip and original-map toggle. Full application CI results are recorded in the PR.
- Independent static review found no actionable findings.
- Initial local isolated build exceeded its 180-second wrapper limit; retry and CI outcomes are recorded in the PR. No deployment was performed.

## Next step

Review this common skeletal foundation in LAB only after owner approval, then validate anatomical coverage and joint spacing clinically before adding finer bones and subsequent layers. Keep regional detail and exercise links attached to existing identifiers. Do not merge the stacked PR chain or deploy implicitly.