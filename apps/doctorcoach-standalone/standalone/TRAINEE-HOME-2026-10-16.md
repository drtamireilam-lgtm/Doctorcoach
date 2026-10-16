# Trainee home: workout first

Development branch only; not deployed. No migrations, production changes, or user-data writes.

The existing signed-in trainee home now leads with My next workout. Start/return actions reuse StartButton and its existing StartDialog: readiness, pain-before, explicit day selection, fresh access refresh, idempotent server start, and active-session continuation remain intact. The call to action precedes the onboarding checklist. New users retain their existing questionnaire, medical hold, program-building, membership, and waiting-for-coach steps. Staff home and public introduction are unchanged.

Fixed coached programs preview the next day from completed sessions of the current assignment only. Multiple self or flexible days require explicit selection; no arbitrary day is selected. Single-day preview shows exercise and set counts.

Below the primary card are unread-message status (existing authenticated GET /api/messages, no message bodies or read-marker writes) and weekly/all-time completed-workout counts from the existing training feed. Message loading/error stays distinct from zero unread. The summary refreshes on focus/visible return and remounting Home. No automatic start, permission grant, or redirect that overrides explicit section links.

Validation: full automated suite, TypeScript, and standalone build. New tests cover fixed assignment filtering, flexible/self choice, empty and single-day previews, keeping the dialog mounted through refresh, and withholding start on medical/profile gates. Device visual QA and actual phone start remain pending staging deployment. Test doubles validate component action selection, not browser rendering.
