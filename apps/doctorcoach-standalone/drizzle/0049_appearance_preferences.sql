CREATE TABLE appearance_preferences (
 user_id text PRIMARY KEY NOT NULL,
 mode text NOT NULL CHECK(mode IN ('light','dark')),
 palette text NOT NULL CHECK(palette IN ('red','blue','pink','green','purple','orange','teal')),
 version integer DEFAULT 1 NOT NULL,
 updated_at text NOT NULL
);
--> statement-breakpoint
CREATE TRIGGER deletion_guard_appearance_insert BEFORE INSERT ON appearance_preferences
WHEN EXISTS(SELECT 1 FROM account_deletions WHERE user_id=NEW.user_id)
BEGIN SELECT RAISE(ABORT,'account deletion write barrier'); END;
--> statement-breakpoint
CREATE TRIGGER deletion_guard_appearance_update BEFORE UPDATE ON appearance_preferences
WHEN EXISTS(SELECT 1 FROM account_deletions WHERE user_id=NEW.user_id OR user_id=OLD.user_id)
BEGIN SELECT RAISE(ABORT,'account deletion write barrier'); END;
