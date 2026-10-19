# Trainee mobile navigation — 2026-10-05

Completed the daily-navigation follow-up from PRE_WORKOUT_READINESS_RELEASE.md.
Signed-in nonstaff members with completed onboarding get four phone tabs:
Home, Training, Progress and More. Training opens an active session when present,
otherwise the plan. Secondary destinations remain available in grouped More links.
Home prioritizes the active workout, medical block, assigned plan or independent
builder according to existing account state. Daily readiness opens its existing
form directly. Browser history/hash routing and the existing desktop dashboard,
public navigation and staff workspace are retained. No schema or access changes.

An active workout under a medical block now remains reachable for finish/cancel.
Its editing controls are replaced with saved-set counts; only previously saved
sets are included when finishing. Existing server guards remain authoritative.

Validation: 107 regression tests passed, including new navigation eligibility and
route coverage checks and existing blocked-session write/finish/cancel tests.
TypeScript passed. Production build is required by the packaging helper.
Supported browser QA is unavailable; real-device visual and signed-in acceptance
have not been performed.

Next: align the guided app tour with these four mobile destinations and verify
the end-to-end trainee journey on a signed-in mobile device when QA is available.
