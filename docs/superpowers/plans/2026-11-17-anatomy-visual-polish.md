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
