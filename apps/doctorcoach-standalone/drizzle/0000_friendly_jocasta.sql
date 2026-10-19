CREATE TABLE `program_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	`sets` integer DEFAULT 2 NOT NULL,
	`reps` integer DEFAULT 10 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `program_owner_exercise` ON `program_items` (`owner_id`,`exercise_id`);--> statement-breakpoint
CREATE TABLE `workout_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_id` text NOT NULL,
	`exercise_count` integer NOT NULL,
	`pain_before` integer NOT NULL,
	`pain_after` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `logs_owner_created` ON `workout_logs` (`owner_id`,`created_at`);