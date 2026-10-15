CREATE TABLE `care_task_events` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`actor_email` text NOT NULL,
	`action` text NOT NULL,
	`snapshot_json` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `care_task_history` ON `care_task_events` (`task_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `care_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`channel` text NOT NULL,
	`title` text NOT NULL,
	`details` text DEFAULT '' NOT NULL,
	`assignee_email` text NOT NULL,
	`due_day` text,
	`state` text DEFAULT 'open' NOT NULL,
	`creator_id` text NOT NULL,
	`creator_email` text NOT NULL,
	`updated_by` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `care_task_client_state` ON `care_tasks` (`client_id`,`state`);--> statement-breakpoint
CREATE INDEX `care_task_assignee_due` ON `care_tasks` (`assignee_email`,`due_day`);