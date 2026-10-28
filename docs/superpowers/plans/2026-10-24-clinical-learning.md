# Clinical Learning Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans for inline implementation; test each behavioral change before implementation.

**Goal:** Deliver the approved clinical learning expansion in the existing LAB application.
**Architecture:** Extend hash navigation without breaking legacy article or atlas routes. Add a bilingual typed catalog and a focused rendering component; use existing theme/language providers and CSS tokens.
**Tech Stack:** React, TypeScript, Vite/vinext, Node tests, Playwright, Cloudflare Worker.
**Spec:** ../specs/2026-10-24-clinical-learning-design.md

## Global Constraints
- LAB only; no main merge or Production deployment.
- Preserve existing atlas and user appearance preferences.
- Hebrew RTL and English LTR; educational content only, no personal supplement prescriptions.
- Future nutrition services must say planned, unavailable.

## Review Focus
- Old anatomy and article links continue to open their original content.
- Invalid or foreign hashes never select arbitrary content.
- Cross-links select the right section and survive reload/back.
- Long Hebrew/English text fits mobile, including expanded sources.
- Chosen theme persists; clinical CSS does not overwrite palette tokens or medical alert colors.

## Task 1: Navigation and catalog
- [ ] Add failing tests in tests/clinical-learning.test.mjs for section resolution, invalid hashes, legacy compatibility and catalog cross-links.
- [ ] Run red; implement lib/clinical-learning.ts, lib/clinical-learning-content.ts and the backward-compatible lib/learning-navigation.ts extension.
- [ ] Run green and existing learning tests.

## Task 2: Learning and nutrition UI
- [ ] Add browser acceptance script for section links, details, history, legacy guides, keyboard, RTL/LTR, themes and mobile layout.
- [ ] Implement components/clinical-learning.tsx and LearningArea navigation. Add components/nutrition-scope.tsx before nutrition authentication gate and in service catalog; retain service behavior.
- [ ] Add app/clinical.css using existing semantic tokens; import last in layout.
- [ ] Run typecheck, full unit suite, browser acceptance and existing atlas browser tests.

## Task 3: Release evidence
- [ ] Review diff, build standalone with DC_ISOLATED_STAGING_BUILD=true, capture actual screenshots.
- [ ] Commit on codex/clinical-learning-20261024; push only that branch if available.
- [ ] If authorized credentials exist, inspect LAB deployment then deploy only isolated-staging and verify live UI; otherwise document exact blocker.
