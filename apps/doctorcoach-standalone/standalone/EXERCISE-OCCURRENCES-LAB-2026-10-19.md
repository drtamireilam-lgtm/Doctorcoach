# Isolated LAB release checklist — exercise occurrences

This candidate is not deployed. Production is out of scope. Run commands from `apps/doctorcoach-standalone`; the root Vite app is a different application. Required external handoff: Cloudflare login and a controlled test mailbox. Do not post credentials/OTPs in a public report.

## Read-only checks after login

```powershell
npx wrangler whoami
npx wrangler d1 info doctorcoach-isolated-staging --config standalone/wrangler.isolated-staging.json
npx wrangler d1 execute doctorcoach-isolated-staging --config standalone/wrangler.isolated-staging.json --remote --command "PRAGMA table_info(program_items); PRAGMA table_info(media_assets); SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'program_owner_%';"
```

Verify account ownership, D1 UUID `0e7a9467-5758-4d6f-b52a-ee4385a2d37d`, private R2 `doctorcoach-isolated-staging`, Supabase identity `jbfkzkzcznfacsjdawmf`, Worker `doctorcoach-isolated-staging`, exact workers.dev origin, disabled legacy bridge and `keep_vars:true`. Do not reuse the older test database/bucket. Do not change DNS or Production bindings.

## Schema prerequisite

Record the actual remote schema and migration ledger. The earlier runbook notes both drizzle application migrations and standalone identity migration; listing only standalone/migrations is not proof the application migrations ran. Never re-run every migration on a nonempty database. If required predecessor columns/tables are absent, reconcile missing earlier migrations first. Preserve the existing database with the established backup procedure.

Only if this is the verified isolated LAB, all predecessors through 0051 are present, program/media occurrence_id columns are absent, and program_owner_exercise_day exists, apply:

```powershell
npx wrangler d1 execute doctorcoach-isolated-staging --config standalone/wrangler.isolated-staging.json --remote --file drizzle/0052_exercise_occurrences.sql
```

Do not re-run if already applied or partially applied. Recheck both columns and program_owner_occurrence. Keep the existing deletion guard triggers. No rows are deleted or backfilled by 0052.

## Build and static gate (PowerShell)

```powershell
$env:DC_ISOLATED_STAGING_BUILD="true"
npm run build:standalone
node standalone/scripts/check-isolated-staging.mjs
```

Stop on any failure. The generated config must name the dedicated isolated Worker/D1/R2. Only after those checks, schema readiness and review may the authorized isolated LAB candidate be deployed using its generated config. Never use standalone/wrangler.json, which contains a placeholder target, or a Sites publication command for this LAB task. No Production release is authorized.

## Synthetic live acceptance

Use two unrelated controlled test accounts and separate coach/trainee contexts. Confirm email delivery, first registration and returning login. Build a program with barbell Bench on days 1/2/3, Squat twice on day 1 and Deadlift on days 1/3. Use different sets and targets. Save/reload a draft, review/assign, execute day 1, edit one occurrence, verify the other stays unchanged, attach a video to the correct occurrence, finish and inspect history/graphs. Test copy/import/reorder and all seven saved themes. Verify account B cannot read account A's program, videos or medical files. Use synthetic content only. Record source commit, actual results and unresolved failures.
