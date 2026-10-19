# Smart notification follow-up

The existing consent, categories, dismissal, quiet hours and in-app bell remain. No external push, SMS, email, background delivery or schema migration is added.

Weekly report reminders now include prior-week rehabilitation, readiness and daily tracking even without completed workouts. Opening the reminder selects the advertised historical week through a temporary sessionStorage handoff and a mounted-card event; only a week string is stored and it is consumed once.

An unmet explicitly saved weekly workout target receives a neutral reminder from Thursday onward. It does not invent workout dates, call a workout missed, recommend catching up or infer readiness. Once the target is reached, the pending reminder disappears and the existing goal-reached reminder applies. Existing categories, stable weekly IDs, dismissals and quiet hours continue to filter the results.

ROM reminders are now based on each active, explicitly linked episode with an existing ROM measurement matching its region and side. Zero ROM is a real measurement. Recent measurements for another episode cannot suppress a stale episode's reminder. Closed, never-measured and unlinked episodes do not trigger it. At most one generic ROM reminder is shown without injury names.

Three new migration-backed tests verify weekly tracking-only coverage and owner isolation, target timing/reached suppression/no invented schedule, and episode-specific ROM behavior with zero values and closed episodes. Browser/phone validation and live delivery remain unverified because the supported managed browser plugin is unavailable. Automated checks and build results are recorded by the development workflow.
