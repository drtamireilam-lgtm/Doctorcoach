CREATE TABLE `custom_exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`definition_json` text NOT NULL,
	`state` text DEFAULT 'private' NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`reviewer_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT "custom_exercises_state" CHECK("custom_exercises"."state" IN ('private','pending','published'))
);
--> statement-breakpoint
CREATE INDEX `custom_exercises_owner` ON `custom_exercises` (`owner_id`,`state`);--> statement-breakpoint
ALTER TABLE `program_items` ADD `custom_exercise_json` text;