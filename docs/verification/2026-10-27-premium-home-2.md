# Premium Home 2.0 — LAB candidate

Continues PR #58 on feature/premium-home-ui-20261027 from bbfc35a.

Changes: coherent desktop hero/summary layout, responsive home header with visible profile and language controls, safe-area padding, 44px action targets, language-selected arrows without a second global flip, and a truthful steps empty state instead of decorative chart bars. Existing header actions, routing, auth and training guards are retained.

## Verified locally
- TypeScript: exit 0.
- Standalone tests: 1215 passed, 0 failed.
- Standalone build: exit 0 (rechecked after final styling).
- Chromium anonymous full-app home: Hebrew RTL and English LTR at 320, 375, 390 and 1440 pixels; no horizontal overflow; profile visible; consultation navigation works; no page errors. Mobile and desktop screenshots visually inspected.
- git diff --check: clean.

The original CI run 40514454818 failed one coach-payment fixture test. Its removed-seat event was dated October 20 while the active event was created at execution time (October 27); historical billing correctly found the later active event. The fixture now gives the active event a fixed October 15 date. No payment implementation or database migration changed. The 14 payment tests and then the complete suite passed.

## Limits and deployment blocker
Wrangler whoami reports unauthenticated. No LAB deployment was performed, and the live LAB has not been claimed to contain these changes. A Cloudflare-authorized runner must deploy the checked candidate to doctorcoach-isolated-staging only, using LAB Supabase jbfkzkzcznfacsjdawmf, then verify the remote build and authenticated journeys. Do not merge main or deploy Production.

Browser checks use anonymous local Worker execution and disposable local D1/R2, not a physical iPhone, authenticated remote account, notification delivery, or live workout persistence. Light/custom theme interactions and authenticated states require further acceptance. The English header's existing anonymous theme-save notice is still Hebrew.

Parallel management/calendar branch commits also touch page.tsx. They were identified but not combined into this design branch; a future LAB integration must preserve both sets of changes. No user permissions, production secrets or remote data were changed.
