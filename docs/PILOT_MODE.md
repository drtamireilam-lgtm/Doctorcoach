# DoctorCoach Pilot Mode

Pilot Mode is a controlled pre-production workflow. It is not a substitute for production security.

## Included in the app

- Limited pilot cohort with configurable maximum users.
- Versioned pilot consent identifier and onboarding version per participant.
- Feature flags for staged rollout.
- In-app feedback queue for bugs, confusing UX, feature requests and content issues.
- Runtime check that reports whether API/auth environment configuration is present.
- Separation between local MVP state and production-provider configuration.

## Required before real patient / trainee medical data

1. Configure `VITE_DOCTORCOACH_API_URL`, `VITE_DOCTORCOACH_AUTH_ISSUER` and `VITE_DOCTORCOACH_AUTH_CLIENT_ID` through the deployment environment, not source control.
2. Implement the server endpoints defined by `src/platform/backend.ts` and `src/platform/backend-contract.ts`.
3. Enforce authorization on the server for every resource; frontend role checks are not security controls.
4. Use a private object-storage bucket for videos and documents. Access should be through short-lived signed URLs only.
5. Persist audit events for reads/writes of sensitive resources where legally/operationally appropriate.
6. Store consent acceptance with version, timestamp, user identity and withdrawal state.
7. Enable account deletion/data export/consent withdrawal workflows before broad launch.
8. Complete jurisdiction-specific privacy, medical-disclaimer and legal review.
9. Test backup restore, not just backup creation.
10. Keep pilot analytics operational and product-focused; avoid exposing unnecessary medical data.

## Suggested rollout

- Internal QA accounts only.
- Team-only dry run.
- 3–5 invited users.
- 10–25 invited users after stability review.
- Production rollout only after security, privacy, legal and clinical-governance review.

## Environment

Use `.env.example` as the non-secret template. Never commit real credentials or tokens.
