# DoctorCoach — Master Development Plan

_Last consolidated: 2026-09-30_

## 1. Product vision

DoctorCoach is an integrated platform connecting **medicine, rehabilitation, strength training, nutrition and longitudinal progress** for active people and trainees managing injuries.

The product should feel like one coordinated system rather than separate apps. The user has one shared profile, while each professional works within their own discipline-specific area and permissions.

### Core team
- **Medical:** Dr. Tamir Eilam
- **Training:** Nadav Ron
- **Nutrition:** Lior Zelikson

### Product principles
1. Safety before automation.
2. The app does not auto-diagnose medical conditions.
3. Red flags route to **Medical Review**.
4. One centralized athlete profile powers all modules.
5. A coached trainee can only access the plan assigned by the coach.
6. Independent self-programming is a separate paid mode.
7. Training guidance can adapt to pain, readiness, RPE/RIR and performance data.
8. The system should preserve structured longitudinal data for future aggregate outcomes analysis.
9. Mobile-first, premium, fast and simple enough to use during a workout.
10. Black / charcoal / white / deep-red DoctorCoach visual language.

---

## 2. Primary navigation

Persistent navigation should converge toward:

1. Home / Dashboard
2. Injury & Medical
3. Rehabilitation
4. Training
5. Progress
6. Anatomy & Learn
7. Nutrition
8. Appointments
9. Team / Support
10. Profile / Settings

Avoid carousel-style primary navigation. Use a stable navigation structure.

---

## 3. Roles and permissions

### Trainee — coached
- Can view only the program assigned by the coach.
- Can log sets, load, reps, RPE/RIR, pain, readiness, ROM and body weight.
- Can request or use only coach-approved substitutions.
- Can upload set videos for coach review.
- Cannot redesign the coach-prescribed program.

### Independent subscriber
- Paid monthly self-use mode.
- Can build own plan from the exercise library.
- Receives calculations and tracking but is clearly separated from coached service.

### Coach
- Build multi-day programs.
- Add unlimited exercises with `+`.
- Assign exercise to workout day.
- Only after selection, set sets / reps / weight / RPE or RIR.
- Approve substitutions.
- Review athlete videos.
- See readiness, pain and performance trends.

### Medical
- Review intake and red flags.
- Add restrictions and medical notes.
- Mark safety status and return-to-training constraints.
- Share only appropriate structured restrictions with other disciplines.

### Dietitian
- Nutrition assessment.
- Nutrition plan.
- Weekly check-in.
- Dietitian-only notes.
- View shared weight / adherence / relevant training context.

### Admin
- Manage team, subscriptions, content, permissions, auditability and operational settings.

---

## 4. Central user data architecture

All modules should connect to one persistent athlete profile.

### Shared profile fields
- Age
- Relevant medical history
- Current medications
- Previous injuries
- Previous surgeries
- Training goals
- Training frequency
- Training style / discipline
- Existing physician / physiotherapist restrictions
- Current injury status
- Body region and side
- Consent versions

### Longitudinal records
- Medical assessments
- Injury episodes
- Rehab phases and milestones
- Workout sessions
- Exercise sets
- RPE / RIR
- e1RM
- Body weight
- Pain timing
- ROM
- Readiness
- Nutrition adherence
- Measurements
- Videos
- Team notes
- Appointments

Use stable IDs for athletes, injuries, exercises, programs, workout days, sets and content pages.

---

## 5. Onboarding and injury questionnaire

### Flow
Welcome → Product explanation → Injury status → Injury questionnaire → Red-flag screening → Shared profile → Goals / experience → Navigation tour → Personalized home.

### Injury questionnaire
Capture:
- Current injury: yes / no
- Region
- Side
- Onset
- Duration
- Mechanism
- Pain 0–10
- Worst pain
- Pain timing / aggravating movements
- Weakness
- Numbness
- Swelling
- Instability
- Weight-bearing / limb-use limitations
- Prior diagnosis
- Imaging
- Prior surgery
- Current treatment
- Exercises currently limited
- User goals

### Red flags
Examples requiring medical routing:
- Major trauma / suspected fracture
- Rapidly progressive weakness or neurological deficit
- Bowel / bladder dysfunction or saddle symptoms
- Chest pain, syncope or unexplained severe dyspnea
- Fever / systemic symptoms / unexplained weight loss with concerning presentation
- Inability to bear weight or use affected limb

Positive answers must **not generate a diagnosis**. They route to Medical Review and block injury-specific automated training guidance until cleared.

---

## 6. Medical module

### Core features
- Structured injury intake summary
- Red-flag status
- Medical review queue
- Assessment notes
- Shared restrictions / precautions
- Medical clearance state
- Relevant imaging / document references
- Follow-up status
- Return-to-training guidance

### Safety model
Medical recommendations belong under professional review. The app may screen and organize information, but physician diagnosis remains physician-led.

---

## 7. Rehabilitation module

### Injury journey
Each injury has a visible journey with phases, milestones and progression criteria.

Suggested structure:
1. Protection / symptom control
2. Restore ROM / tolerance
3. Capacity rebuilding
4. Strength / load exposure
5. Sport / gym-specific return
6. Return to unrestricted training

### Rehab exercise tracking
For each prescribed rehab exercise:
- Sets / reps / load or duration
- Pain before
- Pain during
- Pain immediately after
- Pain next day
- ROM
- Difficulty / tolerance
- Completion / adherence

### Spine rehabilitation
Explicit categories:
- Cervical spine
- Thoracic spine
- Lumbar spine

Progression should be milestone-driven rather than only time-driven.

---

## 8. Training module

### Exercise library
Build a complete library of main gym exercises grouped by:
- Chest
- Back
- Shoulders
- Biceps
- Triceps
- Quads
- Hamstrings
- Glutes
- Calves
- Core
- Neck / cervical
- Thoracic spine
- Lumbar spine
- Hip / groin
- Knee
- Ankle / foot
- Rehab / mobility

Each exercise should eventually include:
- Stable exercise ID
- Name
- Muscle / movement category
- Equipment
- Technique notes
- Injury relevance / cautions
- Allowed substitutions
- Media

### Coach workout builder
Workflow:
Exercise library → `+` → select workout day → configure prescription.

Prescription fields:
- Sets
- Reps / rep range
- Starting weight
- Target RPE or RIR
- Tempo where needed
- Notes
- Approved substitution list

Support multiple workout days.

### Trainee workout execution
For each set:
- Actual weight
- Actual reps
- RPE or RIR
- Estimated 1RM shown immediately
- Next-set load suggestion shown immediately
- Pain / tolerance when relevant
- Optional video upload

### RPE / RIR
- RPE is default.
- User / coach can choose RIR.
- Same calculation framework should work in both modes.

### e1RM
Calculate after every completed set and persist longitudinally.

### Same-session adjustment
If actual effort differs meaningfully from target, suggest keeping, increasing or decreasing the next set load.

These suggestions are advisory and never override coach / medical restrictions.

---

## 9. Readiness and pain response

Before each workout capture:
- Sleep
- Fatigue
- Current pain
- Optional stress / recovery marker

Pain response timing:
- Before exercise/session
- During
- Immediately after
- Next day

This data should inform coach review, rehab progression and longitudinal progress views.

---

## 10. Body map and anatomy education

### Interactive body map
Realistic human-body interface with clickable regions and muscles.

Flow:
Body → Region → Muscle → Anatomy / common injury patterns / rehab relevance / related exercises.

### Content architecture
- Body regions
- ~100 major muscles over time
- Muscle detail pages
- Injury pages
- Anatomy images
- Movement / function explanation
- Related exercises
- Injury → Muscle → Exercise relationships

### Feedback
Every education / anatomy / injury page should allow contextual trainee feedback:
- Unclear content
- Request deeper explanation
- Suggested topic
- General improvement idea

Feedback should also exist as a general module for team review.

---

## 11. Progress module

Longitudinal dashboards should include:
- Working weight
- e1RM
- Body weight
- Pain
- ROM
- Readiness
- Rehab milestone completion
- Training adherence
- Nutrition adherence

Important views:
- Per exercise
- Per injury episode
- Per body region
- Weekly / monthly trends
- Shared clinical + performance timeline

Future analytics should support aggregate outcome analysis while preserving privacy and consent boundaries.

---

## 12. Nutrition module

### Nutrition assessment
- Goals
- Weight history
- Dietary pattern
- Training schedule
- Preferences / limitations
- Relevant shared medical context

### Nutrition plan
Two modes:
- Calories / macros
- Flexible principles / meal structure

Support:
- Training-day plan
- Rest-day plan
- Performance nutrition
- Measurements
- Body-weight trend
- Simple daily adherence check-in
- Weekly dietitian check-in
- Dietitian-only notes

### Subscription durations
Pricing section must support:
- 1 month
- 3 months
- 6 months
- 12 months / year

Exact prices: TBD.

---

## 13. Team collaboration

### Shared Team Dashboard
Show relevant data across Medical / Training / Nutrition.

### Internal collaboration
- Discipline-specific private notes
- Shared notes where appropriate
- Internal mentions
- Tasks / work queue
- Medical review queue
- Coach review queue
- Dietitian follow-up queue

### Team members
- Dr. Tamir Eilam — Medical
- Nadav Ron — Training
- Lior Zelikson — Nutrition

---

## 14. Communication and appointments

Planned:
- Appointment booking
- Medical consultations
- Training consultations
- Nutrition consultations
- Floating WhatsApp contact entry
- Instagram / social links
- Appointment status / follow-up
- Optional reminders

---

## 15. Payments and commercial model

Support service tracks such as:
- FREE
- SELF
- COACHING
- MEDICAL
- NUTRITION

Required commercial flows:
Landing → Questionnaire → Account → Consultation / subscription → First plan/workout → Retention.

Payments should support one-time medical consultations and recurring subscriptions.

---

## 16. Safety, legal, consent and privacy

Before production launch:
- Terms of use
- Privacy policy
- Medical disclaimer
- Informed consent
- Consent versioning
- Consent withdrawal workflow
- Marketing / success-story consent
- Role-based access control
- Private video handling
- Audit log
- Backups
- MFA for professional/admin access
- Data retention policy
- Emergency / red-flag escalation wording
- Jurisdiction-specific legal review

For publicity / success stories, only use data allowed by explicit consent. Previously discussed minimal public outcome fields include age, weight and injury type where appropriate.

No unsafe claims, guaranteed outcomes, or “train through pain” messaging.

---

## 17. Design system

### Visual direction
- Premium medical + performance aesthetic
- Black / charcoal
- White
- Deep red accents
- Navigation-first layout
- Mobile-first
- High contrast
- Fast workout interaction
- Hebrew RTL support
- English support

Real-life photography is preferred over generic generated imagery for core brand/team presentation.

---

## 18. Technical architecture

### Current frontend foundation
- React
- TypeScript
- Vite

### Production architecture requirements
- Authentication
- Role-based permissions
- Persistent backend database
- Secure object storage for videos / media
- Audit events
- Consent records
- API layer
- Validation
- Error monitoring
- Deployment pipeline
- Automated tests

### Data/security direction
Use row-level / role-level access so users and professionals only see permitted data.

---

## 19. Repository documentation target

The repo should ultimately maintain:
- `MASTER_PLAN.md`
- `PRODUCT_SPEC.md`
- `ARCHITECTURE.md`
- `DATA_MODEL.md`
- `DESIGN_SYSTEM.md`
- `ONBOARDING_SPEC.md`
- `MEDICAL_SAFETY.md`
- `TRAINING_ENGINE.md`
- `NUTRITION_MODULE.md`
- `ROLES_AND_PERMISSIONS.md`
- `MARKETING.md`
- `AGENTS.md`

---

## 20. Development phases and priority order

### P0 — Foundation, security and data model
- [x] Initial React / TypeScript / Vite app
- [x] Navigation-first shell
- [x] Central TypeScript profile model
- [ ] Persistent database
- [ ] Authentication
- [ ] Role permissions
- [ ] Audit model
- [ ] Consent/version model

### P1 — Safety and onboarding
- [x] Onboarding shell
- [x] Injury / no-injury branching
- [x] Structured red flags
- [x] Medical Review routing
- [x] Shared profile fields
- [ ] Full injury-questionnaire depth
- [ ] Emergency escalation copy / UX
- [ ] Medical clearance workflow

### P2 — Training engine
- [x] RPE / RIR modes
- [x] e1RM calculation prototype
- [x] Same-session next-load suggestion prototype
- [x] Coach-only assignment principle
- [x] Initial Exercise Library / Workout Builder foundation
- [ ] Complete exercise catalog
- [ ] Full multi-day program versioning
- [ ] Multiple-set persistent workout logging
- [ ] Approved substitution workflow
- [ ] Video review workflow
- [ ] Independent SELF subscription mode

### P3 — Rehabilitation
- [ ] Injury journey
- [ ] Rehab phases
- [ ] Milestones / progression criteria
- [ ] Pain timing workflow
- [ ] ROM logging
- [ ] Spine rehab categories

### P4 — Progress and analytics
- [ ] e1RM charts
- [ ] Working-weight charts
- [ ] Body-weight charts
- [ ] Pain charts
- [ ] ROM charts
- [ ] Readiness trends
- [ ] Shared longitudinal timeline

### P5 — Team workflows
- [ ] Shared Team Dashboard
- [ ] Discipline-specific notes
- [ ] Internal mentions
- [ ] Medical review queue
- [ ] Coach review queue
- [ ] Dietitian follow-up queue

### P6 — Anatomy and education
- [x] First-pass region body map
- [ ] Realistic detailed body illustration
- [ ] Region pages
- [ ] Muscle detail pages
- [ ] Injury pages
- [ ] Injury → Muscle → Exercise matrix
- [ ] Contextual feedback

### P7 — Nutrition
- [ ] Assessment
- [ ] Nutrition plan
- [ ] Training/rest day variants
- [ ] Daily adherence
- [ ] Weekly check-in
- [ ] Measurements
- [ ] Dietitian notes
- [ ] Nutrition progress graphs

### P8 — Communication and commercial
- [ ] Appointments
- [ ] WhatsApp flow
- [ ] Medical consultation payment
- [ ] Coaching subscriptions
- [ ] Nutrition 1/3/6/12-month subscriptions
- [ ] SELF subscription

### P9 — Launch, operations and growth
- [ ] Production backend
- [ ] Secure media storage
- [ ] CI / automated tests
- [ ] Deployment pipeline
- [ ] Legal review
- [ ] Privacy / security review
- [ ] Backup / recovery
- [ ] Analytics
- [ ] Marketing funnel

---

## 21. Definition of Done for each feature

A feature is not considered complete until:
1. Product behavior matches the Master Plan.
2. Safety / permissions are respected.
3. Mobile UX is usable.
4. Empty / error states exist.
5. Relevant data persists.
6. TypeScript/build passes.
7. Important logic has tests where practical.
8. Documentation is updated.
9. Changes are committed to GitHub.

---

## 22. Standing execution protocol

When the user says **“continue DoctorCoach” / “תמשיך” / equivalent**:

1. Inspect the current repository before creating duplicate functionality.
2. Read this `MASTER_PLAN.md` and current repo status.
3. Continue from the **highest-priority unfinished item**.
4. Implement in coherent batches rather than repeatedly asking what comes next.
5. Test / validate what was changed.
6. Fix regressions before moving on.
7. Update documentation / status checkboxes when appropriate.
8. Commit meaningful changes to GitHub.
9. Only interrupt the user when a real product, legal, clinical, pricing or design decision is required.
10. Do not stop after every small feature merely to announce the next step.

---

## 23. Current implementation baseline

Already present in the repository as of this plan:
- React + TypeScript + Vite application
- Black/red visual direction
- Persistent navigation shell
- Dashboard
- Onboarding
- Injury questionnaire foundation
- Red-flag screening
- Medical Review routing
- Central athlete/profile domain model
- First-pass body map
- Medical restrictions field
- RPE / RIR switch
- e1RM calculation
- Same-session next-set suggestion
- Coach-assigned plan model
- Exercise Library / Workout Builder foundation

This document is the authoritative roadmap for future DoctorCoach development unless the user explicitly changes a requirement.
