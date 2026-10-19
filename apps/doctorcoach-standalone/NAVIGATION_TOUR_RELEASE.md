# Guided mobile navigation — 2026-10-05

Completes the guide follow-up from SIMPLE_NAVIGATION_RELEASE.md. A completed-onboarding
trainee launching the guide at a phone viewport gets Home, Training, Progress and
More in order, with the matching bottom tab highlighted. Training opens the active
workout when present, otherwise the plan. More explains where learning, anatomy,
rehabilitation, nutrition, messages and appointments live. The full six-step tour
remains for desktop, staff and public visitors.

The guide mode and initial workout destination are fixed per launch so resizing
does not change the current lesson. Next/Previous navigate actual existing routes.
Headings receive keyboard focus; Escape or Close dismiss without recording completion.
Only the final completion button records completion using the existing onboarding API.
Save failures now show a message instead of being silently ignored. The panel scrolls
on short screens and sits above mobile navigation with safe-area spacing.

Checks: TypeScript, regression suite including three route/guide tests, production
build. No supported browser QA is available; actual viewport layout, focus and
signed-in end-to-end behavior still require real-device acceptance.

Next: audit and improve empty/loading/error states in the simplified trainee journey,
especially waiting for assignment versus missing data or expired independent access.
