# Source alignment and performance consistency — 2026-10-08

The canonical production repository and remaining audit work order are documented
in DEVELOPMENT_STATUS.md, linked from README. GitHub remains a separate prototype;
no merge or synchronization is claimed or performed.

The trainee and coach progress panels now default to the same effort-adjusted
e1RM function used under each workout set. Only performed sets in completed sessions
contribute. Each point is the highest eligible estimate for that exercise/session.
Unsupported/missing effort leaves a gap rather than mixing formulas. Reps-only
historical comparison remains available as an explicitly labeled alternative.
Peak/latest/PR calculations use the selected method; missing latest data no longer
shows an older estimate as the latest performance. A separately labeled working-load
line shows the highest performed external load, even when effort is missing.
Stored sets and the CSV's two explicitly named estimate columns are unchanged.

This batch also finishes the previously pending navigation-tour cleanup described
in NAVIGATION_TOUR_RELEASE.md. This is still the four-tab interim mobile experience;
the newly agreed seven-area redesign remains later in the audit work order.

Validation: regression suite including five new numerical/history cases, TypeScript
and production build. Browser/mobile acceptance remains unverified because the
supported browser QA capability is unavailable. No database migration is needed.

Next: link pain/readiness records to the relevant workout and team review, before
adding next-workout progression or changing clinical recommendation rules.
