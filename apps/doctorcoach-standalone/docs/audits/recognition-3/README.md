# Exercise Recognition 3.0 — current candidate

All **183 current exercise IDs** have at least 15 normalized bilingual alternative names. The original 173 IDs are unchanged; ten canonical additions distinguish previously absent implement/grip/posture definitions. **3,224 normalized per-ID aliases**, **+2,693 over base #50**; stricter token-distinct total 3,044. Canonical names/IDs are excluded. Listed word-order variants count separately only in the literal normalized metric. No runtime aliases are generated to inflate counts.

Current audit: aliases.csv / alias-audit.json / coverage.md. Naming collisions and literal generic-parent overlaps remain 28, not 28 wrong matches. Count coverage is not automatic recognition accuracy.

Current source analysis: **117/191 extracted rows automatic**, versus 106 previous and 95 base; all 106 previous targets preserved. Remaining 74 rows: 46 missing names, 2 possible headings, 22 ambiguous variants, 3 questions/alternatives, 1 instruction. This is a development corpus, not a representative labeled evaluation. Private source files and metadata are excluded from Git.

Current change and evidence: **MISSING_VARIANTS.md**, source-coverage.json and local-browser.json. Earlier FOLLOWUP_2026-10-26.md and UNRESOLVED_REVIEW.md describe earlier snapshots and are historical.

Validation: **1,508 application tests pass**, root foundation/profile RLS 16 pass; TypeScript, targeted changed-file lint, isolated build/static target check and built local Worker smoke pass. **12 real local Chromium flows** exercise all 10 new IDs across CSV/XLSX/text-PDF, both languages and desktop/mobile widths, including conservative manual choice, explicit skips, draft callback and real proposal downloads. The browser harness uses synthetic GET fixtures and an in-memory callback; it does not claim authenticated browser saving/assignment or live LAB. Full-app lint not rerun; base debt remains.

Frozen unchanged 32-case benchmark: 15 correct automatic, 0 wrong; 15/21=71.4% resolvable coverage. Small/nonrepresentative.

Reproduce from apps/doctorcoach-standalone:

```sh
npm test
npm run typecheck
node --experimental-strip-types scripts/audit-exercise-aliases.mjs
node --experimental-strip-types scripts/evaluate-exercise-matching.mjs
DC_IMPORT_CHROMIUM=/path/to/chromium node scripts/import-browser-smoke.mjs
DC_ISOLATED_STAGING_BUILD=true npm run build:standalone
node standalone/scripts/check-isolated-staging.mjs dist/server/wrangler.json
node --experimental-strip-types standalone/scripts/runtime-smoke.mjs
```

Remaining gates: human terminology review, independently labeled representative evaluation, exact new-head CI, coordinated authenticated isolated LAB desktop/mobile save→assignment→workout→refresh and Safari/iOS acceptance. Cloudflare Apple sign-on failed and Wrangler is unauthenticated; this candidate has not been deployed. No main merge, Production change, remote schema/data write or LAB overwrite. Keep draft PR #53 and Issue #51 open.
