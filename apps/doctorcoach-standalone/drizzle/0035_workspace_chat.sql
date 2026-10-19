CREATE TABLE `workspace_chat_reads` (
	`workspace_id` text NOT NULL,
	`client_id` text NOT NULL,
	`viewer_id` text NOT NULL,
	`read_through` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`workspace_id`, `client_id`, `viewer_id`)
);
--> statement-breakpoint
CREATE TABLE `workspace_messages` (
	`sequence` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`id` text NOT NULL,
	`workspace_id` text NOT NULL,
	`client_id` text NOT NULL,
	`author_id` text NOT NULL,
	`author_name` text NOT NULL,
	`author_role` text NOT NULL,
	`content` text NOT NULL,
	`created_at` text NOT NULL,
	CONSTRAINT "workspace_message_role" CHECK("workspace_messages"."author_role" IN ('coach','trainee'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `workspace_messages_id_unique` ON `workspace_messages` (`id`);--> statement-breakpoint
CREATE INDEX `workspace_messages_thread` ON `workspace_messages` (`workspace_id`,`client_id`,`sequence`);