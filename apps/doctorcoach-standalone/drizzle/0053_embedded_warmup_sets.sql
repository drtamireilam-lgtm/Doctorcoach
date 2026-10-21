ALTER TABLE program_items ADD COLUMN warmup_sets_json TEXT;
--> statement-breakpoint
ALTER TABLE program_items ADD COLUMN side TEXT CHECK (side IS NULL OR side IN ('left','right','both'));
