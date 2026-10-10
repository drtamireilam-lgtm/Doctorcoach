CREATE TABLE `message_links` (
	`message_id` text PRIMARY KEY NOT NULL,
	`document_id` text,
	`video_id` text,
	`exercise_id` text,
	`session_id` text
);
--> statement-breakpoint
CREATE TABLE `notification_dismissals` (
	`user_id` text NOT NULL,
	`notification_id` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`user_id`, `notification_id`)
);
--> statement-breakpoint
CREATE TABLE `notification_preferences` (
	`user_id` text PRIMARY KEY NOT NULL,
	`preferences_json` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `passport_details` (
	`client_id` text PRIMARY KEY NOT NULL,
	`content_json` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `private_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`uploader_id` text NOT NULL,
	`uploader_name` text NOT NULL,
	`purpose` text NOT NULL,
	`channel` text DEFAULT '' NOT NULL,
	`category` text NOT NULL,
	`filename` text NOT NULL,
	`mime` text NOT NULL,
	`bytes` integer NOT NULL,
	`object_key` text NOT NULL,
	`status` text DEFAULT 'uploading' NOT NULL,
	`created_at` text NOT NULL,
	CONSTRAINT "document_size" CHECK("private_documents"."bytes" BETWEEN 8 AND 10485760),
	CONSTRAINT "document_purpose" CHECK("private_documents"."purpose" IN ('medical','message'))
);
--> statement-breakpoint
CREATE INDEX `documents_client_purpose` ON `private_documents` (`client_id`,`purpose`,`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `thread_states` (
	`client_id` text NOT NULL,
	`channel` text NOT NULL,
	`resolved_through` integer DEFAULT 0 NOT NULL,
	`resolved_by` text NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`client_id`, `channel`)
);
--> statement-breakpoint
CREATE TABLE `weekly_goals` (
	`client_id` text NOT NULL,
	`week` text NOT NULL,
	`planned_sessions` integer NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`client_id`, `week`),
	CONSTRAINT "weekly_goal_range" CHECK("weekly_goals"."planned_sessions" BETWEEN 0 AND 21)
);
