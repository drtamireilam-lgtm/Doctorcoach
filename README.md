# DoctorCoach

DoctorCoach is a coordinated medicine, training, rehabilitation and nutrition platform for active people and trainees managing injuries.

## Implemented foundation

- Responsive red/black application shell with navigation-first dashboard
- Centralized TypeScript athlete/profile domain model
- New-user onboarding with injury/no-injury branching
- Expanded injury intake: region, side, onset/mechanism and pain severity
- Red-flag decision routing to Medical Review instead of automated diagnosis
- Shared intake fields for age, medical history, medications, injuries/surgeries, training goals, frequency/style and professional restrictions
- Interactive first-pass body-region map with linked injury region selection
- Medical review summary with shared restrictions field
- Coach-assigned training access model
- Working RPE/RIR switch
- Immediate estimated 1RM calculation after a set
- Same-session next-load suggestion prototype
- Medical, Training, Nutrition, Progress, Anatomy/Education and Team sections

## Team model

- Medical — Tamir Eilam
- Training — Nadav Ron
- Nutrition — Lior Zelikson

## Product principles

1. One centralized athlete profile shared across disciplines.
2. Safety-first injury intake and red-flag escalation.
3. Trainees normally access only programs assigned by their coach.
4. Optional future paid self-programming mode for independent users.
5. Medical, training and nutrition notes remain discipline-aware while key restrictions and progress data can be shared.
6. Exercise logging supports RPE or RIR, immediate estimated 1RM and same-session load suggestions.
7. Rehab tracking should capture pain before, during, immediately after and next day, plus ROM and milestones.

## Development

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
```

## Next implementation priorities

1. Persistence + authentication and role permissions (trainee / coach / medical / dietitian).
2. Expand body map from regions into muscles, anatomy pages and injury journey phases.
3. Coach exercise library and multi-day workout builder with approved substitutions.
4. Trainee workout execution with multiple sets, videos and session readiness.
5. Pain timing, ROM, body-weight and e1RM longitudinal charts.
6. Nutrition assessment, plan, adherence, weekly check-in and pricing/subscriptions.
7. Appointments, internal team notes/mentions and contextual trainee feedback.
8. Production backend, audit/privacy controls and deployment pipeline.
