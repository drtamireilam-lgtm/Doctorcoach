# Anatomy live readiness Implementation Plan

> Execute inline with superpowers:executing-plans and one independent final review.

**Goal:** Verify actual public LAB WebGL behavior and finish the two deferred UI/catalog cleanups.
**Architecture:** Fixed-origin read-only live browser probe in its own CI job; shared typed public catalog; mounted unique disclosure targets.
**Tech Stack:** React, TypeScript, node:test, Playwright, GitHub Actions.
**Spec:** docs/superpowers/specs/2026-11-16-anatomy-live-readiness-design.md

## Constraints
- Fixed isolated LAB only, GET/HEAD only, no login, no cookies/secrets/health fixtures sent live.
- Normal TLS; no attempt to inspect or bypass Cloud Browser's blocked internal diagnostic surface.
- No clinical-data, geometry, permission or database changes.

## Review Focus
- Cross-origin/unsafe-method/auth requests are blocked before transmission.
- Actual live asset and rendering failures are distinguished from test-runner failures.
- Collapsed controls always reference unique mounted panels.
- Shared catalog retains legacy projection, alias semantics and ordering.
- No claims of physical Safari acceptance or unverified Cloud Browser GPU root cause.

### Task 1
- [ ] RED catalog compatibility, disclosure relationship and read-only probe policy tests.
- [ ] Extract common catalog; reuse in both consumers; persistent distinct disclosure targets.
- [ ] Implement public live render probe and isolated CI job with failure evidence.
- [ ] Focused/full tests, typecheck/build; independent review and substantive fixes.

### Task 2
- [ ] Read live CI evidence; fix reproduced application faults only.
- [ ] Green candidate CI, authorized merge/LAB release, rerun live probe after release.
- [ ] Report verified scope and manual limitations.
