CREATE TABLE `import_exercise_mappings` (
	`owner_id` text NOT NULL,
	`source_key` text NOT NULL,
	`source` text NOT NULL,
	`exercise_id` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`owner_id`, `source_key`)
);
