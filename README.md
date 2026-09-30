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
- Immediate estimated 1RM calculation after every logged set
- Same-session next-load suggestion prototype
- Coach Workout Builder with multi-day assignment
- Exercise library grouped by training region/pattern
- + button selection flow before prescription setup
- Sets, reps, starting load and target RPE/RIR configured after exercise selection
- Separate coach and trainee training views
- Trainee execution screen with per-set load, reps, RPE/RIR, e1RM and next-set recommendation
- Trainees cannot freely replace coached exercises; substitution requests are reserved for coach-approved alternatives
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
8. Coach programming follows a selection-first workflow: choose exercises, assign to a day, then prescribe sets/load/effort.

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
2. Coach-approved exercise substitutions and richer exercise library metadata.
3. Session readiness: sleep, fatigue and current pain before training.
4. Pain timing capture: before, during, immediately after and next day.
5. Video upload/review for trainee sets.
6. Expand body map from regions into muscles, anatomy pages and injury journey phases.
7. Longitudinal charts for body weight, working load/e1RM, pain and ROM.
8. Nutrition assessment, plan, adherence, weekly check-in and pricing/subscriptions.
9. Appointments, internal team notes/mentions and contextual trainee feedback.
10. Production backend, audit/privacy controls and deployment pipeline.
