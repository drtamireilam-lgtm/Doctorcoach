ALTER TABLE trainee_feedback ADD COLUMN section TEXT NOT NULL DEFAULT 'general';
--> statement-breakpoint
ALTER TABLE trainee_feedback ADD COLUMN body_region TEXT NOT NULL DEFAULT 'general';
--> statement-breakpoint
UPDATE trainee_feedback SET section=CASE WHEN context LIKE 'תרגיל:%' THEN 'exercises' WHEN context LIKE 'שריר:%' OR context LIKE 'אנטומיה:%' THEN 'anatomy' WHEN context LIKE 'פציעה%' OR context LIKE 'שיקום%' THEN 'rehab' ELSE 'general' END;
--> statement-breakpoint
CREATE INDEX feedback_topic_state_created ON trainee_feedback(section,body_region,state,created_at);
