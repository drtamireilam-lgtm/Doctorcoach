-- Preserve all existing rows and deletion guards; identity belongs to a program occurrence.
ALTER TABLE program_items ADD COLUMN occurrence_id TEXT;
--> statement-breakpoint
DROP INDEX program_owner_exercise_day;
--> statement-breakpoint
CREATE UNIQUE INDEX program_owner_occurrence ON program_items (owner_id,COALESCE(occurrence_id,day_id||':'||exercise_id));
--> statement-breakpoint
ALTER TABLE media_assets ADD COLUMN occurrence_id TEXT;
