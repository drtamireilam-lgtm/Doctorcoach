-- Additive only. Apply through a separately reviewed migration; no remote execution.
ALTER TABLE training_sessions ADD COLUMN retrospective_json TEXT;
CREATE TABLE retrospective_workout_drafts (
 owner_id TEXT PRIMARY KEY NOT NULL,
 payload_json TEXT NOT NULL,
 version INTEGER NOT NULL DEFAULT 1,
 updated_at TEXT NOT NULL
);
CREATE TRIGGER deletion_guard_retrospective_draft_insert BEFORE INSERT ON retrospective_workout_drafts
WHEN EXISTS (SELECT 1 FROM account_deletions WHERE user_id=NEW.owner_id)
BEGIN SELECT RAISE(ABORT,'account deletion in progress'); END;
CREATE TRIGGER deletion_guard_retrospective_draft_update BEFORE UPDATE ON retrospective_workout_drafts
WHEN EXISTS (SELECT 1 FROM account_deletions WHERE user_id=NEW.owner_id OR user_id=OLD.owner_id)
BEGIN SELECT RAISE(ABORT,'account deletion in progress'); END;
