# DoctorCoach P0 Foundation

This document defines the current transition from frontend prototype to a production-ready data/security foundation.

## Implemented in this batch

- Versioned persistence abstraction with a browser/offline adapter.
- Backend-ready `KeyValueStore` interface so storage can later be swapped without rewriting product logic.
- Role model for trainee, coach, medical, dietitian and admin.
- Permission checks for profile, medical review, training assignment/logging, nutrition, team notes and administration.
- Explicit development-only auth provider contract.
- Central state helpers for client timeline, program versions, readiness, pain responses and outcome measures.
- Program version creation and activation/archival logic.
- Readiness score helper.
- Outcome trend helper.

## Important boundary

The current browser storage and demo authentication layers are **development adapters**, not production security. Production authentication and database persistence require a real backend/identity provider, server-side authorization, encrypted transport, secure session handling and database row-level access controls.

## Backend contract target

The production API should expose resources similar to:

- `/auth/session`
- `/athletes/:athleteId/profile`
- `/athletes/:athleteId/timeline`
- `/athletes/:athleteId/readiness`
- `/athletes/:athleteId/pain-responses`
- `/athletes/:athleteId/outcomes`
- `/programs/:programId/versions`
- `/medical/review-queue`
- `/coach/review-queue`

Every request must be authorized against the authenticated user and role, not merely hidden in the frontend.

## Recommended production persistence model

Core entities:

- users
- user_roles
- athletes
- athlete_profiles
- injury_episodes
- medical_reviews
- restrictions
- programs
- program_versions
- workout_days
- exercise_prescriptions
- workout_sessions
- exercise_sets
- readiness_entries
- pain_responses
- outcome_measures
- rom_entries
- body_weight_entries
- nutrition_checkins
- team_notes
- timeline_events
- consent_records
- audit_events

Use immutable IDs and timestamps. Program versions and clinical/consent history should not be destructively overwritten.

## Security requirements before real user data

- Production identity provider
- Server-side role and resource authorization
- MFA for professional/admin accounts
- Row-level access restrictions
- Audit logging
- Consent/version records
- Encrypted media/object storage
- Backup and restore testing
- Data export/deletion workflow
- Session expiration/revocation
- Secrets kept outside the repository

## Product flows now supported at the domain layer

### Program versioning
A new program version points to the previous version. Activating it archives the previous active version rather than deleting history.

### Client timeline
Medical, training, rehab and nutrition events can share one chronological timeline while retaining their source and entity reference.

### Readiness
Sleep, fatigue, pain and optional stress are captured as separate inputs. A derived score may summarize direction but should not be treated as a diagnosis or injury predictor.

### Pain response
Pain can be recorded before, during, immediately after and the next day, linked to an injury episode and/or workout session.

### Outcome measures
ODI, NDI, QuickDASH, LEFS, PSFS and custom measures can be stored longitudinally and trended over time. Instrument scoring/interpretation must be implemented according to the validated instrument rules before clinical use.

## Next integration work

Wire these services into the live React screens, then replace development adapters with a production API/backend. The UI should never become the sole enforcement point for medical or role-based permissions.
