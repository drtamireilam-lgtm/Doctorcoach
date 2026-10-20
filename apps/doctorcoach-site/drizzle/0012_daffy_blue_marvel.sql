CREATE TABLE `coach_program_drafts` (
	`coach_id` text NOT NULL,
	`client_id` text NOT NULL,
	`payload_json` text,
	`version` integer DEFAULT 1 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `coach_draft_owner_client` ON `coach_program_drafts` (`coach_id`,`client_id`);