# Unified progress timeline — 2026-10-09

The trainee Progress page now joins completed workouts, next-day pain reports,
nutrition/body measurements, rehabilitation measurements and readiness reports.
Filters select a domain and inclusive date range; events load in groups of 20.
Existing performance graphs and detailed workout records remain available.

Workouts use the Israel calendar date; follow-ups retain their own report date.
Zero is a real value, while missing measurements stay absent. Rehabilitation
entries retain region, side, movement and timing rather than mixing measurements.
Private narrative notes, assessments and plans are not copied into the timeline.
Only existing authenticated API responses are used; no server permissions or
clinical rules changed. The view discloses the existing 50-workout / 730-record
history limits. This is not an unlimited archive or a staff timeline.

Resource isolation: useCareResource tags cached results by request URL and hides
the previous URL's data immediately during a switch. Stale request callbacks are
scoped by URL epoch and request sequence. A saved response invalidates earlier
GETs. 401/403/404 clear cached content; transient failures can retain only the
same resource's data with an error indicator.

Verification: TypeScript and 136 automated tests passed. Added eight tests for
timeline ordering, filtering, privacy exclusions, missing/zero values and resource
isolation. Browser/mobile layout, real-account journeys and runtime React races
have not been end-to-end verified. Production build is part of publication.

Next implementation candidate: readiness trend visualization (currently reports
are listed), followed by role-scoped staff timeline integration. Browser journey
verification remains required when the supported browser capability is available.
