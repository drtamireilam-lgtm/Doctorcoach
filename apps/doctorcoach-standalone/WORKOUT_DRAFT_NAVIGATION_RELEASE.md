# Workout draft navigation — 2026-10-10

Observed source defect: SetLine keeps edits locally until an explicit save. The existing
beforeunload handler warned on page unload, but sidebar, bottom navigation and hash/history
navigation could unmount the workout without a warning. No autosave existed or is introduced.

## Change

- The existing workout reports whether any set contains unsaved edits to the page shell.
- Sidebar, bottom menu, in-app actions, direct hash links and browser history changes pass
  through a shared navigation gate. A native confirmation explicitly says leaving discards
  unsaved edits. Cancelling leaves the workout mounted and restores the previous hash on
  a hash/history attempt. History restoration replaces the attempted entry; browser acceptance
  must check back/forward behavior on supported devices.
- Existing page-unload protection remains. Saving all edited sets removes the warning.
- Successful explicit finish/cancel clears the guard before its existing destination;
  failed requests retain the guard. Finish still checks the existing dirty-set condition.
- Workout text distinguishes saved sets from edits awaiting a save.
- Guard stores only route and dirty metadata, never set values or medical data. No local
  persistence, database, payment, calculation, clinical gate or API permission change.

## Verification

617 automated tests and TypeScript passed. Five new cases cover rejected departures,
same-screen navigation, approved discard, resolved drafts, and exact hash restoration.
These are navigation-state tests, not browser interaction tests. Real phone/native-dialog,
back/forward and signed-in account acceptance remains outstanding because supported browser
QA is unavailable. Production build passed before packaging this release.

## Phone acceptance checklist

1. Open an assigned workout and edit a set without saving.
2. Select My Program, Progress or Settings. Cancel the warning: edited values must remain.
3. Repeat using browser Back and a direct internal link. Cancel: remain in the workout.
4. Save the edited set. Navigate away and return: server-saved values must remain.
5. Edit again and explicitly approve leaving: unsaved values may be discarded; saved sets
   must remain. Check forward/back history and reload behavior.
6. Verify finish/cancel and medical-block behavior continue to use existing server guards.

Files: app/page.tsx, components/training-workspace.tsx, lib/workout-navigation.ts,
tests/workout-navigation.test.mjs, DEVELOPMENT_STATUS.md, this report.
GitHub prototype remains separate. Payment branch remains unpublished and excluded.

## Follow-up: exercise replacement

The source audit also found that an eligible exercise could be replaced while its unsaved
set edits were still local. Replacement unmounts the old exercise row and would discard those
edits. Replacement now waits until all edited sets are saved, matching the existing effort-scale
and next-load safeguards. An explanation is shown beside the disabled action.

Confirmation also rechecks current UI eligibility (busy state, drafts, completed sets and the
currently available replacement list). Existing coach-approved choices and server authorization
are retained. No exercise is auto-replaced and no new save/charge action is introduced.

617 existing automated tests and TypeScript passed. Browser acceptance must additionally check:
edit an uncompleted set → replacement unavailable with explanation → save edit → open an eligible
replacement → confirm → existing server-approved replacement behavior. Also check a completed set
still blocks replacement and coached users still see only approved alternatives.
