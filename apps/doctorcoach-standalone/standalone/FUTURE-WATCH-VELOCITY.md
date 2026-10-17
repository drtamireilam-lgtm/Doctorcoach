# Future research: Apple Watch velocity and effort estimation

Owner idea recorded 2026-10-16. Status: deferred research, not an active implementation or release dependency.

## Goal

A trainee starts a set on Apple Watch. DoctorCoach records repetition velocity and within-set velocity loss; after individual calibration and validation it may estimate repetitions in reserve (RIR), with uncertainty, alongside user-reported effort. Do not represent inferred RIR/RPE as a direct sensor measurement or as proven more accurate than self-report.

## Existing technology versus new work

Existing: Apple Watch accelerometer/gyroscope, Core Motion/watchOS APIs, native companion-app synchronization, velocity-based training methods and commercial bar-velocity reference devices. New sensor hardware is not a prerequisite for an initial feasibility prototype.

Development/research needed: watchOS companion app; rep and concentric-phase detection; orientation/gravity correction, filtering and integration-drift control; exercise-specific handling of wrist versus bar movement; personal calibration; signal-quality rejection; independent validation against a reference device and held-out sessions. Existing methods or libraries may be reusable, subject to license and actual measured performance. A novel scientific algorithm is not established as necessary, and the idea is not claimed as novel or patentable.

## Staged evaluation

1. Define one exercise, watch placement, lifting intent and velocity metric.
2. Assess velocity accuracy, agreement, repeatability and rep detection against a bar-mounted reference. Correlation alone is insufficient.
3. Display velocity and velocity loss only if accuracy is acceptable.
4. Explore individual RIR models using an appropriate supervised protocol; validate separately across sessions, loads and fatigue. Do not require unsupervised failure testing.
5. Report uncertainty and abstain when unsupported. Keep manual effort reporting available; do not automatically change training loads based on an unvalidated estimate.

No procurement, subscription, native app creation or change to the current workout algorithm is authorized by recording this idea. Revisit after current authentication, team permissions and workout-saving issues are verified.

## Research starting points

- Apple Core Motion: https://developer.apple.com/videos/play/wwdc2023/10179/
- Apple Watch velocity validation (2023, free-weight back squat): https://pmc.ncbi.nlm.nih.gov/articles/PMC10383699/
- Individual RIR-velocity models (2024): https://doi.org/10.14814/phy2.15955
- Counterevidence on across-set RIR prediction (2023): https://doi.org/10.1080/17461391.2023.2235314
