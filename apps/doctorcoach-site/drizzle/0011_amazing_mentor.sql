CREATE TABLE `membership_catalog` (
	`id` text PRIMARY KEY NOT NULL,
	`price_agorot` integer,
	`enabled` integer DEFAULT 0 NOT NULL,
	`payment_url` text DEFAULT '' NOT NULL,
	`instructions` text DEFAULT '' NOT NULL,
	`version` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `membership_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`email` text NOT NULL,
	`price_agorot` integer NOT NULL,
	`payment_url` text NOT NULL,
	`instructions` text NOT NULL,
	`state` text DEFAULT 'pending' NOT NULL,
	`reference` text DEFAULT '' NOT NULL,
	`verified_reference` text,
	`reviewer` text,
	`starts_at` text,
	`ends_at` text,
	`created_at` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `membership_one_pending` ON `membership_orders` (`user_id`) WHERE "membership_orders"."state" IN ('pending','reported');--> statement-breakpoint
CREATE UNIQUE INDEX `membership_payment_unique` ON `membership_orders` (`verified_reference`);--> statement-breakpoint
CREATE INDEX `membership_orders_user` ON `membership_orders` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `training_access` (
	`user_id` text PRIMARY KEY NOT NULL,
	`mode` text DEFAULT 'coached' NOT NULL,
	`program_id` text,
	`self_until` text,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `training_sessions` ADD `plan_mode` text DEFAULT 'legacy' NOT NULL;--> statement-breakpoint
ALTER TABLE `training_sessions` ADD `program_id` text;