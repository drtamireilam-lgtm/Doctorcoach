CREATE TABLE `training_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`items_json` text NOT NULL,
	`started_at` text NOT NULL,
	`finished_at` text,
	`pain_before` integer NOT NULL,
	`pain_after` integer,
	`planned_sets` integer NOT NULL,
	`completed_sets` integer DEFAULT 0 NOT NULL,
	`version` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `training_one_active_per_owner` ON `training_sessions` (`owner_id`) WHERE "training_sessions"."status" = 'active';--> statement-breakpoint
CREATE INDEX `training_owner_status_started` ON `training_sessions` (`owner_id`,`status`,`started_at`);--> statement-breakpoint
ALTER TABLE `program_items` ADD `unit` text DEFAULT 'reps' NOT NULL;--> statement-breakpoint
ALTER TABLE `program_items` ADD `weight` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `program_items` ADD `notes` text DEFAULT '' NOT NULL;