# Missing import variants — 2026-10-26

## Result

Added ten canonical records without changing any of the original 173 IDs. The six exercise types cover seated machine leg press, incline machine chest press, machine lateral raise, machine biceps curl, straight-leg cable hip flexion and parallel-bar dips. Four pulldown records distinguish narrow/wide grip and implement-neutral parents versus explicit cable execution. Existing Hammer records remain separate.

Catalog now has **183 exercises**, all with **15+ normalized bilingual aliases**. Added **183 normalized per-ID alternatives**, bringing the total to **3,224 (+2,693 over the 531-alias base)**. Token-distinct total: **3,044**. All ten new IDs independently exceed 15 even when word-order equivalents are collapsed. Collisions and literal parent-overlap diagnostics remain 28; no new collision introduced. Full names/counts are in aliases.csv, coverage.md and alias-audit.json.

| ID | Normalized alternatives | Token-distinct alternatives |
|---|---:|---:|
| seated-leg-press | 17 | 15 |
| incline-machine-chest-press | 19 | 16 |
| machine-lateral-raise | 21 | 19 |
| machine-biceps-curl | 21 | 17 |
| cable-straight-leg-hip-flexion | 16 | 15 |
| parallel-bar-dip | 20 | 20 |
| wide-grip-cable-pulldown | 18 | 17 |
| narrow-grip-cable-pulldown | 19 | 18 |
| movement-wide-grip-pulldown | 16 | 16 |
| movement-narrow-grip-pulldown | 16 | 16 |

## Variant boundaries

- Seated leg press specifies posture and machine, **not a horizontal/45-degree sled angle**.
- Machine biceps curl does not assume a preacher pad, a seated posture, cable attachment or unilateral execution. Machine lateral raise similarly leaves posture unspecified.
- Straight-leg cable hip flexion preserves knee extension and cable equipment, but does not infer standing versus lying. It is distinct from hip extension/kickback and from unsupported generic hip flexion.
- Parallel-bar dip excludes bench, rings, assisted-machine and explicitly weighted-name variants. The normal load field still supports explicit external load in a prescription; body mass and assistance are not inferred as that load.
- Generic wide/narrow pulldown names resolve to grip-specific general parents only in opted-in import policy. Cable words select cable variants; Hammer words retain existing Hammer IDs. Narrow grip alone does not mean neutral or supinated grip.
- New records include equipment/family metadata for coach filters. Existing records and IDs remain intact; no shared-dictionary learning or remote schema change is introduced.

## Source-workbook comparison

Same five authorized development workbooks, same extraction: **191 rows**. Automatic assignments **106 →117 (+11 occurrences)**; all 106 old automatic targets unchanged. All 9 previously missing-variant rows now match, plus 2 narrow-grip rows. Compared with base #50: **95 →117 (+22)**.

The remaining 74 rows are 46 missing names, 2 possible headings, 22 ambiguous variants, 3 questions/alternatives and 1 instruction. No row is silently discarded. The corpus includes duplicate rows/sheets and has no independent labels, so 117/191 is development coverage, not precision/recall. Original files, source filenames/sheet names and prescriptions remain outside Git.

## Validation

- Full application suite: **1,508 pass, zero fail/skip**. One old assertion deliberately expected incline machine press to be unsupported; it was updated to the new exact ID while preserving the adjacent unsupported-case checks.
- Five new variant tests verify distinct IDs, metadata/family/equipment search, >=15 bilingual names per new ID, negative neighboring variants and all 10 IDs through local DB draft save, assignment, workout and reload.
- A new diagnostic regression verifies newly supported names no longer show missing-variant warnings. Known custom aliases/canonical names are respected too.
- Frozen 32-case benchmark unchanged:15 correct automatic, zero wrong, 15/21 resolvable coverage; small/nonrepresentative.
- Actual 12 local Chromium UI flows cover all 10 additions through real CSV/XLSX/text-PDF parsing into exact draft callback IDs/doses, alongside manual seated/lying curl choice, explicit blank/heading skip and 4 actual JSON downloads. Both languages and 390 px/1440 px pass; no viewport overflow, browser errors, external requests or API writes. See local-browser.json.
- TypeScript and targeted changed-file lint pass. Isolated build/static configuration and built local Worker authentication/authorization smoke are run before push. Full-app lint remains pre-existing debt.

Browser evidence is a synthetic local harness, not authenticated live coach saving, Safari/iOS or LAB acceptance. The independent names-only persistence journey uses actual local DB stores separately. No merge, deployment or remote data/schema mutation.

## Terminology evidence and limits

Original app descriptions are authored summaries; no external images/video copied. The following primary pages were checked for movement/implement distinctions on 2026-10-26:

- Precor Discovery products: https://www.precor.com/en-US/strength/plate-loaded/discovery/all — distinguishes incline versus flat/decline machine press, biceps curl machines, angled sled leg press and pulldown machines with multiple grip choices. A generic grip name therefore does not prove cable equipment.
- Precor Resolute: https://www.precor.com/en-GB/strength/selectorized/resolute — lists seated leg press and distinct seated/standing lateral-raise machines. The generic lateral-raise record deliberately does not infer posture.
- ISSA dip guide: https://www.issaonline.com/blogs/corrective-exercise/mastering-triceps-dips-proper-form-variations-and-more — distinguishes parallel-bar, bench, assisted and resistance-added dip execution.

Straight-leg cable hip-flexion wording is a literal definition from the authorized source exercise name, retaining unspecified body posture. It is not presented as an independently validated protocol. Coach terminology review and representative labeled import evaluation remain release gates; no new anatomy mesh, motion, media or clinical approval is claimed.

Independent review removed an equipment-only incline chest name that did not prove pressing, and broad vertical-pull family names that could also describe pullups. A regression reproduced unsafe assignment before removal and passes after. Two unnatural seated-press descriptions were also removed; the attested `Seated leg-pess` typo is retained (publisher terminology: https://www.israelbody.org/articles/legs). The source-workbook targets remain unchanged by these removals.
