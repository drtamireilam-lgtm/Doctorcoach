# Anatomy learning popover Implementation Plan

> Execute inline with superpowers:executing-plans and one fresh final review.

**Goal:** Learn and open mapped exercises/stretching without leaving the selected muscle's annotation.
**Architecture:** Small selected-only preview component reusing learningCard, muscleExerciseLinks and exerciseFor; source-aware bilingual search helper; existing navigation preserves camera and selection.
**Tech Stack:** React, TypeScript, Three.js, node:test, Playwright.
**Spec:** docs/superpowers/specs/2026-11-16-anatomy-learning-popover-design.md

## Constraints
- Existing reviewed content/relationships only; no invented anatomy or links.
- Selected subdivisions identify whole-muscle learning scope.
- No source geometry, private records, permissions or database changes; LAB only.

## Review Focus
- Structures without cards or exercise mappings stay honest.
- Selected subdivision never implies unique whole-muscle exercise activation.
- Bilingual search respects hidden layers/sides and source identity.
- Mobile card scrolling must not drag the scene, overflow or obscure all controls.
- Direct exercise round-trip retains model, source selection and camera.

### Task 1: Inline learning and search
- [ ] Add RED tests for learning-name search, curated link groups, empty and parent-scope states.
- [ ] Add helper and compact selected-only component; reuse existing navigation callbacks and bounded annotation layout.
- [ ] Focused/full tests, TypeScript and isolated build; commit.

### Task 2: Acceptance/release
- [ ] Extend real GLB annotation matrix with action summary, direct strength/stretch groups, empty states and bounds in HE/EN at320/390/430/768.
- [ ] Independent review/fix substantive findings; green CI and existing full-app round-trip regression.
- [ ] Authorized integration merge/LAB release and public verification; record manual device limits.
