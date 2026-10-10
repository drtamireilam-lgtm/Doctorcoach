CREATE TABLE `success_stories` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`display_name` text NOT NULL,
	`content` text NOT NULL,
	`consent` integer DEFAULT 0 NOT NULL,
	`consent_at` text,
	`published` integer DEFAULT 0 NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `stories_owner` ON `success_stories` (`owner_id`);--> statement-breakpoint
CREATE INDEX `stories_public` ON `success_stories` (`published`,`consent`);--> statement-breakpoint
CREATE TABLE `trainee_feedback` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`context` text NOT NULL,
	`category` text NOT NULL,
	`content` text NOT NULL,
	`state` text DEFAULT 'new' NOT NULL,
	`response` text DEFAULT '' NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `feedback_owner_created` ON `trainee_feedback` (`owner_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `feedback_state_created` ON `trainee_feedback` (`state`,`created_at`);--> statement-breakpoint
CREATE TABLE `wellness_records` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`kind` text NOT NULL,
	`slot` text NOT NULL,
	`day` text NOT NULL,
	`content_json` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`author_name` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `wellness_client_kind_slot` ON `wellness_records` (`client_id`,`kind`,`slot`);--> statement-breakpoint
CREATE INDEX `wellness_client_kind_day` ON `wellness_records` (`client_id`,`kind`,`day`);--> statement-breakpoint
ALTER TABLE `care_connections` ADD `nutrition_access` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `care_notes` ADD `mention_email` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `program_items` ADD `target_rpe` real;