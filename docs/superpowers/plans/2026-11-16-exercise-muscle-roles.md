# Exercise muscle roles Implementation Plan
**Spec:** docs/superpowers/specs/2026-11-16-exercise-muscle-roles-design.md
**Execution:** Native inline; one fresh whole-branch reviewer.
## Review Focus
No runtime name inference or invented custom mapping; all regular exercise IDs resolve; aliases and inverse links; precise anterior/lateral/posterior part membership and honest partial coverage; category colours remain on selection and reset on overlay off; identical text/colours in exercise and atlas; no extra GPU scene; HE/EN/mobile and existing program/pain workflows preserved.
### Task1: Explicit role registry
- RED press assisting muscles, anterior-only geometry, variant coverage, unknown/alias and reverse links.
- Add explicit variant profiles using existing curated links/authored descriptors; preserve stretch targets and source review status.
- Shared friendly bilingual role names and exact geometry match; coverage human-readable.
### Task2: Visible roles UI and rendering
- RED role-summary component and selected-role colour behavior.
- Reuse one grouped coloured summary in exercise links and atlas; title/focus button/annotation role badge.
- Keep role colour when selecting a mesh; no extra renderer or automatic workout changes.
### Task3: Acceptance/release
- Extend actual synthetic app browser coverage for bench anterior-only role overlay, selection, reset, partial model and mobile labels.
- Focused/typecheck/full CI, independent review and substantive fixes; merge/LAB release, read-only public live smoke.
