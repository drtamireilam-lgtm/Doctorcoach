CREATE TABLE `staff_workout_reviews` (
 `staff_id` text NOT NULL,
 `staff_role` text NOT NULL,
 `client_id` text NOT NULL,
 `session_id` text NOT NULL,
 `session_version` integer NOT NULL,
 `reviewed_at` text NOT NULL,
 PRIMARY KEY (`staff_id`,`staff_role`,`session_id`)
);
--> statement-breakpoint
CREATE INDEX staff_workout_reviews_client ON staff_workout_reviews(client_id);
--> statement-breakpoint
CREATE TRIGGER deletion_guard_staff_workout_reviews_insert BEFORE INSERT ON staff_workout_reviews
WHEN EXISTS(SELECT 1 FROM account_deletions WHERE user_id=NEW.client_id OR user_id=NEW.staff_id)
BEGIN SELECT RAISE(ABORT,'account deletion write barrier'); END;
--> statement-breakpoint
CREATE TRIGGER deletion_guard_staff_workout_reviews_update BEFORE UPDATE ON staff_workout_reviews
WHEN EXISTS(SELECT 1 FROM account_deletions WHERE user_id=NEW.client_id OR user_id=NEW.staff_id OR user_id=OLD.client_id OR user_id=OLD.staff_id)
BEGIN SELECT RAISE(ABORT,'account deletion write barrier'); END;
