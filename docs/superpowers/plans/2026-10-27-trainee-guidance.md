# Trainee guidance implementation plan

Goal: Add explicit coached/independent/awaiting guidance to PR55 without creating entitlements, classifying old users or changing remote resources.
Base: df02a34277abe3588bae92a739bd1645e331d18d; PR55 latest verified, clean dedicated branch codex/trainee-guidance-modes-20261027. User supplied full execution specification and authorized autonomous local implementation.

Design: Nullable guidance_mode means existing/unclassified, never inferred from coach_id. Explicit trainee choices require coach only for coached. Independent selects the existing self training mode, retaining all entitlement dates and program pointers. Coached selects existing coached mode. Awaiting removes only administrative coach access, leaves independently valid training access untouched. All transitions reject active sessions, recheck entitlement snapshot/administrator/version inside D1 transaction, audit atomically. Missing field on older PR55 requests preserves old guidance; once explicitly selected, its invariants still apply. No automatic migration classification.

- [x] RED tests for explicit modes, entitlement preservation, active-session/concurrent guard, audit rollback and legacy compatibility.
- [x] Add standalone migration0003: nullable guidance_mode with CHECK and cross-field triggers, no row updates or changes to migration0002.
- [x] Extend existing management update batch: validated mode, same transaction coach/switch/audit, exact entitlement snapshot guard; reject unknown fields/types and incompatible coach.
- [x] Project independent eligibility using existing staff-personal guard and training_access; avoid per-row query fanout and disclose no program/medical payload.
- [x] UI: explicit modes, nullable legacy prompt, current independent eligibility, coach only for coached, old/new confirmation and audit; role/status changes preserve consistent drafts.
- [x] Update local browser harness for all modes, cancellation, active/inactive eligibility and refresh/conflict; keep component/browser and built HTTP evidence distinct.
- [x] Run full suite, root tests/build, application TypeScript/build, focused lint and built HTTP smoke; rehearse additive migration and restore locally only.
- [x] Independent code review, fix confirmed findings, commit and draftPR above PR55; verify identical remote/local tree via connected GitHub if git push unavailable.

Constraints: No Cloudflare login, remote migration/deploy, real accounts, Shira grant, main merge, Production or entitlement/membership issuance. Preserve independent consents, workout/program/history and medical grants. LAB gates remain outside this local task.

Local implementation and verification complete; exact-tree GitHub saving and Draft PR are the final execution step. Remote rollout is outside this task.
