# Explicit rehabilitation stages and milestones — 2026-10-09

Extended the existing return-to-activity record, rather than creating a separate
injury database or replacing prior care plans. The same clinician authorization,
health-consent API gate and optimistic version control apply.

- Four existing stages are shown as a journey: assessment, adapted activity,
  load progression, return to activity. Only the current stage is indicated;
  earlier stages are not fabricated as completed.
- Up to 12 personal milestones, each with a stable ID, assigned stage, title,
  criterion and pending/achieved/on-hold status. Only the consented clinician
  edits the record. Trainee and other authorized team members view it read-only.
- A review confirmation precedes saving. Achieved milestones do not advance
  stages, modify training plans, clear medical-review blocks or grant clearance.
- Legacy return plans display normally. Older payloads omit milestones without
  deleting saved ones; an explicit empty list removes them from the current plan.
- Data persists in the existing JSON record without a schema migration. Current
  record version, author and update time remain visible. This does not provide an
  immutable plan-version history or separate injury episodes.

Validation covers duplicate IDs, malformed JSON, invalid stages/statuses, length
limits, clinician access, stale versions, revocation and legacy compatibility.
TypeScript and targeted tests passed; publication runs the full 145-test suite
and production build. Actual mobile/browser/account journeys remain unverified.

Next implementation candidate: preserve return-plan revisions and transition
history, inspecting existing audit support first. The live browser journey,
privacy/security review and external clinical/legal sign-off remain launch gaps.
