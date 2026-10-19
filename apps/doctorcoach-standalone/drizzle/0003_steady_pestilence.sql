CREATE TABLE `exercise_favorites` (
	`owner_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `favorites_owner_exercise` ON `exercise_favorites` (`owner_id`,`exercise_id`);