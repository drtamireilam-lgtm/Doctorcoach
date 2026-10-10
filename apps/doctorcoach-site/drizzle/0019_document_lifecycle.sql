CREATE TABLE `document_lifecycle` (
	`document_id` text PRIMARY KEY NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`delete_status` text DEFAULT 'none' NOT NULL,
	`requested_at` text,
	`reviewed_at` text,
	`updated_at` text NOT NULL,
	`last_action_id` text NOT NULL,
	CONSTRAINT "document_delete_status" CHECK("document_lifecycle"."delete_status" IN ('none','requested','reviewed'))
);
