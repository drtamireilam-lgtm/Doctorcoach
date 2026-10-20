CREATE TABLE `content_reviews` (
	`injury_id` text PRIMARY KEY NOT NULL,
	`content_hash` text NOT NULL,
	`state` text NOT NULL,
	`notes` text NOT NULL,
	`reviewer_id` text NOT NULL,
	`reviewer_name` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`updated_at` text NOT NULL
);
