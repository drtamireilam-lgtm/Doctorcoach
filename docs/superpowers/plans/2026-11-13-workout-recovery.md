# Durable pending workout edits

**Goal:** Preserve unconfirmed strength-set edits across refresh, navigation and transient connection failures without replaying stale content or another account's draft.
**Architecture:** Minimal editable fields in account/session/occurrence/set-scoped IndexedDB records. Authenticate and reload server state before restoring; compare the original server field snapshot. Identical server acknowledgement clears only the matching local revision atomically. Conflicts restore visibly but require explicit review/save or discard. No API response caching, medical narratives, names or credentials stored.
**Spec:** Workout Experience 3.0 phase4 persistence and phase6 ownership. Existing autosave and RPE engine remain authoritative.

- [ ] Failing pure tests for cache keys, editable-field normalization, base/desired comparison and conflict classification, including changed exercises, accounts, completed sets and targets.
- [ ] Add transactional IndexedDB persistence and CAS acknowledgement. Treat storage failure as explicit unsaved state; retain unload guards.
- [ ] Include canonical ownerId in authenticated own training feed; hydrate only exact owner/active session; integrate immediate field caching, safe restore, conflict/manual discard, server acknowledgement and finished-session cleanup.
- [ ] Real Chromium IndexedDB/UI tests for failed writes, reload/recovery, changed-server conflict, manual retry/discard, owner isolation and newer-revision protection. Verify both languages/mobile.
- [ ] Run typecheck/lint/build/relevant/full regression, review and separate Draft PR stacked on78; no merge/deploy/remote schema/real-user writes.

Compatibility: browsers denying IndexedDB keep ordinary server autosave and explicit errors, with no durable-recovery claim. Cached completion actions are not replayed; only editable fields restore, preserving server done state. Private pending fields remain on the device until matched acknowledgement, explicit discard or completed-session cleanup; they are not exposed before authenticated owner context. No remote migration.
