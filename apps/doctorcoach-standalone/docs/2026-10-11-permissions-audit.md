# Permissions and private-data audit

Scope: trainee ownership, medical document metadata/downloads, medical passport, role projections, team bundles, review videos and access withdrawal. No production medical records were inspected. This is a code/test audit, not a complete independent security assessment.

## Findings fixed
1. Document-list permissions were checked before the audit write, but not afterwards. Concurrent revocation/archive could return a captured list. Recheck after the final audit and match captured IDs, patient, purpose, channel and object key.
2. Team bundle reads rechecked active connections and role-specific grants but did not recheck current health-processing consent. Add the consent check for staff; owners retain access to their records.
3. Review-video staff reads rechecked team membership but not current health/media consents. Recheck both for listing and download confirmation; owner access and public exercise demonstrations keep their existing behavior.

Nine synthetic regression scenarios failed before the fix and passed after it: late revocation of medical sharing, health consent, archival, patient reassignment, owner archival, doctor/coach bundle access after health withdrawal, and review-video staff access after health/media withdrawal.

## Existing boundaries reviewed
- Medical documents/passport require owner or explicitly linked clinician with medical access.
- Administrative status alone does not grant medical access.
- Training-channel attachments retain channel-specific access and do not inherit clinician access.
- Coach bundles omit medical profile fields and medical/nutrition notes.
- Dietitian and coordinator remain separate roles; assigned programs, uploads and write guards preserve their existing checks.
- Private file routes require authorisation, recheck after object retrieval, and use private/no-store cache headers.

## Validation and limits
Run the new regression suite, existing care/media/passport/document suites, full tests, TypeScript and production build. Browser/device QA unavailable because this managed environment lacks control-browser. No real user access or role was changed. Deletion remains disabled. Provider settings, legal retention and an actual isolated infrastructure restore remain separate launch blockers.
