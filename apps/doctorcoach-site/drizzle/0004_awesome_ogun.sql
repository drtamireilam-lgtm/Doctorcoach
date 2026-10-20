CREATE TABLE `care_appointments` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`client_name` text NOT NULL,
	`service_id` text NOT NULL,
	`title` text NOT NULL,
	`provider` text NOT NULL,
	`duration` integer NOT NULL,
	`price_agorot` integer NOT NULL,
	`preference` text NOT NULL,
	`state` text DEFAULT 'requested' NOT NULL,
	`starts_at` text,
	`ends_at` text,
	`meeting_url` text DEFAULT '' NOT NULL,
	`staff_note` text DEFAULT '' NOT NULL,
	`payment_state` text DEFAULT 'unpaid' NOT NULL,
	`payment_reference` text DEFAULT '' NOT NULL,
	`payment_verified_by` text,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `appointments_client_created` ON `care_appointments` (`client_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `appointments_provider_time` ON `care_appointments` (`provider`,`state`,`starts_at`);--> statement-breakpoint
CREATE TABLE `care_checkins` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`week` text NOT NULL,
	`sessions` integer NOT NULL,
	`pain` integer NOT NULL,
	`function_score` integer NOT NULL,
	`effort` integer NOT NULL,
	`content` text NOT NULL,
	`response` text DEFAULT '' NOT NULL,
	`reviewer` text,
	`reviewed_at` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `care_checkin_week` ON `care_checkins` (`client_id`,`week`);--> statement-breakpoint
CREATE TABLE `care_connections` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`staff_email` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`medical_access` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `care_client_staff` ON `care_connections` (`client_id`,`staff_email`);--> statement-breakpoint
CREATE INDEX `care_staff_active` ON `care_connections` (`staff_email`,`active`);--> statement-breakpoint
CREATE TABLE `care_invites` (
	`hash` text PRIMARY KEY NOT NULL,
	`staff_json` text NOT NULL,
	`created_by` text NOT NULL,
	`expires_at` text NOT NULL,
	`consumed_by` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `care_notes` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`author_id` text NOT NULL,
	`author_name` text NOT NULL,
	`kind` text NOT NULL,
	`content` text NOT NULL,
	`shared` integer NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `care_notes_client_created` ON `care_notes` (`client_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `care_profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`goal` text NOT NULL,
	`experience` text NOT NULL,
	`equipment` text NOT NULL,
	`days` integer NOT NULL,
	`medical_json` text DEFAULT '{}' NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `care_programs` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`author_name` text NOT NULL,
	`author_email` text NOT NULL,
	`title` text NOT NULL,
	`items_json` text NOT NULL,
	`created_at` text NOT NULL,
	`applied_at` text
);
--> statement-breakpoint
CREATE INDEX `care_programs_client_created` ON `care_programs` (`client_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `care_staff` (
	`email` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `media_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`kind` text NOT NULL,
	`exercise_id` text NOT NULL,
	`caption` text NOT NULL,
	`mime` text NOT NULL,
	`bytes` integer NOT NULL,
	`object_key` text NOT NULL,
	`status` text NOT NULL,
	`published` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `media_owner_kind` ON `media_assets` (`owner_id`,`kind`);--> statement-breakpoint
CREATE INDEX `media_demo_status` ON `media_assets` (`kind`,`status`,`published`);--> statement-breakpoint
CREATE TABLE `media_feedback` (
	`id` text PRIMARY KEY NOT NULL,
	`asset_id` text NOT NULL,
	`author_name` text NOT NULL,
	`content` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `media_feedback_asset` ON `media_feedback` (`asset_id`,`created_at`);--> statement-breakpoint
ALTER TABLE `consultation_services` ADD `payment_url` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `consultation_services` ADD `payment_instructions` text DEFAULT '' NOT NULL;