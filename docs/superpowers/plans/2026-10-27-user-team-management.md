# User & Team Management 3.0 Implementation Plan

Goal: Extend the existing canonical D1 identities and care relationships with confirmed, versioned administrative user management.
Architecture: Standalone gateway verifies Supabase sessions and canonical D1 principals. A feature-gated D1 management store owns professional assignment, status, administrative grants and audit. Existing clinical grants remain separate; no medical grant is created by professional assignment. Existing care_connections are reused with provenance for assignment-derived grants.
Spec: User supplied USER & TEAM MANAGEMENT 3.0 specification, 2026-10-27.

Constraints: Dedicated branch; no main merge, production, remote migrations or LAB deployment without explicit approval. Synthetic tests only. No real secretary grant. Existing email allowlists are legacy compatibility, never management authorization. Activation requires approved canonical owner ID and migration preflight.

Base: b2f80b4 (PR54), newest fetched branch; includes PR52 cardio and consultation history. No AGENTS.md found in tracked files. No remote state has been independently verified yet.

- [x] Add synthetic SQLite tests for pending registration, UID authorization, version conflicts, retries, atomic audit and assignment provenance.
- [x] Add standalone additive migration 0002, with explicit grandfathering of existing identities, new-account pending trigger, management grants, append-only audit and assignment provenance. Do not run remotely.
- [x] Implement standalone/user-management.ts with current principal/account/admin checks in guarded D1 batch, exact input validation, bounded lists and audit, safe secretary grant/revoke, no self or owner mutation.
- [x] Integrate optional gateway policy, API and session disablement. Preserve existing authentication when feature is off. Block legacy team-role/assignment writes when enabled. Existing clinical grants require separate authorization; secretary is restricted to management API.
- [x] Implement bilingual responsive management component and navigation with local draft, accessible confirmation, duplicate-save lock and refresh on conflict.
- [x] Run entire standalone suite, TypeScript, standalone build and local browser checks where available.
- [x] Review changes and record remaining security/integration gaps; prepare exact approval-gated activation steps. No deployment until approved.

Review focus: Independent consent survives reassignment; current sessions lose disabled access; stale admins cannot write; role physician never grants medical access; retries never duplicate mutations/audit. These require real SQL tests, not source-string assertions.

Remote preflight, protected live backup, exact owner bootstrap, approval, deployment and live acceptance remain blocked by Cloudflare authentication and identity approval; they have not been completed. See docs/verification/2026-10-27-user-team-management-he.md.
