-- Approval-gated standalone migration. Never execute with the generic runner:
-- inspect identity schema and ledger, back up and restore locally first.
CREATE TABLE dc_managed_users (
 user_id TEXT PRIMARY KEY REFERENCES dc_identity_principals(id),
 role TEXT CHECK(role IN ('trainee','coach','physician','dietitian')),
 approval TEXT NOT NULL DEFAULT 'pending' CHECK(approval IN ('pending','approved','legacy')),
 status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive')),
 coach_id TEXT REFERENCES dc_identity_principals(id),
 version INTEGER NOT NULL DEFAULT 0,
 joined_at INTEGER NOT NULL,
 last_operation_id TEXT,
 CHECK(coach_id IS NULL OR (role='trainee' AND approval='approved'))
);
CREATE INDEX dc_managed_filter ON dc_managed_users(status,approval,role,joined_at,user_id);
CREATE INDEX dc_managed_coach ON dc_managed_users(coach_id,status);
-- Explicit compatibility snapshot, subject to review before remote application.
-- No existing care_staff, consents, programs or clinical grants are modified.
INSERT INTO dc_managed_users(user_id,role,approval,status,joined_at)
 SELECT p.id,CASE s.role WHEN 'coach' THEN 'coach' WHEN 'clinician' THEN 'physician' WHEN 'dietitian' THEN 'dietitian' ELSE 'trainee' END,
 'legacy',CASE WHEN p.state='active' THEN 'active' ELSE 'inactive' END,p.created_at
 FROM dc_identity_principals p JOIN dc_identity_details d ON d.principal_id=p.id
 LEFT JOIN care_staff s ON s.email=d.email;
CREATE TRIGGER dc_registration_pending AFTER INSERT ON dc_identity_details BEGIN
 -- legacy=1 is written only after the existing server-verified ownership bridge.
 -- Preserve prior professional status for those existing accounts, never admin.
 INSERT INTO dc_managed_users(user_id,role,approval,status,joined_at)
 SELECT p.id,CASE WHEN NEW.legacy=1 THEN CASE s.role WHEN 'coach' THEN 'coach' WHEN 'clinician' THEN 'physician' WHEN 'dietitian' THEN 'dietitian' ELSE 'trainee' END ELSE NULL END,
 CASE WHEN NEW.legacy=1 THEN 'legacy' ELSE 'pending' END,
 CASE WHEN p.state='active' THEN 'active' ELSE 'inactive' END,p.created_at
 FROM dc_identity_principals p LEFT JOIN care_staff s ON s.email=NEW.email WHERE p.id=NEW.principal_id;
END;
CREATE TABLE dc_management_grants (
 user_id TEXT PRIMARY KEY REFERENCES dc_identity_principals(id),
 permission TEXT NOT NULL CHECK(permission IN ('owner','secretary')),
 granted_by TEXT NOT NULL,
 granted_at INTEGER NOT NULL
);
-- Bootstrap owner requires separately approved canonical identity, never email.
CREATE UNIQUE INDEX dc_single_owner ON dc_management_grants(permission) WHERE permission='owner';
CREATE TABLE dc_management_audit (
 operation_id TEXT PRIMARY KEY,
 actor_id TEXT NOT NULL,
 target_id TEXT NOT NULL,
 action TEXT NOT NULL CHECK(action IN ('user_update','secretary_grant','secretary_revoke','denied')),
 before_json TEXT,
 after_json TEXT,
 request_json TEXT,
 created_at INTEGER NOT NULL,
 result TEXT NOT NULL CHECK(result IN ('success','denied'))
);
CREATE INDEX dc_management_audit_target ON dc_management_audit(target_id,created_at,operation_id);
CREATE TRIGGER dc_management_audit_no_update BEFORE UPDATE ON dc_management_audit BEGIN SELECT RAISE(ABORT,'Append-only management audit'); END;
CREATE TRIGGER dc_management_audit_no_delete BEFORE DELETE ON dc_management_audit BEGIN SELECT RAISE(ABORT,'Append-only management audit'); END;
