# DoctorCoach

DoctorCoach is a coordinated medicine, training, rehabilitation and nutrition platform for active people and trainees managing injuries.

## Current MVP foundation

- Responsive red/black application shell
- Navigation-first dashboard
- New-user onboarding flow
- Injury/no-injury branching
- Red-flag safety routing to Medical Review instead of automated diagnosis
- Shared intake fields for age, medical history, medications, injuries/surgeries, training goals, frequency/style and professional restrictions
- Medical, Training, Nutrition, Progress, Anatomy/Education and Team sections
- Training architecture placeholders for coach-only programming, RPE/RIR, e1RM and within-session load adjustment
- Rehab/progress architecture placeholders for pain, ROM, readiness and body-weight tracking

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
6. Exercise logging should support RPE or RIR, immediate estimated 1RM and same-session load suggestions.
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

1. Persistent user/profile data model and authentication.
2. Full injury questionnaire and red-flag decision tree.
3. Interactive body map and injury journey.
4. Coach exercise library, workout builder and trainee execution flow.
5. RPE/RIR and e1RM calculation engine.
6. Progress charts for performance, body weight, pain and ROM.
7. Nutrition assessment and subscription/pricing flows.
8. Appointments, team notes/mentions, feedback and media upload.
