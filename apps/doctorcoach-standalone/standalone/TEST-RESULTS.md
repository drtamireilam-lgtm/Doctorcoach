# Standalone verification checkpoint — 15 October 2026

Base: full v171 source, `ce4cba9f3e5c703bf84b801e05491070a00fe947`.
All 779 original source paths retained. Existing app, pilot and production data
remain unchanged. The standalone candidate is not deployed.

| Check | Actual result |
|---|---|
| Full Node test suite after auth integration | 1,066 passed, zero failed |
| TypeScript noEmit | Passed |
| Standalone production build | Exit 0; separate Worker and SSR assets emitted |
| Built Worker in local workerd with real local D1/R2 | Passed, synthetic identity provider |
| Real `/api/account` via standalone gateway | Correct identity; no staff rights for new user |
| Spoofed identity headers | Removed, cannot authenticate |
| Wrong/expired/replayed OTP and attempt/send limits | Passed isolated tests; provider delivery still unverified |
| Refresh and logout | Passed; real HTTP provider-token refresh simulated; replay denied |
| Concurrent refresh and logout race | Passed; one provider rotation, concurrent requests wait, no resurrection |
| Existing owner mapping | Passed synthetic signed dual proof; same owner ID and consent rows preserved |
| Legacy live bridge installation | NOT done; no production changes authorized before full validation |
| First workout via actual built HTTP API | Passed: two sets, RIR, next-load application, completed history |
| RPE/RIR/e1RM and fractional next-set suggestion | Existing full suite and standalone mapping integration passed |
| Private video and PDF via actual HTTP APIs | Exact synthetic R2 bytes retrieved; Cache-Control private no-store |
| Authenticated second-user access | Foreign workout, private PDF and video denied |
| Snapshot tooling | Passed synthetic table/schema/content/object-byte comparisons; targeted rerun after strengthening schema checks |
| Actual production D1/R2 backup/restore and metadata comparison | NOT done; no production export available |
| Browser/mobile interaction tests | NOT done |
| Real SMTP/email delivery and live Supabase token lifecycle | NOT done |
| Supabase setup SQL on a separate isolated project | Prepared, NOT applied or execution-tested |
| Cloudflare account login | Wrangler reports not authenticated |
| Domain/TLS/OAuth redirects | Not changed |
| Deployment gate | Intentionally blocked; incomplete checks cannot authorize publish |

Runtime testing caught a real compatibility issue: workerd rejects fetch
`redirect: 'error'`. The isolated provider adapter now uses `redirect: 'manual'`
and explicitly rejects 3xx responses. Tests ensure credentials are not followed
to another host. This correction is only in this candidate, not the existing app.

The local runtime tests are not a live staging deployment or real email test.
The synthetic snapshots are not an assertion that production data was migrated.
Use the README go-live blockers before doing any deployment or DNS work.
