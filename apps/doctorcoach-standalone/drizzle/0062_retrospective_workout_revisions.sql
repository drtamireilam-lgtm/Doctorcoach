-- Additive private journal. No remote execution. Drop this table to roll back;
-- doing so discards correction history, so export it first under approved policy.
CREATE TABLE retrospective_workout_revisions (
 session_id TEXT NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
 owner_id TEXT NOT NULL,
 version INTEGER NOT NULL,
 snapshot_json TEXT NOT NULL,
 corrected_at TEXT NOT NULL,
 PRIMARY KEY(session_id,version)
);
CREATE INDEX retrospective_revisions_owner ON retrospective_workout_revisions(owner_id);
CREATE TRIGGER deletion_guard_retrospective_revision_insert BEFORE INSERT ON retrospective_workout_revisions
WHEN EXISTS (SELECT 1 FROM account_deletions WHERE user_id=NEW.owner_id)
BEGIN SELECT RAISE(ABORT,'account deletion in progress'); END;
