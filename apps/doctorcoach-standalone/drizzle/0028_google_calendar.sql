CREATE TABLE `google_calendar_connection` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`owner_email` text NOT NULL,
	`client_secret_cipher` text NOT NULL,
	`refresh_cipher` text,
	`enabled` integer DEFAULT 0 NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`lease_id` text,
	`lease_until` text,
	`last_error` text DEFAULT '' NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `google_calendar_states` (
	`state_hash` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`revision` integer NOT NULL,
	`verifier_cipher` text NOT NULL,
	`expires_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `google_calendar_sync` (
	`appointment_id` text PRIMARY KEY NOT NULL,
	`desired_version` integer NOT NULL,
	`operation` text NOT NULL,
	`synced_version` integer DEFAULT 0 NOT NULL,
	`event_id` text,
	`last_error` text DEFAULT '' NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TRIGGER calendar_appointment_insert AFTER INSERT ON care_appointments
WHEN NEW.provider='tamir' AND NEW.state='scheduled'
BEGIN
 INSERT INTO google_calendar_sync(appointment_id,desired_version,operation,updated_at) VALUES(NEW.id,NEW.version,'upsert',NEW.updated_at)
 ON CONFLICT(appointment_id) DO UPDATE SET desired_version=excluded.desired_version,operation=excluded.operation,last_error='',updated_at=excluded.updated_at;
END;
--> statement-breakpoint
CREATE TRIGGER calendar_appointment_update AFTER UPDATE ON care_appointments
WHEN NEW.provider='tamir' AND ((NEW.state='scheduled' AND (OLD.state<>'scheduled' OR NEW.starts_at IS NOT OLD.starts_at OR NEW.ends_at IS NOT OLD.ends_at OR NEW.meeting_url IS NOT OLD.meeting_url)) OR (NEW.state='cancelled' AND OLD.state<>'cancelled'))
BEGIN
 INSERT INTO google_calendar_sync(appointment_id,desired_version,operation,updated_at) VALUES(NEW.id,NEW.version,CASE WHEN NEW.state='cancelled' THEN 'delete' ELSE 'upsert' END,NEW.updated_at)
 ON CONFLICT(appointment_id) DO UPDATE SET desired_version=excluded.desired_version,operation=excluded.operation,last_error='',updated_at=excluded.updated_at;
END;
--> statement-breakpoint
CREATE TRIGGER calendar_appointment_delete AFTER DELETE ON care_appointments
WHEN OLD.provider='tamir' AND EXISTS(SELECT 1 FROM google_calendar_sync WHERE appointment_id=OLD.id)
BEGIN
 UPDATE google_calendar_sync SET desired_version=MAX(desired_version,OLD.version)+1,operation='delete',last_error='',updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE appointment_id=OLD.id;
END;
