CREATE TABLE `coach_workspaces` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`owner_email` text NOT NULL,
	`profile_json` text NOT NULL,
	`state` text DEFAULT 'pending' NOT NULL,
	`plan` text DEFAULT 'pilot' NOT NULL,
	`capacity` integer DEFAULT 10 NOT NULL,
	`license_until` text,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT "coach_workspace_state" CHECK("coach_workspaces"."state" IN ('pending','active','paused'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `coach_workspaces_owner_id_unique` ON `coach_workspaces` (`owner_id`);--> statement-breakpoint
CREATE TABLE `workspace_clients` (
	`workspace_id` text NOT NULL,
	`client_id` text NOT NULL,
	`state` text NOT NULL,
	`profile_json` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`joined_at` text NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`workspace_id`, `client_id`),
	CONSTRAINT "workspace_client_state" CHECK("workspace_clients"."state" IN ('active','archived','revoked'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `one_active_workspace_per_client` ON `workspace_clients` (`client_id`) WHERE "workspace_clients"."state"='active';--> statement-breakpoint
CREATE TABLE `workspace_drafts` (
	`workspace_id` text NOT NULL,
	`client_id` text NOT NULL,
	`payload_json` text,
	`version` integer DEFAULT 1 NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`workspace_id`, `client_id`)
);
--> statement-breakpoint
CREATE TABLE `workspace_invites` (
	`hash` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`target_email` text NOT NULL,
	`expires_at` text NOT NULL,
	`consumed_by` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `workspace_invites_workspace` ON `workspace_invites` (`workspace_id`);--> statement-breakpoint
CREATE TABLE `workspace_programs` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`client_id` text NOT NULL,
	`author_name` text NOT NULL,
	`title` text NOT NULL,
	`items_json` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `workspace_programs_client` ON `workspace_programs` (`workspace_id`,`client_id`);