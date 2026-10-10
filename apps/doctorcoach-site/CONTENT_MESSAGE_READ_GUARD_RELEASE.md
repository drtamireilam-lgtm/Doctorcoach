# Clinical content and conversation read guards

Clinical content creation/update now checks the current active clinician role
inside SQL. Explicit disabled/changed-role records override configured clinician
fallback. Lost authorization returns 403 before version conflict; existing hash,
confirmation, missing-exercise and optimistic version checks remain intact.

Staff conversation reads require the current channel role, connection scope
and clinical/nutrition grant in the message SELECT. A final permission check
discards a response if access was lost after rows were fetched. Owners retain
their history after recipient revocation. Historical reads introduce no new
health-consent requirement and do not mutate messages or read markers.

Verification: TypeScript and all 363 tests passed. Twenty-five new cases cover
four channels across connection/scope/role/disablement races, medical/nutrition
grants, revocation after fetch, owner history, clinician create/update revocation
and a competing content revision. Production build runs during publication.
No schema changes. Browser/mobile and live-account verification remain pending.
