# Simple Mode — one anatomy map and linked learning guides

2026-10-10. The learning area previously rendered the detailed body map plus a
second schematic map inside an extra-learning disclosure. Guides used component
state only, so an article could not be linked/shared or restored by browser history.

The area now has two native navigation destinations: Body map and muscles, and
Guides and effort. The existing detailed map/muscle pages remain intact. Guides
retain all four existing topics and source/feedback links, with a direct local
`#learn?article=...` link for each. Back/forward and reopening links restore the
guide; unknown article values fall back to the body map. The redundant schematic
map was removed. Topic navigation uses native links and current-page labels.

The effort guide now describes existing RIR equivalence and the actual effort-
adjusted e1RM/intra-session load implementation instead of its stale reps-only
description. No dosing, anatomical facts or clinical approvals were introduced.

Verification: navigation regression tests, TypeScript, full suite and production
build. Browser history interaction/visual layout remains pending live acceptance.
Realistic muscle-specific inline imagery/animations and clinical content approval
remain separate gaps; this release does not claim them completed.
