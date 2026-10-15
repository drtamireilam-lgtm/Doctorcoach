# First workout resilience — 2026-10-13

Evidence: the reported mobile screenshot shows an open start dialog with zero exercises, a readiness load error, and a reversed pain score. The live assignment exists. Available Worker logs show successful program/wellness reads but no failed start matching the screenshot, so the exact original device/network/auth failure is not established. The database overview returned exactly 50 alphabetically ordered tables; omission of wellness_records from that bounded response is not evidence of missing storage. No schema or user records were changed.

Changes:
- Refresh the training data before opening the start dialog; failed refresh does not open it.
- Block submission when authentication, entitlement or the selected program is unavailable, including changes while the dialog is open.
- Serialize the refresh result by generation so older responses cannot overwrite newer data; disable mutations during refresh.
- Keep start errors inside the dialog until another attempt, and offer reload/sign-in recovery.
- Classify redirected HTML sign-in pages as authentication failures and other non-JSON responses as retryable response errors, rather than generic successful HTTP responses.
- Isolate the numerical pain score in LTR so zero pain displays 0 / 10 in Hebrew.
- Reject unresolved program exercises instead of silently dropping them from a workout snapshot.

Verification: new tests exercise first coached and independent workouts without readiness/history, retry/resume identity, empty/unresolved plans, dialog eligibility and HTML/JSON response handling. Existing authorization, concurrent start and consent checks remain enforced. TypeScript and production build passed. No browser QA was available in this environment. A real retry on the affected phone remains necessary to confirm the original incident is resolved.
