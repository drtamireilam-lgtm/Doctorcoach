# DoctorCoach — Advanced Features Addendum

This addendum extends `MASTER_PLAN.md` with the operational and longitudinal features needed for a production-grade clinical-performance platform.

## Outcome measures

Add structured validated or standardized functional outcome tracking by body region where appropriate. Initial instruments:
- ODI — lumbar disability
- NDI — neck disability
- QuickDASH — upper limb function
- LEFS — lower extremity function
- PSFS — patient-specific function

Rules:
- Store instrument name, score, date, injury episode and notes.
- Do not present a score as a diagnosis.
- Show change over time and baseline comparison.
- Keep instrument licensing / usage requirements under review before production distribution.

## Baseline testing

At the beginning of an injury / rehab episode, capture a baseline where appropriate:
- Pain
- Function
- ROM
- Strength tests
- Body weight
- Activity level
- Weekly training volume

This becomes the reference point for rehab milestones and return-to-training decisions.

## Return-to-training / return-to-sport criteria

Support a structured checklist by category:
- Pain response
- ROM
- Strength
- Side-to-side asymmetry
- Functional tolerance
- Gym / sport-specific tolerance

Progression is professional-led and milestone-based. The app can calculate or display test results but should not independently declare medical clearance.

## Client Timeline

Create one chronological timeline joining important events across disciplines:
- Injury created
- Medical review
- Restriction change
- Rehab milestone
- Program version change
- Workout completion
- Pain flare
- Personal record
- Body-weight entry
- Nutrition check-in
- Appointment

Every timeline item should have a stable event ID, timestamp, source module and related entity ID.

## Program versioning

Never overwrite an athlete's training history when a coach changes the program.

Each saved program version should retain:
- Program ID
- Version number
- Author
- Creation time
- Reason for change
- Previous version link
- Draft / active / archived status

The athlete always sees the currently active assigned version while professionals can inspect prior versions.

## Training adherence and history

Track:
- Prescribed sets
- Completed sets
- Skipped sets
- Skip reason
- Session completion
- Weekly completion rate

Every exercise should receive a history view with:
- Load
- Reps
- RPE / RIR
- e1RM
- Pain where relevant
- Coach notes

## Workload monitoring

Display training-load changes as review signals, not injury predictions.

Track:
- Weekly total volume / tonnage where meaningful
- Hard sets
- Sessions
- Average effort
- Sudden week-to-week changes

The system must avoid claims that a workload metric can predict injury with certainty.

## Smart alerts

Examples:
- New red flag → urgent Medical Review
- Meaningful next-day pain increase → coach / medical review
- Low readiness on repeated entries → review
- Large workload jump → review
- ROM deterioration → review
- Unexpected performance drop → review

Alerts should be explainable, dismissible / acknowledgeable, auditable and configurable by professionals.

## DoctorCoach Score

Future dashboard concept combining separate non-diagnostic dimensions:
- Recovery
- Pain control
- Function
- Training adherence
- Performance

The composite display should be explicitly described as a progress / attention indicator, not a health score, diagnosis, risk score or medical clearance tool.

## Calendar and notifications

Unified calendar for:
- Training
- Rehab
- Medical appointments
- Nutrition appointments
- Milestones
- Follow-ups

Notification candidates:
- Workout due
- Next-day pain follow-up
- Weekly check-in
- Body-weight entry
- Program updated
- Professional message / review request

## Documents and export

Document center should support permissioned storage / references for:
- Imaging reports
- Visit summaries
- Referrals
- Laboratory documents
- Clinical files

Export targets:
- Medical summary PDF
- Progress report
- Training program
- Professional handoff summary
- User data export

## Offline / PWA workout mode

Workout execution should eventually work with intermittent connectivity:
- Cache assigned workout
- Record sets offline
- Queue changes locally
- Sync safely when connection returns
- Resolve conflicts without losing workout data

## CMS and search

Create a content-management layer so the team can add or edit anatomy, injuries, muscles, exercises and educational content without code changes.

Search should support:
- Muscle
- Exercise
- Injury
- Body region
- Educational topic
- Team / support item

## Internationalization and accessibility

Architecture requirements:
- Hebrew RTL
- English LTR
- Translation-ready content keys
- Accessible contrast
- Large touch targets
- Keyboard navigation
- Screen-reader labels

## Operations

Before broad production use add:
- Staging environment separate from production
- Feature flags
- Database migrations and schema versioning
- Backup and restore drills
- Account deletion workflow
- Data export workflow
- Consent withdrawal workflow
- Professional audit log
- Error monitoring
- Product analytics with privacy boundaries
- In-app bug / feedback reporting

## Implementation priority

1. Domain / data models for outcomes, timeline and versioning.
2. Baseline + outcome entry and display.
3. Client timeline UI.
4. Program version history.
5. Adherence and exercise history.
6. Readiness / pain / workload alerts.
7. Return-to-training criteria.
8. Calendar / notifications.
9. Documents / exports.
10. PWA / offline.
11. CMS / global search.
12. Feature flags / staging / migrations / operational tooling.
