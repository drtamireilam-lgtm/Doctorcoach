CREATE TABLE `self_program_splits` (
	`owner_id` text PRIMARY KEY NOT NULL,
	`payload_json` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
DROP INDEX `program_owner_exercise`;--> statement-breakpoint
ALTER TABLE `program_items` ADD `day_id` text DEFAULT '1' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `program_owner_exercise_day` ON `program_items` (`owner_id`,`exercise_id`,`day_id`);