# LAB authentication-language repair — 28 October 2026

The live English My Program link did not pass lang, so the compatibility gateway returned a Hebrew sign-in page. Existing PR46/47 fixes were missing from the active Premium branch. Reuses auth-language5f7bc27 and Linux OAuthUI9e0d0e4 changes, preserving18themes and all active LAB features. No schema, user role, secret or OAuth scope changes. Root parent4e9cac25.

Local1632 tests, TypeScript and static isolated target check passed. Built full-app12 anonymous journeys passed: plan/care/onboarding ×HE/EN ×390/1440; sign-in and return preserve language, section and onboarding continuation. Worker HTTP auth/session/refresh/logout, permissions, training, preferences and consultation regressions passed with synthetic providers. Isolated build passed. No actual OTP or Google account sign-in performed.

The new browser harness initially selected a hidden retained onboarding link; corrected to visible links and rerun successfully. This was a harness failure, not a product regression. Independent review of the same semantic changes in the combined audit found no additional auth/Home integration issues.

Publishing only this schema-independent fix to existing LAB branch/PR58. Combined Calendar/management candidate remains in separate draftPR59 because remoteD1 migration0060/backup cannot beverified. No merge to main, Production deploy, real user edits or Calendar event.

Live deployment and fresh browser acceptance will be reported separately after actual completion; these local results alone do not establish a deployment.
