# Invitation persistence guards

Creation now inserts only when every selected staff member remains active in
the captured role, with the hourly cap enforced inside the same SQL statement.
Configured clinicians are accepted only without an overriding staff record.

Acceptance checks current required consent, profile existence, captured staff
roles, invitation contents, expiration and single-recipient consumption inside
a D1 transaction. Connections precede consumption and require an unconsumed
invitation. An exact consumed retry never reactivates a revoked connection.
Existing role-change downgrade behavior retains no medical/nutrition escalation;
fresh invitations remain required for expanded grants. Transitions into or out
of coordinator scope require a fresh invitation and cannot gain care access.

Verification: TypeScript and all 207 tests passed. Twelve new cases cover staff
disable/promotion/coordinator changes, consent withdrawal, profile removal,
expiry, another recipient, revoked retry, rollback and creation races. Existing
invitation test now supplies current onboarding consent explicitly.
Production build is checked during publication. Browser/mobile and live
account verification remain outstanding.
