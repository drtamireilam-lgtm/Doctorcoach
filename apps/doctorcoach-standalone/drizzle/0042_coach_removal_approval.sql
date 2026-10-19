CREATE TABLE `coach_billing_seat_events` (
	`sequence` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`seat_id` text NOT NULL,
	`state` text NOT NULL,
	`occurred_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `billing_seat_history` ON `coach_billing_seat_events` (`seat_id`,`occurred_at`);--> statement-breakpoint
CREATE TABLE `coach_billing_seats` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`client_id` text,
	`state` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`activated_at` text NOT NULL,
	`requested_at` text,
	`reason` text DEFAULT '' NOT NULL,
	`decided_at` text,
	`decided_by` text,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `billing_seat_membership` ON `coach_billing_seats` (`workspace_id`,`client_id`);--> statement-breakpoint
CREATE INDEX `billing_seat_workspace` ON `coach_billing_seats` (`workspace_id`,`state`);
--> statement-breakpoint
INSERT INTO coach_billing_seats(id,workspace_id,client_id,state,version,activated_at,reason,updated_at)
SELECT lower(hex(randomblob(16))),workspace_id,client_id,'active',1,strftime('%Y-%m-%dT%H:%M:%fZ','now'),'',strftime('%Y-%m-%dT%H:%M:%fZ','now') FROM workspace_clients WHERE state='active';
--> statement-breakpoint
INSERT INTO coach_billing_seat_events(seat_id,state,occurred_at) SELECT id,state,updated_at FROM coach_billing_seats;
--> statement-breakpoint
CREATE TRIGGER billing_seat_added AFTER INSERT ON workspace_clients WHEN NEW.state='active' BEGIN
 INSERT INTO coach_billing_seats(id,workspace_id,client_id,state,version,activated_at,reason,updated_at) VALUES(lower(hex(randomblob(16))),NEW.workspace_id,NEW.client_id,'active',1,strftime('%Y-%m-%dT%H:%M:%fZ','now'),'',strftime('%Y-%m-%dT%H:%M:%fZ','now'));
END;
--> statement-breakpoint
CREATE TRIGGER billing_seat_restored AFTER UPDATE OF state ON workspace_clients WHEN NEW.state='active' AND OLD.state<>'active' BEGIN
 INSERT INTO coach_billing_seats(id,workspace_id,client_id,state,version,activated_at,reason,updated_at) VALUES(lower(hex(randomblob(16))),NEW.workspace_id,NEW.client_id,'active',1,strftime('%Y-%m-%dT%H:%M:%fZ','now'),'',strftime('%Y-%m-%dT%H:%M:%fZ','now')) ON CONFLICT(workspace_id,client_id) DO UPDATE SET state='active',version=coach_billing_seats.version+1,activated_at=excluded.activated_at,requested_at=NULL,reason='',decided_at=NULL,decided_by=NULL,updated_at=excluded.updated_at WHERE coach_billing_seats.state IN ('removed','pending_removal');
END;
--> statement-breakpoint
CREATE TRIGGER billing_seat_share_stopped AFTER UPDATE OF state ON workspace_clients WHEN NEW.state IN ('archived','revoked') AND NEW.state<>OLD.state BEGIN
 UPDATE coach_billing_seats SET state='pending_removal',version=version+1,requested_at=strftime('%Y-%m-%dT%H:%M:%fZ','now'),reason=CASE WHEN NEW.state='revoked' THEN 'המתאמן ביטל שיתוף' ELSE 'המאמן העביר את האימונים לארכיון' END,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE workspace_id=NEW.workspace_id AND client_id=NEW.client_id AND state='active';
END;
--> statement-breakpoint
CREATE TRIGGER billing_seat_client_deleted AFTER DELETE ON workspace_clients BEGIN
 UPDATE coach_billing_seats SET client_id=NULL,state=CASE WHEN state='removed' THEN 'removed' ELSE 'pending_removal' END,version=version+1,requested_at=CASE WHEN state='removed' THEN requested_at ELSE strftime('%Y-%m-%dT%H:%M:%fZ','now') END,reason='',updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE workspace_id=OLD.workspace_id AND client_id=OLD.client_id;
END;
--> statement-breakpoint
CREATE TRIGGER billing_seat_history_added AFTER INSERT ON coach_billing_seats BEGIN
 INSERT INTO coach_billing_seat_events(seat_id,state,occurred_at) VALUES(NEW.id,NEW.state,NEW.updated_at);
END;
--> statement-breakpoint
CREATE TRIGGER billing_seat_history_changed AFTER UPDATE ON coach_billing_seats WHEN NEW.version<>OLD.version BEGIN
 INSERT INTO coach_billing_seat_events(seat_id,state,occurred_at) VALUES(NEW.id,NEW.state,NEW.updated_at);
END;
--> statement-breakpoint
CREATE TRIGGER billing_seat_approved_archive AFTER UPDATE OF state ON coach_billing_seats WHEN NEW.state='removed' AND OLD.state='pending_removal' BEGIN
 UPDATE workspace_clients SET state='archived',version=version+1,updated_at=NEW.updated_at WHERE workspace_id=NEW.workspace_id AND client_id=NEW.client_id AND state='active';
END;
