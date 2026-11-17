# Mobile program management continuation
User approved improving phone-based exercise addition, substitution, duplication/order, inline dose edits and clear draft/active status.

Existing batch picker and quick-dose persistence stay authoritative. Current day editor now precedes optional copy/generation/picker tools. An explicit add shortcut opens/focuses only the initiating form's picker. Quick cards expose duplicate/up/down through existing occurrence helpers plus exact-card advanced settings for substitution. Pending fields block structural actions. Header and footer share one truthful draft-status helper. Publishing stays separate; no backend/schema/role changes.

Validate exact duplicate identities, dose preservation, day/section move bounds, capacity30, pending/conflict status, scoped DOM navigation, and existing HE/EN320/390/430/768/1363 private-draft save/retry/reload/preview workflow. Existing browser fixture now checks shortcuts, quick duplicate/reorder, exact advanced target, pending guards and editor-before-picker ordering. One fresh review. Local Chromium is unavailable in this workspace; use CI runtime evidence. Release only green tested source to isolated LAB, preserve bindings and rollback. PR96/98 remain drafts/unmerged; no Production or real-account writes.

Final review:0Critical/0Important. Deferred minor: header CSS class may remain `saved` while loading/blocked; shared message text is correct and current CSS adds no special saved styling. 22 focused tests,2,219 full tests,TypeScript and diff checks passed. Runtime acceptance pending CI.
