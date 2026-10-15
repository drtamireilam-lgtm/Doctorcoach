CREATE TABLE `workspace_client_events` (
	`sequence` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workspace_id` text NOT NULL,
	`client_id` text NOT NULL,
	`previous_state` text,
	`state` text NOT NULL,
	`occurred_at` text NOT NULL,
	`source` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `workspace_client_events_month` ON `workspace_client_events` (`workspace_id`,`occurred_at`);--> statement-breakpoint
INSERT INTO workspace_client_events(workspace_id,client_id,previous_state,state,occurred_at,source)
SELECT workspace_id,client_id,NULL,state,strftime('%Y-%m-%dT%H:%M:%fZ','now'),'baseline' FROM workspace_clients;
--> statement-breakpoint
CREATE TRIGGER workspace_client_added_history AFTER INSERT ON workspace_clients BEGIN
 INSERT INTO workspace_client_events(workspace_id,client_id,previous_state,state,occurred_at,source) VALUES(NEW.workspace_id,NEW.client_id,NULL,NEW.state,NEW.updated_at,'change');
END;
--> statement-breakpoint
CREATE TRIGGER workspace_client_state_history AFTER UPDATE OF state ON workspace_clients WHEN OLD.state<>NEW.state BEGIN
 INSERT INTO workspace_client_events(workspace_id,client_id,previous_state,state,occurred_at,source) VALUES(NEW.workspace_id,NEW.client_id,OLD.state,NEW.state,NEW.updated_at,'change');
END;
