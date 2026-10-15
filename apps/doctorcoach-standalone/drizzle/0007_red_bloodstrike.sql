CREATE TABLE `account_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`kind` text NOT NULL,
	`state` text DEFAULT 'pending' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `account_request_user` ON `account_requests` (`user_id`,`state`);--> statement-breakpoint
CREATE TABLE `audit_events` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_id` text NOT NULL,
	`subject_id` text NOT NULL,
	`action` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `audit_subject_created` ON `audit_events` (`subject_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `medical_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`flags_json` text NOT NULL,
	`urgency` text NOT NULL,
	`state` text DEFAULT 'pending' NOT NULL,
	`response` text DEFAULT '' NOT NULL,
	`reviewer` text,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `review_client_state` ON `medical_reviews` (`client_id`,`state`);--> statement-breakpoint
CREATE UNIQUE INDEX `review_one_open` ON `medical_reviews` (`client_id`) WHERE "medical_reviews"."state" IN ('pending','in_review');--> statement-breakpoint
CREATE TABLE `message_reads` (
	`user_id` text NOT NULL,
	`client_id` text NOT NULL,
	`channel` text NOT NULL,
	`read_through` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `message_read_user_thread` ON `message_reads` (`user_id`,`client_id`,`channel`);--> statement-breakpoint
CREATE TABLE `team_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`channel` text NOT NULL,
	`author_id` text NOT NULL,
	`author_name` text NOT NULL,
	`author_role` text NOT NULL,
	`content` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `messages_client_channel_created` ON `team_messages` (`client_id`,`channel`,`created_at`);--> statement-breakpoint
CREATE TABLE `user_consents` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`consent_id` text NOT NULL,
	`revision` text NOT NULL,
	`accepted` integer NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `consents_user_kind_created` ON `user_consents` (`user_id`,`consent_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `user_intakes` (
	`user_id` text PRIMARY KEY NOT NULL,
	`answers_json` text NOT NULL,
	`completed` integer DEFAULT 0 NOT NULL,
	`tour_completed` integer DEFAULT 0 NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
