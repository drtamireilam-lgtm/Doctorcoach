CREATE TABLE `billing_sandbox_events` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`payload_json` text NOT NULL,
	`attempt_id` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `billing_sandbox_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`product_json` text NOT NULL,
	`state` text DEFAULT 'pending' NOT NULL,
	`paid_until` text,
	`cancel_at_end` integer DEFAULT 0 NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `sandbox_orders_owner` ON `billing_sandbox_orders` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `billing_sandbox_products` (
	`id` text PRIMARY KEY NOT NULL,
	`content_json` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `billing_sandbox_transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`kind` text NOT NULL,
	`amount_agorot` integer NOT NULL,
	`created_at` text NOT NULL
);
