CREATE TABLE `progress_layouts` (
 `user_id` text PRIMARY KEY NOT NULL,
 `order_json` text NOT NULL,
 `version` integer DEFAULT 1 NOT NULL,
 `updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TRIGGER deletion_guard_progress_layouts_insert BEFORE INSERT ON progress_layouts
WHEN EXISTS(SELECT 1 FROM account_deletions WHERE user_id=NEW.user_id)
BEGIN SELECT RAISE(ABORT,'account deletion write barrier'); END;
--> statement-breakpoint
CREATE TRIGGER deletion_guard_progress_layouts_update BEFORE UPDATE ON progress_layouts
WHEN EXISTS(SELECT 1 FROM account_deletions WHERE user_id=NEW.user_id OR user_id=OLD.user_id)
BEGIN SELECT RAISE(ABORT,'account deletion write barrier'); END;
