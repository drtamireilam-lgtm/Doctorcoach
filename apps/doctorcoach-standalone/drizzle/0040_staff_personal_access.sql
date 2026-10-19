CREATE TABLE `staff_personal_access` (
	`user_id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`activated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `staff_personal_email` ON `staff_personal_access` (`email`);