# LAB stabilization implementation plan

Goal: verify the deployed integration source and prevent unsafe replay of migrations on an already populated LAB with an empty ledger.

Base: `e95108a`, PR #62 integration head; main lacks the integrated feature stack. PR #63 is merged here; PR #65 remains separate.

Constraints: read-only remote inspection; no remote migrations, deployment, merge, secrets changes or real provider writes. Preserve Premium UI and authorization.

1. Verify current repository, CI, bindings and schema. Compare all required table/column names against a disposable schema built from every checked-in migration in dependency order.
2. Add failing local regressions for a complete schema with empty ledger, missing Calendar columns, partial migration, missing management structures, malformed snapshots and CLI failure status.
3. Implement an offline schema preflight accepting metadata only, with no network access or write runner. Classify missing structures and prohibit generic replay; preserve original migrations. Rehearse partial Calendar additive repair locally.
4. Run standalone/foundation tests, TypeScript, builds, lint, and existing synthetic Calendar/permission/Worker checks. Record baseline failures separately.
5. Review diff, commit, push a dedicated stabilization branch and create a PR against integration. Verify CI; document exact remote limitations, backup/restore and approval-gated deployment procedure.

Review focus: an empty ledger is not an empty database; partial ALTER application must not duplicate columns; unknown snapshot fields must not imply readiness; schema compatibility is not provider readiness; no private records or secrets enter Git.
