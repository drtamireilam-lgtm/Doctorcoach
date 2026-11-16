# Pain set context and history Implementation Plan

**Goal:** Complete optional exact working-set reference and comparable private pain history.
**Spec:** docs/superpowers/specs/2026-11-16-pain-set-history-design.md
**Execution:** Native inline, one fresh final reviewer.

## Global Constraints
Owner/consent/deletion barriers and retry identities remain; no migration, public health data, auto-treatment, geometry changes or Production release. Working-set ordinal is historical at report time; compare same model/side/structure/timing/exercise only.

## Review Focus
Stale repeated-exercise/set selection, zero index, cardio rejection, server TOCTOU guard, immutable idempotency, legacy JSON, comparison sample ordering and false precision, mobile overflow, account changes and draft preservation.

### Task 1: Working-set context
- RED parser/store/UI-context tests for zero, malformed/missing/foreign/cardio/race set references.
- Extend optional JSON field and session resolver validation; keep atomic items_json guard.
- Add working-set choices from exact session occurrence; reset on exercise/occurrence change, freeze retry payload, historical ordinal display.
- GREEN focused pain suite and typecheck.

### Task 2: Private comparison
- RED exact comparability, sorting, zero and empty/single/legacy sample tests.
- Add pure selector and accessible bilingual history comparison, one dated table and explicit numeric difference.
- Extend existing synthetic browser acceptance at320/390/430/768 HE/EN for set payload and history filters; preserve privacy and draft checks.
- Full suite, build and browser CI; fresh final review; reviewable PR, authorized merge/LAB deployment and public live smoke.
