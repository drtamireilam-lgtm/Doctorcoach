CREATE TABLE `account_deletions` (
	`user_id` text PRIMARY KEY NOT NULL,
	`request_id` text NOT NULL,
	`state` text NOT NULL,
	`reviewer_id` text NOT NULL,
	`started_at` text NOT NULL,
	`completed_at` text,
	CONSTRAINT "account_deletion_state" CHECK("account_deletions"."state" IN ('deleting','deleted'))
);
--> statement-breakpoint
ALTER TABLE `account_requests` ADD `requester_email` text;

--> statement-breakpoint
CREATE TRIGGER deletion_guard_program_items_insert BEFORE INSERT ON program_items
WHEN EXISTS(SELECT 1 FROM account_deletions WHERE user_id=NEW.owner_id)
BEGIN SELECT RAISE(ABORT,'account deletion write barrier'); END;

--> statement-breakpoint
CREATE TRIGGER deletion_guard_program_items_update BEFORE UPDATE ON program_items
WHEN EXISTS(SELECT 1 FROM account_deletions WHERE user_id=NEW.owner_id OR user_id=OLD.owner_id)
BEGIN SELECT RAISE(ABORT,'account deletion write barrier'); END;

--> statement-breakpoint
CREATE TRIGGER deletion_guard_workout_logs_insert BEFORE INSERT ON workout_logs
WHEN EXISTS(SELECT 1 FROM account_deletions WHERE user_id=NEW.owner_id)
BEGIN SELECT RAISE(ABORT,'account deletion write barrier'); END;

--> statement-breakpoint
CREATE TRIGGER deletion_guard_workout_logs_update BEFORE UPDATE ON workout_logs
WHEN EXISTS(SELECT 1 FROM account_deletions WHERE user_id=NEW.owner_id OR user_id=OLD.owner_id)
BEGIN SELECT RAISE(ABORT,'account deletion write barrier'); END;

--> statement-breakpoint
CREATE TRIGGER deletion_guard_exercise_favorites_insert BEFORE INSERT ON exercise_favorites
WHEN EXISTS(SELECT 1 FROM account_deletions WHERE user_id=NEW.owner_id)
BEGIN SELECT RAISE(ABORT,'account deletion write barrier'); END;

--> statement-breakpoint
CREATE TRIGGER deletion_guard_exercise_favorites_update BEFORE UPDATE ON exercise_favorites
WHEN EXISTS(SELECT 1 FROM account_deletions WHERE user_id=NEW.owner_id OR user_id=OLD.owner_id)
BEGIN SELECT RAISE(ABORT,'account deletion write barrier'); END;

--> statement-breakpoint
CREATE TRIGGER deletion_guard_training_sessions_insert BEFORE INSERT ON training_sessions
WHEN EXISTS(SELECT 1 FROM account_deletions WHERE user_id=NEW.owner_id)
BEGIN SELECT RAISE(ABORT,'account deletion write barrier'); END;

--> statement-breakpoint
CREATE TRIGGER deletion_guard_training_sessions_update BEFORE UPDATE ON training_sessions
WHEN EXISTS(SELECT 1 FROM account_deletions WHERE user_id=NEW.owner_id OR user_id=OLD.owner_id)
BEGIN SELECT RAISE(ABORT,'account deletion write barrier'); END;

--> statement-breakpoint
CREATE TRIGGER deletion_guard_care_profiles_insert BEFORE INSERT ON care_profiles
WHEN EXISTS(SELECT 1 FROM account_deletions WHERE user_id=NEW.user_id)
BEGIN SELECT RAISE(ABORT,'account deletion write barrier'); END;

--> statement-breakpoint
CREATE TRIGGER deletion_guard_care_profiles_update BEFORE UPDATE ON care_profiles
WHEN EXISTS(SELECT 1 FROM account_deletions WHERE user_id=NEW.user_id OR user_id=OLD.user_id)
BEGIN SELECT RAISE(ABORT,'account deletion write barrier'); END;

--> statement-breakpoint
CREATE TRIGGER deletion_guard_care_connections_insert BEFORE INSERT ON care_connections
WHEN EXISTS(SELECT 1 FROM account_deletions WHERE user_id=NEW.client_id)
BEGIN SELECT RAISE(ABORT,'account deletion write barrier'); END;

--> statement-breakpoint
CREATE TRIGGER deletion_guard_care_connections_update BEFORE UPDATE ON care_connections
WHEN EXISTS(SELECT 1 FROM account_deletions WHERE user_id=NEW.client_id OR user_id=OLD.client_id)
BEGIN SELECT RAISE(ABORT,'account deletion write barrier'); END;

--> statement-breakpoint
CREATE TRIGGER deletion_guard_care_notes_insert BEFORE INSERT ON care_notes
WHEN EXISTS(SELECT 1 FROM account_deletions WHERE user_id=NEW.client_id)
BEGIN SELECT RAISE(ABORT,'account deletion write barrier'); END;

--> statement-breakpoint
CREATE TRIGGER deletion_guard_care_notes_update BEFORE UPDATE ON care_notes
WHEN EXISTS(SELECT 1 FROM account_deletions WHERE user_id=NEW.client_id OR user_id=OLD.client_id)
BEGIN SELECT RAISE(ABORT,'account deletion write barrier'); END;

--> statement-breakpoint
CREATE TRIGGER deletion_guard_care_programs_insert BEFORE INSERT ON care_programs
WHEN EXISTS(SELECT 1 FROM account_deletions WHERE user_id=NEW.client_id)
BEGIN SELECT RAISE(ABORT,'account deletion write barrier'); END;

--> statement-breakpoint
CREATE TRIGGER deletion_guard_care_programs_update BEFORE UPDATE ON care_programs
WHEN EXISTS(SELECT 1 FROM account_deletions WHERE user_id=NEW.client_id OR user_id=OLD.client_id)
BEGIN SELECT RAISE(ABORT,'account deletion write barrier'); END;

--> statement-breakpoint
CREATE TRIGGER deletion_guard_care_checkins_insert BEFORE INSERT ON care_checkins
WHEN EXISTS(SELECT 1 FROM account_deletions WHERE user_id=NEW.client_id)
BEGIN SELECT RAISE(ABORT,'account deletion write barrier'); END;

--> statement-breakpoint
CREATE TRIGGER deletion_guard_care_checkins_update BEFORE UPDATE ON care_checkins
WHEN EXISTS(SELECT 1 FROM account_deletions WHERE user_id=NEW.client_id OR user_id=OLD.client_id)
BEGIN SELECT RAISE(ABORT,'account deletion write barrier'); END;

--> statement-breakpoint
CREATE TRIGGER deletion_guard_media_assets_insert BEFORE INSERT ON media_assets
WHEN EXISTS(SELECT 1 FROM account_deletions WHERE user_id=NEW.owner_id)
BEGIN SELECT RAISE(ABORT,'account deletion write barrier'); END;

--> statement-breakpoint
CREATE TRIGGER deletion_guard_media_assets_update BEFORE UPDATE ON media_assets
WHEN EXISTS(SELECT 1 FROM account_deletions WHERE user_id=NEW.owner_id OR user_id=OLD.owner_id)
BEGIN SELECT RAISE(ABORT,'account deletion write barrier'); END;

--> statement-breakpoint
CREATE TRIGGER deletion_guard_care_appointments_insert BEFORE INSERT ON care_appointments
WHEN EXISTS(SELECT 1 FROM account_deletions WHERE user_id=NEW.client_id)
BEGIN SELECT RAISE(ABORT,'account deletion write barrier'); END;

--> statement-breakpoint
CREATE TRIGGER deletion_guard_care_appointments_update BEFORE UPDATE ON care_appointments
WHEN EXISTS(SELECT 1 FROM account_deletions WHERE user_id=NEW.client_id OR user_id=OLD.client_id)
BEGIN SELECT RAISE(ABORT,'account deletion write barrier'); END;

--> statement-breakpoint
CREATE TRIGGER deletion_guard_wellness_records_insert BEFORE INSERT ON wellness_records
WHEN EXISTS(SELECT 1 FROM account_deletions WHERE user_id=NEW.client_id)
BEGIN SELECT RAISE(ABORT,'account deletion write barrier'); END;

--> statement-breakpoint
CREATE TRIGGER deletion_guard_wellness_records_update BEFORE UPDATE ON wellness_records
WHEN EXISTS(SELECT 1 FROM account_deletions WHERE user_id=NEW.client_id OR user_id=OLD.client_id)
BEGIN SELECT RAISE(ABORT,'account deletion write barrier'); END;

--> statement-breakpoint
CREATE TRIGGER deletion_guard_return_plan_revisions_insert BEFORE INSERT ON return_plan_revisions
WHEN EXISTS(SELECT 1 FROM account_deletions WHERE user_id=NEW.client_id)
BEGIN SELECT RAISE(ABORT,'account deletion write barrier'); END;

--> statement-breakpoint
CREATE TRIGGER deletion_guard_return_plan_revisions_update BEFORE UPDATE ON return_plan_revisions
WHEN EXISTS(SELECT 1 FROM account_deletions WHERE user_id=NEW.client_id OR user_id=OLD.client_id)
BEGIN SELECT RAISE(ABORT,'account deletion write barrier'); END;

--> statement-breakpoint
CREATE TRIGGER deletion_guard_trainee_feedback_insert BEFORE INSERT ON trainee_feedback
WHEN EXISTS(SELECT 1 FROM account_deletions WHERE user_id=NEW.owner_id)
BEGIN SELECT RAISE(ABORT,'account deletion write barrier'); END;

--> statement-breakpoint
CREATE TRIGGER deletion_guard_trainee_feedback_update BEFORE UPDATE ON trainee_feedback
WHEN EXISTS(SELECT 1 FROM account_deletions WHERE user_id=NEW.owner_id OR user_id=OLD.owner_id)
BEGIN SELECT RAISE(ABORT,'account deletion write barrier'); END;

--> statement-breakpoint
CREATE TRIGGER deletion_guard_success_stories_insert BEFORE INSERT ON success_stories
WHEN EXISTS(SELECT 1 FROM account_deletions WHERE user_id=NEW.owner_id)
BEGIN SELECT RAISE(ABORT,'account deletion write barrier'); END;

--> statement-breakpoint
CREATE TRIGGER deletion_guard_success_stories_update BEFORE UPDATE ON success_stories
WHEN EXISTS(SELECT 1 FROM account_deletions WHERE user_id=NEW.owner_id OR user_id=OLD.owner_id)
BEGIN SELECT RAISE(ABORT,'account deletion write barrier'); END;

--> statement-breakpoint
CREATE TRIGGER deletion_guard_user_intakes_insert BEFORE INSERT ON user_intakes
WHEN EXISTS(SELECT 1 FROM account_deletions WHERE user_id=NEW.user_id)
BEGIN SELECT RAISE(ABORT,'account deletion write barrier'); END;

--> statement-breakpoint
CREATE TRIGGER deletion_guard_user_intakes_update BEFORE UPDATE ON user_intakes
WHEN EXISTS(SELECT 1 FROM account_deletions WHERE user_id=NEW.user_id OR user_id=OLD.user_id)
BEGIN SELECT RAISE(ABORT,'account deletion write barrier'); END;

--> statement-breakpoint
CREATE TRIGGER deletion_guard_user_consents_insert BEFORE INSERT ON user_consents
WHEN EXISTS(SELECT 1 FROM account_deletions WHERE user_id=NEW.user_id)
BEGIN SELECT RAISE(ABORT,'account deletion write barrier'); END;

--> statement-breakpoint
CREATE TRIGGER deletion_guard_user_consents_update BEFORE UPDATE ON user_consents
WHEN EXISTS(SELECT 1 FROM account_deletions WHERE user_id=NEW.user_id OR user_id=OLD.user_id)
BEGIN SELECT RAISE(ABORT,'account deletion write barrier'); END;

--> statement-breakpoint
CREATE TRIGGER deletion_guard_medical_reviews_insert BEFORE INSERT ON medical_reviews
WHEN EXISTS(SELECT 1 FROM account_deletions WHERE user_id=NEW.client_id)
BEGIN SELECT RAISE(ABORT,'account deletion write barrier'); END;

--> statement-breakpoint
CREATE TRIGGER deletion_guard_medical_reviews_update BEFORE UPDATE ON medical_reviews
WHEN EXISTS(SELECT 1 FROM account_deletions WHERE user_id=NEW.client_id OR user_id=OLD.client_id)
BEGIN SELECT RAISE(ABORT,'account deletion write barrier'); END;

--> statement-breakpoint
CREATE TRIGGER deletion_guard_team_messages_insert BEFORE INSERT ON team_messages
WHEN EXISTS(SELECT 1 FROM account_deletions WHERE user_id=NEW.client_id)
BEGIN SELECT RAISE(ABORT,'account deletion write barrier'); END;

--> statement-breakpoint
CREATE TRIGGER deletion_guard_team_messages_update BEFORE UPDATE ON team_messages
WHEN EXISTS(SELECT 1 FROM account_deletions WHERE user_id=NEW.client_id OR user_id=OLD.client_id)
BEGIN SELECT RAISE(ABORT,'account deletion write barrier'); END;

--> statement-breakpoint
CREATE TRIGGER deletion_guard_message_reads_insert BEFORE INSERT ON message_reads
WHEN EXISTS(SELECT 1 FROM account_deletions WHERE user_id=NEW.user_id)
BEGIN SELECT RAISE(ABORT,'account deletion write barrier'); END;

--> statement-breakpoint
CREATE TRIGGER deletion_guard_message_reads_update BEFORE UPDATE ON message_reads
WHEN EXISTS(SELECT 1 FROM account_deletions WHERE user_id=NEW.user_id OR user_id=OLD.user_id)
BEGIN SELECT RAISE(ABORT,'account deletion write barrier'); END;

--> statement-breakpoint
CREATE TRIGGER deletion_guard_account_requests_insert BEFORE INSERT ON account_requests
WHEN EXISTS(SELECT 1 FROM account_deletions WHERE user_id=NEW.user_id)
BEGIN SELECT RAISE(ABORT,'account deletion write barrier'); END;

--> statement-breakpoint
CREATE TRIGGER deletion_guard_account_requests_update BEFORE UPDATE ON account_requests
WHEN EXISTS(SELECT 1 FROM account_deletions WHERE user_id=NEW.user_id OR user_id=OLD.user_id)
BEGIN SELECT RAISE(ABORT,'account deletion write barrier'); END;

--> statement-breakpoint
CREATE TRIGGER deletion_guard_audit_events_insert BEFORE INSERT ON audit_events
WHEN EXISTS(SELECT 1 FROM account_deletions WHERE user_id=NEW.subject_id)
BEGIN SELECT RAISE(ABORT,'account deletion write barrier'); END;

--> statement-breakpoint
CREATE TRIGGER deletion_guard_audit_events_update BEFORE UPDATE ON audit_events
WHEN EXISTS(SELECT 1 FROM account_deletions WHERE user_id=NEW.subject_id OR user_id=OLD.subject_id)
BEGIN SELECT RAISE(ABORT,'account deletion write barrier'); END;

--> statement-breakpoint
CREATE TRIGGER deletion_guard_training_access_insert BEFORE INSERT ON training_access
WHEN EXISTS(SELECT 1 FROM account_deletions WHERE user_id=NEW.user_id)
BEGIN SELECT RAISE(ABORT,'account deletion write barrier'); END;

--> statement-breakpoint
CREATE TRIGGER deletion_guard_training_access_update BEFORE UPDATE ON training_access
WHEN EXISTS(SELECT 1 FROM account_deletions WHERE user_id=NEW.user_id OR user_id=OLD.user_id)
BEGIN SELECT RAISE(ABORT,'account deletion write barrier'); END;

--> statement-breakpoint
CREATE TRIGGER deletion_guard_coach_program_drafts_insert BEFORE INSERT ON coach_program_drafts
WHEN EXISTS(SELECT 1 FROM account_deletions WHERE user_id=NEW.client_id)
BEGIN SELECT RAISE(ABORT,'account deletion write barrier'); END;

--> statement-breakpoint
CREATE TRIGGER deletion_guard_coach_program_drafts_update BEFORE UPDATE ON coach_program_drafts
WHEN EXISTS(SELECT 1 FROM account_deletions WHERE user_id=NEW.client_id OR user_id=OLD.client_id)
BEGIN SELECT RAISE(ABORT,'account deletion write barrier'); END;

--> statement-breakpoint
CREATE TRIGGER deletion_guard_membership_orders_insert BEFORE INSERT ON membership_orders
WHEN EXISTS(SELECT 1 FROM account_deletions WHERE user_id=NEW.user_id)
BEGIN SELECT RAISE(ABORT,'account deletion write barrier'); END;

--> statement-breakpoint
CREATE TRIGGER deletion_guard_membership_orders_update BEFORE UPDATE ON membership_orders
WHEN EXISTS(SELECT 1 FROM account_deletions WHERE user_id=NEW.user_id OR user_id=OLD.user_id)
BEGIN SELECT RAISE(ABORT,'account deletion write barrier'); END;

--> statement-breakpoint
CREATE TRIGGER deletion_guard_weekly_goals_insert BEFORE INSERT ON weekly_goals
WHEN EXISTS(SELECT 1 FROM account_deletions WHERE user_id=NEW.client_id)
BEGIN SELECT RAISE(ABORT,'account deletion write barrier'); END;

--> statement-breakpoint
CREATE TRIGGER deletion_guard_weekly_goals_update BEFORE UPDATE ON weekly_goals
WHEN EXISTS(SELECT 1 FROM account_deletions WHERE user_id=NEW.client_id OR user_id=OLD.client_id)
BEGIN SELECT RAISE(ABORT,'account deletion write barrier'); END;

--> statement-breakpoint
CREATE TRIGGER deletion_guard_notification_preferences_insert BEFORE INSERT ON notification_preferences
WHEN EXISTS(SELECT 1 FROM account_deletions WHERE user_id=NEW.user_id)
BEGIN SELECT RAISE(ABORT,'account deletion write barrier'); END;

--> statement-breakpoint
CREATE TRIGGER deletion_guard_notification_preferences_update BEFORE UPDATE ON notification_preferences
WHEN EXISTS(SELECT 1 FROM account_deletions WHERE user_id=NEW.user_id OR user_id=OLD.user_id)
BEGIN SELECT RAISE(ABORT,'account deletion write barrier'); END;

--> statement-breakpoint
CREATE TRIGGER deletion_guard_notification_dismissals_insert BEFORE INSERT ON notification_dismissals
WHEN EXISTS(SELECT 1 FROM account_deletions WHERE user_id=NEW.user_id)
BEGIN SELECT RAISE(ABORT,'account deletion write barrier'); END;

--> statement-breakpoint
CREATE TRIGGER deletion_guard_notification_dismissals_update BEFORE UPDATE ON notification_dismissals
WHEN EXISTS(SELECT 1 FROM account_deletions WHERE user_id=NEW.user_id OR user_id=OLD.user_id)
BEGIN SELECT RAISE(ABORT,'account deletion write barrier'); END;

--> statement-breakpoint
CREATE TRIGGER deletion_guard_passport_details_insert BEFORE INSERT ON passport_details
WHEN EXISTS(SELECT 1 FROM account_deletions WHERE user_id=NEW.client_id)
BEGIN SELECT RAISE(ABORT,'account deletion write barrier'); END;

--> statement-breakpoint
CREATE TRIGGER deletion_guard_passport_details_update BEFORE UPDATE ON passport_details
WHEN EXISTS(SELECT 1 FROM account_deletions WHERE user_id=NEW.client_id OR user_id=OLD.client_id)
BEGIN SELECT RAISE(ABORT,'account deletion write barrier'); END;

--> statement-breakpoint
CREATE TRIGGER deletion_guard_private_documents_insert BEFORE INSERT ON private_documents
WHEN EXISTS(SELECT 1 FROM account_deletions WHERE user_id=NEW.client_id)
BEGIN SELECT RAISE(ABORT,'account deletion write barrier'); END;

--> statement-breakpoint
CREATE TRIGGER deletion_guard_private_documents_update BEFORE UPDATE ON private_documents
WHEN EXISTS(SELECT 1 FROM account_deletions WHERE user_id=NEW.client_id OR user_id=OLD.client_id)
BEGIN SELECT RAISE(ABORT,'account deletion write barrier'); END;

--> statement-breakpoint
CREATE TRIGGER deletion_guard_thread_states_insert BEFORE INSERT ON thread_states
WHEN EXISTS(SELECT 1 FROM account_deletions WHERE user_id=NEW.client_id)
BEGIN SELECT RAISE(ABORT,'account deletion write barrier'); END;

--> statement-breakpoint
CREATE TRIGGER deletion_guard_thread_states_update BEFORE UPDATE ON thread_states
WHEN EXISTS(SELECT 1 FROM account_deletions WHERE user_id=NEW.client_id OR user_id=OLD.client_id)
BEGIN SELECT RAISE(ABORT,'account deletion write barrier'); END;

--> statement-breakpoint
CREATE TRIGGER deletion_guard_billing_sandbox_orders_insert BEFORE INSERT ON billing_sandbox_orders
WHEN EXISTS(SELECT 1 FROM account_deletions WHERE user_id=NEW.user_id)
BEGIN SELECT RAISE(ABORT,'account deletion write barrier'); END;

--> statement-breakpoint
CREATE TRIGGER deletion_guard_billing_sandbox_orders_update BEFORE UPDATE ON billing_sandbox_orders
WHEN EXISTS(SELECT 1 FROM account_deletions WHERE user_id=NEW.user_id OR user_id=OLD.user_id)
BEGIN SELECT RAISE(ABORT,'account deletion write barrier'); END;

--> statement-breakpoint
CREATE TRIGGER deletion_guard_push_devices_insert BEFORE INSERT ON push_devices
WHEN EXISTS(SELECT 1 FROM account_deletions WHERE user_id=NEW.user_id)
BEGIN SELECT RAISE(ABORT,'account deletion write barrier'); END;

--> statement-breakpoint
CREATE TRIGGER deletion_guard_push_devices_update BEFORE UPDATE ON push_devices
WHEN EXISTS(SELECT 1 FROM account_deletions WHERE user_id=NEW.user_id OR user_id=OLD.user_id)
BEGIN SELECT RAISE(ABORT,'account deletion write barrier'); END;

--> statement-breakpoint
CREATE TRIGGER deletion_guard_media_feedback_insert BEFORE INSERT ON media_feedback
WHEN NOT EXISTS(SELECT 1 FROM media_assets WHERE id=NEW.asset_id) OR EXISTS(SELECT 1 FROM account_deletions WHERE user_id=(SELECT owner_id FROM media_assets WHERE id=NEW.asset_id))
BEGIN SELECT RAISE(ABORT,'account deletion dependent write barrier'); END;

--> statement-breakpoint
CREATE TRIGGER deletion_guard_media_feedback_update BEFORE UPDATE ON media_feedback
WHEN NOT EXISTS(SELECT 1 FROM media_assets WHERE id=NEW.asset_id) OR EXISTS(SELECT 1 FROM account_deletions WHERE user_id=(SELECT owner_id FROM media_assets WHERE id=NEW.asset_id))
BEGIN SELECT RAISE(ABORT,'account deletion dependent write barrier'); END;

--> statement-breakpoint
CREATE TRIGGER deletion_guard_message_links_insert BEFORE INSERT ON message_links
WHEN NOT EXISTS(SELECT 1 FROM team_messages WHERE id=NEW.message_id) OR EXISTS(SELECT 1 FROM account_deletions WHERE user_id=(SELECT client_id FROM team_messages WHERE id=NEW.message_id))
BEGIN SELECT RAISE(ABORT,'account deletion dependent write barrier'); END;

--> statement-breakpoint
CREATE TRIGGER deletion_guard_message_links_update BEFORE UPDATE ON message_links
WHEN NOT EXISTS(SELECT 1 FROM team_messages WHERE id=NEW.message_id) OR EXISTS(SELECT 1 FROM account_deletions WHERE user_id=(SELECT client_id FROM team_messages WHERE id=NEW.message_id))
BEGIN SELECT RAISE(ABORT,'account deletion dependent write barrier'); END;

--> statement-breakpoint
CREATE TRIGGER deletion_guard_document_lifecycle_insert BEFORE INSERT ON document_lifecycle
WHEN NOT EXISTS(SELECT 1 FROM private_documents WHERE id=NEW.document_id) OR EXISTS(SELECT 1 FROM account_deletions WHERE user_id=(SELECT client_id FROM private_documents WHERE id=NEW.document_id))
BEGIN SELECT RAISE(ABORT,'account deletion dependent write barrier'); END;

--> statement-breakpoint
CREATE TRIGGER deletion_guard_document_lifecycle_update BEFORE UPDATE ON document_lifecycle
WHEN NOT EXISTS(SELECT 1 FROM private_documents WHERE id=NEW.document_id) OR EXISTS(SELECT 1 FROM account_deletions WHERE user_id=(SELECT client_id FROM private_documents WHERE id=NEW.document_id))
BEGIN SELECT RAISE(ABORT,'account deletion dependent write barrier'); END;

--> statement-breakpoint
CREATE TRIGGER deletion_guard_billing_sandbox_events_insert BEFORE INSERT ON billing_sandbox_events
WHEN NOT EXISTS(SELECT 1 FROM billing_sandbox_orders WHERE id=NEW.order_id) OR EXISTS(SELECT 1 FROM account_deletions WHERE user_id=(SELECT user_id FROM billing_sandbox_orders WHERE id=NEW.order_id))
BEGIN SELECT RAISE(ABORT,'account deletion dependent write barrier'); END;

--> statement-breakpoint
CREATE TRIGGER deletion_guard_billing_sandbox_events_update BEFORE UPDATE ON billing_sandbox_events
WHEN NOT EXISTS(SELECT 1 FROM billing_sandbox_orders WHERE id=NEW.order_id) OR EXISTS(SELECT 1 FROM account_deletions WHERE user_id=(SELECT user_id FROM billing_sandbox_orders WHERE id=NEW.order_id))
BEGIN SELECT RAISE(ABORT,'account deletion dependent write barrier'); END;

--> statement-breakpoint
CREATE TRIGGER deletion_guard_billing_sandbox_transactions_insert BEFORE INSERT ON billing_sandbox_transactions
WHEN NOT EXISTS(SELECT 1 FROM billing_sandbox_orders WHERE id=NEW.order_id) OR EXISTS(SELECT 1 FROM account_deletions WHERE user_id=(SELECT user_id FROM billing_sandbox_orders WHERE id=NEW.order_id))
BEGIN SELECT RAISE(ABORT,'account deletion dependent write barrier'); END;

--> statement-breakpoint
CREATE TRIGGER deletion_guard_billing_sandbox_transactions_update BEFORE UPDATE ON billing_sandbox_transactions
WHEN NOT EXISTS(SELECT 1 FROM billing_sandbox_orders WHERE id=NEW.order_id) OR EXISTS(SELECT 1 FROM account_deletions WHERE user_id=(SELECT user_id FROM billing_sandbox_orders WHERE id=NEW.order_id))
BEGIN SELECT RAISE(ABORT,'account deletion dependent write barrier'); END;

