CREATE TABLE pilot_codes(id TEXT PRIMARY KEY,code_hash TEXT NOT NULL UNIQUE,label TEXT NOT NULL,duration_days INTEGER NOT NULL,max_uses INTEGER NOT NULL,used_count INTEGER NOT NULL DEFAULT 0,active INTEGER NOT NULL DEFAULT 1,expires_at TEXT NOT NULL,created_at TEXT NOT NULL,created_by TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE pilot_redemptions(code_id TEXT NOT NULL,user_id TEXT NOT NULL,starts_at TEXT NOT NULL,ends_at TEXT NOT NULL,PRIMARY KEY(code_id,user_id));
--> statement-breakpoint
CREATE INDEX pilot_user ON pilot_redemptions(user_id);
--> statement-breakpoint
CREATE TRIGGER deletion_guard_pilot_insert BEFORE INSERT ON pilot_redemptions WHEN EXISTS(SELECT 1 FROM account_deletions WHERE user_id=NEW.user_id) BEGIN SELECT RAISE(ABORT,'Account deletion in progress'); END;
