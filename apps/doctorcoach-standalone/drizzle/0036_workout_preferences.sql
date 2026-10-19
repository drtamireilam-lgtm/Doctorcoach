CREATE TABLE `workout_preferences` (
	`user_id` text PRIMARY KEY NOT NULL,
	`mode` text DEFAULT 'fixed' NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`updated_at` text NOT NULL
);
