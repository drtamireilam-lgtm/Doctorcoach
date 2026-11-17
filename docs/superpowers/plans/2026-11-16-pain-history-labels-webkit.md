# Stable pain labels and WebKit Implementation Plan

**Spec:** docs/superpowers/specs/2026-11-16-pain-history-labels-webkit-design.md
**Execution:** Native inline; one fresh whole-branch reviewer.

## Review Focus
Stable labels across scopes/order, prefix collisions and exact grouping, current model distinction, bidirectional numeric signs/dates, native form controls and semantic table, synthetic-only WebKit scope, no claims of physical Safari/authenticated live acceptance.

### Task1
- RED shared version-label invariance/collision tests and bilingual component label/direction tests.
- Implement shared labels and LTR numeric/date isolation; focused GREEN and typecheck.

### Task2
- Add focused WebKit local fixture/CI job with actual comparison component and synthetic observations, no API writes or 3D substitution.
- Verify HE/EN320/390/430/768 selection/difference/refresh/layout; retain evidence.
- Full app CI, independent review, authorized merge and LAB deployment; public live smoke after release. Report WebKit scope and manual limitations precisely.
