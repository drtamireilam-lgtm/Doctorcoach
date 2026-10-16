# Personal progress card ordering

Development branch only. No remote migrations, deployments or account-data changes performed.

## Interface

Existing progress topics now appear as reorderable cards rather than mutually exclusive topic tabs. Default order: consistency, performance/history, pain/rehab, body measurements, timeline. All prior charts, selectors, check-ins, weekly summary, detailed history and legacy records remain available. Total completed workouts added to consistency metrics.

Arrange cards reveals pointer/touch drag handles plus labelled Move up/down buttons for keyboard and touch alternatives. Only the handle disables touch scrolling; card content scrolls normally. Pointer capture is on the stable outer layout so rearranging a keyed card does not lose capture. Cancelled/lost capture restores the order from drag start. There is no autoscroll while dragging: for a long mobile page use the up/down buttons or scroll between gestures. Cards and their child controls remain mounted with stable keys while moving.

Changes are local until explicit Save order. Restore default also requires Save to persist. A changed order is labelled unsaved, with a browser-unload warning. Internal navigation can leave an unsaved arrangement; use Save before leaving. A failed save retains the chosen order and displays the error. Unknown/loading preference data disables edits; existing charts remain accessible. A conflict requires loading the saved order, with confirmation before discarding local changes. No rest timer added.

## Storage and access

Authenticated GET/POST `/api/preferences/progress`, private/no-store. Owner ID always comes from the server authenticated user; no other-user selector. Strict complete permutation and optimistic version validation. Server-backed order reloads across devices; it does not alter workout, health or measurement data. Account export includes the preference; account deletion scopes include the new table with insert/update deletion barriers.

Migration **0046_progress_layouts.sql** creates the initially empty preference table and deletion barriers. Before deployment apply pending 0045 and 0046 ONLY to the isolated staging DB after a verified private backup/restore check, following WORKOUT-FINISH-2026-10-16.md. Preserve staging resource config. Do not reapply old migrations or modify the pilot/production. No remote migration has been applied in this turn.

## Validation

Real SQLite tests: moving pain to first, strict permutation validation, independent users, persistence after re-instantiating store, stale version conflict, invalid payload no change, and deletion write barriers. Component/test-double tests: accessible button moves, explicit-save semantics, pointer cancellation, save failure keeping the order. Full test suite, TypeScript and standalone build. No actual iPhone touch, browser rendering, cross-device session or real-network preference test yet; those remain pending staging deployment.
