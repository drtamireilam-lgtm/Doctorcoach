# Anatomy Visual Polish Implementation Plan
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans inline; one fresh final reviewer.
**Goal:** Improve anatomical surface readability while preserving all existing interactions.
**Architecture:** Tune existing anatomy-presentation PBR/light helper, shared canvas exposure and isolated stage CSS; no extra renderer/dependency.
**Tech Stack:** Three.js/React/CSS and existing Node/CI Playwright tests.
**Spec:** docs/superpowers/specs/2026-11-17-anatomy-visual-polish-design.md
## Global Constraints
- Preserve meshes/normals/vertexcolours/material maps/IDs, role palette, camera and learning controls; no fake fibre geometry or clinical claims.
- Same existing renderer/pixelratio1.5; no GPU postprocessing/shadow maps.
- Native, one fresh review; scoped featuremerge and exact tested unionLAB only. Task3activeworkout follows this subproject.
## Review Focus
- Back/side surfaces remain readable at whole-body and regional scales.
- Emissive role/selection colours remain distinct after light/exposure change.
- CSSbackground cannot intercept raycasts or overlap annotations.
- Existing motion poses and hidden-layer changes share same source materials.
- HE/ENsmallviewport labels/camera learning return stay stable.
### Task1: Presentation and acceptance
Files lib/anatomy-presentation.ts, lib/anatomy-canvas.ts, components/anatomy-4.css; existing tests/scripts unchanged unless bounded extra screenshots needed.
- [ ] Apply reversible material/light/background polish without anatomy changes; inspect baseline artifact14325828748.
- [ ] Typecheck and full suite; one fresh reviewer and one Important fix pass if needed; commit.
- [ ] Publish scoped feature and preserved unionPR98; allrequiredCIgreen; inspect fullbodyfront/back390screenshots vsbaseline; deployunionLAB,bindings/publicprobeverify.
- [ ] Continue next authorized subproject: active workout UX (less scrolling/quick entry/clear target-vs-achieved/load suggestion), inspect existing behavior and fix confirmed UX friction only.

## Continuation — shared studio backdrop
- User requested continuing anatomy appearance before active workout UX; task3 remains outside this turn.
- Replaced the two remaining flat motion-player backdrops with the existing atlas studio backdrop through one shared stylesheet. Atlas, pain map, exercise demo and joint player now use the same class; sizing and transparent WebGL canvas remain unchanged.
- Fresh independent review: no Critical/Important findings. Explicitly include shared stylesheet in commit.
- Standalone build and TypeScript passed. Initial full-suite run raced detailed asset preparation; rerun after verified preparation.
- Inspected real CI HE320 role screenshot and browser.json: role labels/colours retained, errors empty. CI screenshot evidence does not establish physical Safari acceptance.
- Final local rerun: 2,124/2,124 tests passed (zero failures/skips), TypeScript and standalone build exit0. Compiled CSS contains shared backdrop in both main page and lazy atlas chunks.
- GitHub push blocked by automatic approval review: destination publication needs explicit user authorization. No retry/workaround, no merge or deployment; continuation is committed locally.
- Runtime screenshots for this shared-backdrop continuation remain pending; inspected role screenshots belong to preceding22c8cd6 CI.
