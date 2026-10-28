# Consultation Management 2.0 Implementation Plan

Goal: extend the existing appointment lifecycle and calendar integration in isolated LAB only.
Architecture: keep D1 appointments and transactional sync outbox; Supabase remains identity-only. Preserve current Calendar lease, deterministic event IDs, AES encryption and provider checks. No personal Calendar test writes.
Base: feature/cardio-automatic-steps-20261025, deployed LAB source 5b213b4. No open consultation PR found among all open PRs.

- [x] Regression tests: terminal records always history; pending separate; overdue scheduled needs action; no-show lifecycle; coordinator data redaction and clinical mutation denial; historical server filtering and pagination.
- [x] Implement existing navigation/workspace extension, explicit completion/no-show, immutable status transition audit triggers, server-authorized history queries. Retain all existing records.
- [x] Calendar: deployment-bound OAuth origin/callback, explicit secondary test-calendar target only in LAB, truthful disabled status and safe retry reporting. No automatic connection or background personal-calendar writes.
- [x] Run unit/integration, TypeScript, Workers mock and bilingual mobile/desktop browser tests, isolated build. Review diff and permission boundaries.
- [ ] Open PR against existing LAB branch; deploy only exact isolated Worker after safe schema changes and preflight. Verify four original appointment rows unchanged by hashes/counts. Report live OAuth and personal-calendar verification as incomplete.

Ruling: user supplied full specification and requested autonomous implementation; proceed inline without an additional design approval cycle. Existing booking, permission, localization and theme components are reused. Calendar connection credentials are absent from live LAB; no OAuth token is available to validate or reconnect. Do not weaken staging to permit primary personal Calendar writes.

Review: terminal followup reopening and no-show payment resolution fixed and covered. Independent re-review reported no further P1/P2 issues.
