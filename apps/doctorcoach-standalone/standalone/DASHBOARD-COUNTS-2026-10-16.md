# Team dashboard workout counts

The owner reported zero trainees after completing a personal workout and no workout total.

Source inspection: the staff dashboard roster is explicitly scoped to active care connections for the authenticated staff account. A standalone personal account or completed workout does not implicitly create a care connection. The deployed account's actual sharing state has not been inspected, so this is a plausible explanation, not a verified live diagnosis. Do not auto-link trainees or widen staff access to make a counter nonzero.

Changes: show total completed workouts alongside weekly completions on each authorized client card and in the authorized roster summary. Count only completed, non-future sessions for that owner. Show available/assigned client coverage, keep consent-unavailable activity distinct from zero, and explain that sharing is required. Coordinator views do not display workout totals. Existing manual dashboard refresh remains available.

Regression: weekly versus all-time counts exclude other owners, active, cancelled and future sessions; revocation removes the trainee from the dashboard while preserving saved workouts. Summary ignores unavailable activity. Full suite: 1,124 passed, 0 failed. Live deployment and browser verification of these changes remain pending.

Next live check: create an invitation from the doctor account selecting the intended care team; accept it using the separate personal account and normal consent flow. Reload the doctor's team dashboard. Confirm that the personal account's existing completed workout appears. Never share a patient file with an unrelated coach for a test.
