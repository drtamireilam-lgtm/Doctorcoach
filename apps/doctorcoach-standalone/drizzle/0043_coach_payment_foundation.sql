CREATE TABLE `coach_monthly_charges` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`month` text NOT NULL,
	`boundary_at` text NOT NULL,
	`client_count` integer NOT NULL,
	`rate_agorot` integer NOT NULL,
	`amount_agorot` integer NOT NULL,
	`state` text NOT NULL,
	`provider` text,
	`mandate_version` integer,
	`transaction_ref` text,
	`attempts` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `coach_monthly_charge_once` ON `coach_monthly_charges` (`workspace_id`,`month`);--> statement-breakpoint
CREATE TABLE `coach_payment_mandates` (
	`workspace_id` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`reference` text NOT NULL,
	`state` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `coach_payment_policy` (
	`id` text PRIMARY KEY NOT NULL,
	`started_at` text NOT NULL
);

--> statement-breakpoint
INSERT INTO coach_payment_policy(id,started_at) VALUES('monthly',strftime('%Y-%m-%dT%H:%M:%fZ','now'));
--> statement-breakpoint
CREATE UNIQUE INDEX coach_payment_receipt_once ON coach_monthly_charges(provider,transaction_ref);
--> statement-breakpoint
CREATE TRIGGER coach_charge_amount_immutable BEFORE UPDATE ON coach_monthly_charges WHEN NEW.workspace_id<>OLD.workspace_id OR NEW.month<>OLD.month OR NEW.boundary_at<>OLD.boundary_at OR NEW.client_count<>OLD.client_count OR NEW.rate_agorot<>OLD.rate_agorot OR NEW.amount_agorot<>OLD.amount_agorot OR NEW.id<>OLD.id BEGIN
 SELECT RAISE(ABORT,'monthly charge snapshot is immutable');
END;
