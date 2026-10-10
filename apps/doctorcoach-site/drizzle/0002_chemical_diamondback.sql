CREATE TABLE `consultation_services` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`provider` text NOT NULL,
	`format` text NOT NULL,
	`duration_minutes` integer NOT NULL,
	`price_agorot` integer NOT NULL,
	`price_confirmed` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`booking_url` text DEFAULT '' NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`updated_by` text NOT NULL
);
