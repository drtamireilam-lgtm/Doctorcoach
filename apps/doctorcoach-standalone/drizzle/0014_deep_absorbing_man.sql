CREATE TABLE `return_plan_revisions` (
	`id` text PRIMARY KEY NOT NULL,
	`record_id` text NOT NULL,
	`client_id` text NOT NULL,
	`version` integer NOT NULL,
	`day` text NOT NULL,
	`content_json` text NOT NULL,
	`author_name` text NOT NULL,
	`updated_at` text NOT NULL,
	`baseline` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `return_revision_record_version` ON `return_plan_revisions` (`record_id`,`version`);--> statement-breakpoint
CREATE INDEX `return_revision_client_version` ON `return_plan_revisions` (`client_id`,`version`);
--> statement-breakpoint
CREATE TRIGGER return_plan_insert_revision AFTER INSERT ON wellness_records
WHEN NEW.kind='return'
BEGIN
 INSERT INTO return_plan_revisions(id,record_id,client_id,version,day,content_json,author_name,updated_at,baseline)
 VALUES(NEW.id||':'||NEW.version,NEW.id,NEW.client_id,NEW.version,NEW.day,NEW.content_json,NEW.author_name,NEW.updated_at,0);
END;
--> statement-breakpoint
CREATE TRIGGER return_plan_update_revision AFTER UPDATE ON wellness_records
WHEN NEW.kind='return' AND NEW.version<>OLD.version
BEGIN
 INSERT OR IGNORE INTO return_plan_revisions(id,record_id,client_id,version,day,content_json,author_name,updated_at,baseline)
 VALUES(OLD.id||':'||OLD.version,OLD.id,OLD.client_id,OLD.version,OLD.day,OLD.content_json,OLD.author_name,OLD.updated_at,1);
 INSERT INTO return_plan_revisions(id,record_id,client_id,version,day,content_json,author_name,updated_at,baseline)
 VALUES(NEW.id||':'||NEW.version,NEW.id,NEW.client_id,NEW.version,NEW.day,NEW.content_json,NEW.author_name,NEW.updated_at,0);
END;
