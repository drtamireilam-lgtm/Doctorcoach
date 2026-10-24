# Unified muscle layer implementation plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task by task.

**Goal:** Add the existing atlas muscles bilaterally over the unified skeleton, preserving source alignment, learning content and regional models.

**Architecture:** A new combined musculoskeletal GLB contains the unchanged 201 skeleton structures plus 178 selectable muscle structures (89 existing groups on each side, 214 original muscle ELEMENTs). Retain the separate skeleton and old body map. Fresh Learn overview opens bones and muscles; explicit skeleton/body URLs remain compatible. Existing viewer layer controls toggle bones/muscles independently. Side-specific mesh IDs carry a separate canonical learning ID; same-side source matching controls regional-detail links.

**Tech stack:** Existing React/Three.js viewer, Python/NumPy conversion, verified BodyParts3D 4.0 source, existing Node/browser tests. No new runtime dependency.

**Spec:** User requested muscles as the next layer after approving the unified skeleton foundation. Implementation choices above are builder decisions within that request.

## Global constraints

- Separate codex branch based on PR #38; draft stacked PR only. No merge or deployment.
- Preserve existing assets, shared metre/Y-up coordinates and actual source laterality. No newly mirrored geometry or invented anatomy.
- Clinical review pending; 89 groups are partial coverage, not all human muscles. Keep explicit missing anatomy. No new medical content or invented exercise links.
- Verify source hashes, per-side identity, source duplication and measured asset budget before shipping.

## Review focus

- Both sides must remain individually selectable, hidden and isolated, with matching labels.
- Learning cards/exercises must use existing canonical IDs; anatomical left detail must never open right-only geometry.
- Bone positions and the skeleton-only mode must remain unchanged.
- Layer toggles, reload, navigation history and mode switches must own only one canvas.
- Large-asset rendering must be verified in browser; physical mobile performance remains unapproved.

## Tasks

- [x] Write failing model/coverage/alignment/learning identity/layer/default-route tests.
- [x] Build a deterministic explicit bilingual muscle catalog from existing regional inventories and official contralateral mappings, excluding overlapping upper-trapezius when full trapezius is present.
- [x] Fetch the 214 muscle ELEMENTs with bounded ZIP ranges and CRC checks; preserve source provenance. Build combined asset using validated skeleton buffers and original muscle geometry.
- [x] Register combined model; add overview choice and default; map learning cards and exercise history through canonical IDs while preserving side-aware detail routing.
- [x] Extend viewer and full-application browser checks for layers, bilateral picking/selection, card/exercise round trip, reload, and the skeleton-only mode.
- [ ] Run anatomy/unit/type/browser/build checks, visually inspect front/back with and without muscles, request independent review, push draft PR and verify current-head CI.

Ruling: Publish lossless gzip rather than the 31.24 MiB raw combined GLB — Workers individual static assets are limited to 25 MiB; this preserves every original triangle and position. The 23.92 MiB package has its own checksum/budget; the browser bounds decoding and then verifies the original GLB. No new runtime dependency. Tests cover all models' hosted sizes and compressed corruption/decoded overflow.
