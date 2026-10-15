ALTER TABLE `care_appointments` ADD `feedback_message` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `care_appointments` ADD `feedback_requested_at` text;--> statement-breakpoint
ALTER TABLE `care_appointments` ADD `feedback_response` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `care_appointments` ADD `feedback_responded_at` text;