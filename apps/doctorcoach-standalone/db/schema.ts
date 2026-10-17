import { integer, real, sqliteTable, text, uniqueIndex, index, primaryKey, check } from 'drizzle-orm/sqlite-core';
export const workspaceMessages=sqliteTable('workspace_messages',{sequence:integer('sequence').primaryKey({autoIncrement:true}),id:text('id').notNull().unique(),workspaceId:text('workspace_id').notNull(),clientId:text('client_id').notNull(),authorId:text('author_id').notNull(),authorName:text('author_name').notNull(),authorRole:text('author_role').notNull(),content:text('content').notNull(),createdAt:text('created_at').notNull()},t=>[index('workspace_messages_thread').on(t.workspaceId,t.clientId,t.sequence),check('workspace_message_role',sql`${t.authorRole} IN ('coach','trainee')`)]);
export const workspaceChatReads=sqliteTable('workspace_chat_reads',{workspaceId:text('workspace_id').notNull(),clientId:text('client_id').notNull(),viewerId:text('viewer_id').notNull(),readThrough:integer('read_through').notNull().default(0),updatedAt:text('updated_at').notNull()},t=>[primaryKey({columns:[t.workspaceId,t.clientId,t.viewerId]})]);
export const coachWorkspaces=sqliteTable('coach_workspaces',{id:text('id').primaryKey(),ownerId:text('owner_id').notNull().unique(),ownerEmail:text('owner_email').notNull(),profileJson:text('profile_json').notNull(),state:text('state').notNull().default('pending'),plan:text('plan').notNull().default('pilot'),capacity:integer('capacity').notNull().default(10),licenseUntil:text('license_until'),version:integer('version').notNull().default(1),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull()},t=>[check('coach_workspace_state',sql`${t.state} IN ('pending','active','paused')`)]);
export const workspaceClients=sqliteTable('workspace_clients',{workspaceId:text('workspace_id').notNull(),clientId:text('client_id').notNull(),state:text('state').notNull(),profileJson:text('profile_json').notNull(),version:integer('version').notNull().default(1),joinedAt:text('joined_at').notNull(),updatedAt:text('updated_at').notNull()},t=>[primaryKey({columns:[t.workspaceId,t.clientId]}),uniqueIndex('one_active_workspace_per_client').on(t.clientId).where(sql`${t.state}='active'`),check('workspace_client_state',sql`${t.state} IN ('active','archived','revoked')`)]);
export const workspaceInvites=sqliteTable('workspace_invites',{hash:text('hash').primaryKey(),workspaceId:text('workspace_id').notNull(),targetEmail:text('target_email').notNull(),expiresAt:text('expires_at').notNull(),consumedBy:text('consumed_by'),createdAt:text('created_at').notNull()},t=>[index('workspace_invites_workspace').on(t.workspaceId)]);
export const workspacePrograms=sqliteTable('workspace_programs',{id:text('id').primaryKey(),workspaceId:text('workspace_id').notNull(),clientId:text('client_id').notNull(),authorName:text('author_name').notNull(),title:text('title').notNull(),itemsJson:text('items_json').notNull(),createdAt:text('created_at').notNull()},t=>[index('workspace_programs_client').on(t.workspaceId,t.clientId)]);
export const workspaceDrafts=sqliteTable('workspace_drafts',{workspaceId:text('workspace_id').notNull(),clientId:text('client_id').notNull(),payloadJson:text('payload_json'),version:integer('version').notNull().default(1),updatedAt:text('updated_at').notNull()},t=>[primaryKey({columns:[t.workspaceId,t.clientId]})]);
export const importExerciseMappings=sqliteTable('import_exercise_mappings',{ownerId:text('owner_id').notNull(),sourceKey:text('source_key').notNull(),source:text('source').notNull(),exerciseId:text('exercise_id').notNull(),version:integer('version').notNull().default(1),updatedAt:text('updated_at').notNull()},t=>[primaryKey({columns:[t.ownerId,t.sourceKey]})]);
export const customExercises=sqliteTable('custom_exercises',{id:text('id').primaryKey(),ownerId:text('owner_id').notNull(),definitionJson:text('definition_json').notNull(),state:text('state').notNull().default('private'),version:integer('version').notNull().default(1),reviewerId:text('reviewer_id'),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull()},t=>[index('custom_exercises_owner').on(t.ownerId,t.state),check('custom_exercises_state',sql`${t.state} IN ('private','pending','published')`)]);
import { sql } from 'drizzle-orm';

// Calendar credentials are sealed with a runtime-only AES key; never returned by APIs.
export const googleCalendarConnection=sqliteTable('google_calendar_connection',{
 id:text('id').primaryKey(),ownerId:text('owner_id').notNull(),ownerEmail:text('owner_email').notNull(),
 clientSecretCipher:text('client_secret_cipher').notNull(),refreshCipher:text('refresh_cipher'),
 enabled:integer('enabled').notNull().default(0),revision:integer('revision').notNull().default(1),
 leaseId:text('lease_id'),leaseUntil:text('lease_until'),lastError:text('last_error').notNull().default(''),updatedAt:text('updated_at').notNull(),
});
export const googleCalendarStates=sqliteTable('google_calendar_states',{
 stateHash:text('state_hash').primaryKey(),userId:text('user_id').notNull(),revision:integer('revision').notNull(),verifierCipher:text('verifier_cipher').notNull(),expiresAt:text('expires_at').notNull(),
});
export const googleCalendarSync=sqliteTable('google_calendar_sync',{
 appointmentId:text('appointment_id').primaryKey(),desiredVersion:integer('desired_version').notNull(),operation:text('operation').notNull(),
 syncedVersion:integer('synced_version').notNull().default(0),eventId:text('event_id'),
 lastError:text('last_error').notNull().default(''),updatedAt:text('updated_at').notNull(),
});

export const programItems = sqliteTable('program_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  ownerId: text('owner_id').notNull(),
  exerciseId: text('exercise_id').notNull(),
  dayId:text('day_id').notNull().default('1'),
  workoutSection:text('workout_section').notNull().default('main'),
  sets: integer('sets').notNull().default(2),
  reps: integer('reps').notNull().default(10),
  unit: text('unit').notNull().default('reps'),
  weight: real('weight').notNull().default(0),
  targetRpesJson:text('target_rpes_json'),targetRpe: real('target_rpe'),
  effortScale: text('effort_scale').notNull().default('rpe'),
  notes: text('notes').notNull().default(''),
  tempoJson:text('tempo_json'),
  repsMax:integer('reps_max'),
  weightUnspecified:integer('weight_unspecified').notNull().default(0),
  customExerciseJson:text('custom_exercise_json'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, t => [uniqueIndex('program_owner_exercise_day').on(t.ownerId,t.exerciseId,t.dayId)]);

export const workoutLogs = sqliteTable('workout_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  ownerId: text('owner_id').notNull(),
  exerciseCount: integer('exercise_count').notNull(),
  before: integer('pain_before').notNull(),
  after: integer('pain_after').notNull(),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, t => [index('logs_owner_created').on(t.ownerId, t.createdAt)]);

export const teamPhotos=sqliteTable('team_photos',{
 memberId:text('member_id').primaryKey(),objectKey:text('object_key').notNull(),mime:text('mime').notNull(),bytes:integer('bytes').notNull(),version:integer('version').notNull().default(1),updatedAt:text('updated_at').notNull(),updatedBy:text('updated_by').notNull(),
});

export const exerciseFavorites = sqliteTable('exercise_favorites', {
  ownerId: text('owner_id').notNull(),
  exerciseId: text('exercise_id').notNull(),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, t => [uniqueIndex('favorites_owner_exercise').on(t.ownerId, t.exerciseId)]);

export const trainingSessions = sqliteTable('training_sessions', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').notNull(),
  status: text('status').notNull().default('active'),
  itemsJson: text('items_json').notNull(),
  startedAt: text('started_at').notNull(),
  planMode:text('plan_mode').notNull().default('legacy'),
  programId:text('program_id'),
  finishedAt: text('finished_at'),
  before: integer('pain_before').notNull(),
  after: integer('pain_after'),
  readinessJson: text('readiness_json'),
  followupJson: text('followup_json'),
  finishFeedbackJson: text('finish_feedback_json'),
  plannedSets: integer('planned_sets').notNull(),
  completedSets: integer('completed_sets').notNull().default(0),
  version: integer('version').notNull().default(1),
}, t => [
  uniqueIndex('training_one_active_per_owner').on(t.ownerId).where(sql`${t.status} = 'active'`),
  index('training_owner_status_started').on(t.ownerId, t.status, t.startedAt),
]);

export const consultationServices = sqliteTable('consultation_services', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  provider: text('provider').notNull(),
  format: text('format').notNull(),
  durationMinutes: integer('duration_minutes').notNull(),
  priceAgorot: integer('price_agorot').notNull(),
  priceConfirmed: integer('price_confirmed', { mode: 'boolean' }).notNull().default(false),
  status: text('status').notNull().default('draft'),
  bookingUrl: text('booking_url').notNull().default(''),
  paymentUrl: text('payment_url').notNull().default(''),
  paymentInstructions: text('payment_instructions').notNull().default(''),
  version: integer('version').notNull().default(1),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  updatedBy: text('updated_by').notNull(),
});

export const careStaff = sqliteTable('care_staff', {
  email: text('email').primaryKey(), name: text('name').notNull(), role: text('role').notNull(),
  active: integer('active').notNull().default(1), updatedAt:text('updated_at').notNull(),
});
export const careProfiles = sqliteTable('care_profiles', {
  userId:text('user_id').primaryKey(), name:text('name').notNull(), goal:text('goal').notNull(),
  experience:text('experience').notNull(), equipment:text('equipment').notNull(), days:integer('days').notNull(),
  medicalJson:text('medical_json').notNull().default('{}'), version:integer('version').notNull().default(1), updatedAt:text('updated_at').notNull(),
});
export const careInvites = sqliteTable('care_invites', {
  hash:text('hash').primaryKey(), staffJson:text('staff_json').notNull(), createdBy:text('created_by').notNull(),
  expiresAt:text('expires_at').notNull(), consumedBy:text('consumed_by'), targetClientId:text('target_client_id'), createdAt:text('created_at').notNull(),
});
export const careConnections = sqliteTable('care_connections', {
  id:text('id').primaryKey(), clientId:text('client_id').notNull(), staffEmail:text('staff_email').notNull(),
  scope:text('scope').notNull().default('care'), active:integer('active').notNull().default(1), medicalAccess:integer('medical_access').notNull().default(0), nutritionAccess:integer('nutrition_access').notNull().default(0), createdAt:text('created_at').notNull(),
},t=>[uniqueIndex('care_client_staff').on(t.clientId,t.staffEmail),index('care_staff_active').on(t.staffEmail,t.active)]);
export const careNotes = sqliteTable('care_notes', {
  id:text('id').primaryKey(), clientId:text('client_id').notNull(), authorId:text('author_id').notNull(), authorName:text('author_name').notNull(),
  kind:text('kind').notNull(), content:text('content').notNull(), shared:integer('shared').notNull(), mentionEmail:text('mention_email').notNull().default(''), createdAt:text('created_at').notNull(),
},t=>[index('care_notes_client_created').on(t.clientId,t.createdAt)]);
export const carePrograms = sqliteTable('care_programs', {
  id:text('id').primaryKey(), clientId:text('client_id').notNull(), authorName:text('author_name').notNull(), authorEmail:text('author_email').notNull(),
  title:text('title').notNull(), itemsJson:text('items_json').notNull(), createdAt:text('created_at').notNull(), appliedAt:text('applied_at'),
},t=>[index('care_programs_client_created').on(t.clientId,t.createdAt)]);
export const careCheckins = sqliteTable('care_checkins', {
  id:text('id').primaryKey(), clientId:text('client_id').notNull(), week:text('week').notNull(),
  sessions:integer('sessions').notNull(), pain:integer('pain').notNull(), functionScore:integer('function_score').notNull(), effort:integer('effort').notNull(),
  content:text('content').notNull(), response:text('response').notNull().default(''), reviewer:text('reviewer'),
  reviewedAt:text('reviewed_at'), createdAt:text('created_at').notNull(),
},t=>[uniqueIndex('care_checkin_week').on(t.clientId,t.week)]);
export const mediaAssets = sqliteTable('media_assets', {
  id:text('id').primaryKey(), ownerId:text('owner_id').notNull(), kind:text('kind').notNull(), exerciseId:text('exercise_id').notNull(),
  caption:text('caption').notNull(), sessionId:text('session_id'), setIndex:integer('set_index'), mime:text('mime').notNull(), bytes:integer('bytes').notNull(), objectKey:text('object_key').notNull(),
  status:text('status').notNull(), published:integer('published').notNull().default(0), createdAt:text('created_at').notNull(),
},t=>[index('media_owner_kind').on(t.ownerId,t.kind),index('media_demo_status').on(t.kind,t.status,t.published)]);
export const mediaFeedback = sqliteTable('media_feedback', {
  id:text('id').primaryKey(), assetId:text('asset_id').notNull(), authorId:text('author_id'), authorName:text('author_name').notNull(), content:text('content').notNull(), createdAt:text('created_at').notNull(),
},t=>[index('media_feedback_asset').on(t.assetId,t.createdAt)]);
export const careAppointments = sqliteTable('care_appointments', {
  id:text('id').primaryKey(), clientId:text('client_id').notNull(), clientName:text('client_name').notNull(), serviceId:text('service_id').notNull(),
  title:text('title').notNull(), provider:text('provider').notNull(), duration:integer('duration').notNull(), priceAgorot:integer('price_agorot').notNull(),
  preference:text('preference').notNull(), state:text('state').notNull().default('requested'), startsAt:text('starts_at'), endsAt:text('ends_at'),
  meetingUrl:text('meeting_url').notNull().default(''), staffNote:text('staff_note').notNull().default(''), paymentState:text('payment_state').notNull().default('unpaid'),
  paymentReference:text('payment_reference').notNull().default(''), paymentVerifiedBy:text('payment_verified_by'),
  feedbackMessage:text('feedback_message').notNull().default(''), feedbackRequestedAt:text('feedback_requested_at'), feedbackResponse:text('feedback_response').notNull().default(''), feedbackRespondedAt:text('feedback_responded_at'),
  version:integer('version').notNull().default(1), createdAt:text('created_at').notNull(), updatedAt:text('updated_at').notNull(),
},t=>[index('appointments_client_created').on(t.clientId,t.createdAt),index('appointments_provider_time').on(t.provider,t.state,t.startsAt)]);

export const wellnessRecords = sqliteTable('wellness_records', {
  id:text('id').primaryKey(), clientId:text('client_id').notNull(), kind:text('kind').notNull(), slot:text('slot').notNull(),
  day:text('day').notNull(), contentJson:text('content_json').notNull(), version:integer('version').notNull().default(1),
  authorName:text('author_name').notNull(), updatedAt:text('updated_at').notNull(),
},t=>[uniqueIndex('wellness_client_kind_slot').on(t.clientId,t.kind,t.slot),index('wellness_client_kind_day').on(t.clientId,t.kind,t.day)]);
export const returnPlanRevisions = sqliteTable('return_plan_revisions', {
  id:text('id').primaryKey(), recordId:text('record_id').notNull(), clientId:text('client_id').notNull(),
  version:integer('version').notNull(), day:text('day').notNull(), contentJson:text('content_json').notNull(),
  authorName:text('author_name').notNull(), updatedAt:text('updated_at').notNull(), baseline:integer('baseline').notNull().default(0),
},t=>[uniqueIndex('return_revision_record_version').on(t.recordId,t.version),index('return_revision_client_version').on(t.clientId,t.version)]);
export const traineeFeedback = sqliteTable('trainee_feedback', {
  id:text('id').primaryKey(), ownerId:text('owner_id').notNull(), context:text('context').notNull(), category:text('category').notNull(),section:text('section').notNull().default('general'),bodyRegion:text('body_region').notNull().default('general'),
  content:text('content').notNull(), state:text('state').notNull().default('new'), response:text('response').notNull().default(''),
  version:integer('version').notNull().default(1), createdAt:text('created_at').notNull(), updatedAt:text('updated_at').notNull(),
},t=>[index('feedback_owner_created').on(t.ownerId,t.createdAt),index('feedback_state_created').on(t.state,t.createdAt)]);
export const successStories = sqliteTable('success_stories', {
  id:text('id').primaryKey(), ownerId:text('owner_id').notNull(), displayName:text('display_name').notNull(), content:text('content').notNull(),
  consent:integer('consent').notNull().default(0), consentAt:text('consent_at'), published:integer('published').notNull().default(0),
  version:integer('version').notNull().default(1), updatedAt:text('updated_at').notNull(),
},t=>[index('stories_owner').on(t.ownerId),index('stories_public').on(t.published,t.consent)]);

export const userIntakes = sqliteTable('user_intakes', {
  userId:text('user_id').primaryKey(), answersJson:text('answers_json').notNull(),
  completed:integer('completed').notNull().default(0), tourCompleted:integer('tour_completed').notNull().default(0),
  version:integer('version').notNull().default(1), createdAt:text('created_at').notNull(), updatedAt:text('updated_at').notNull(),
});
export const userConsents = sqliteTable('user_consents', {
  id:text('id').primaryKey(), userId:text('user_id').notNull(), consentId:text('consent_id').notNull(),
  revision:text('revision').notNull(), accepted:integer('accepted').notNull(), createdAt:text('created_at').notNull(),
},t=>[index('consents_user_kind_created').on(t.userId,t.consentId,t.createdAt)]);
export const medicalReviews = sqliteTable('medical_reviews', {
  id:text('id').primaryKey(), clientId:text('client_id').notNull(), flagsJson:text('flags_json').notNull(),
  urgency:text('urgency').notNull(), state:text('state').notNull().default('pending'),
  response:text('response').notNull().default(''), reviewer:text('reviewer'),
  version:integer('version').notNull().default(1), createdAt:text('created_at').notNull(), updatedAt:text('updated_at').notNull(),
},t=>[index('review_client_state').on(t.clientId,t.state),uniqueIndex('review_one_open').on(t.clientId).where(sql`${t.state} IN ('pending','in_review')`)]);
export const teamMessages = sqliteTable('team_messages', {
  id:text('id').primaryKey(), clientId:text('client_id').notNull(), channel:text('channel').notNull(),
  authorId:text('author_id').notNull(), authorName:text('author_name').notNull(), authorRole:text('author_role').notNull(),
  content:text('content').notNull(), createdAt:text('created_at').notNull(),
},t=>[index('messages_client_channel_created').on(t.clientId,t.channel,t.createdAt)]);
export const messageReads = sqliteTable('message_reads', {
  userId:text('user_id').notNull(), clientId:text('client_id').notNull(), channel:text('channel').notNull(), readThrough:text('read_through').notNull(),
},t=>[uniqueIndex('message_read_user_thread').on(t.userId,t.clientId,t.channel)]);
export const accountRequests = sqliteTable('account_requests', {
  requesterEmail:text('requester_email'),
  id:text('id').primaryKey(), userId:text('user_id').notNull(), kind:text('kind').notNull(),
  state:text('state').notNull().default('pending'), createdAt:text('created_at').notNull(), updatedAt:text('updated_at').notNull(),
},t=>[index('account_request_user').on(t.userId,t.state)]);
export const auditEvents = sqliteTable('audit_events', {
  id:text('id').primaryKey(), actorId:text('actor_id').notNull(), subjectId:text('subject_id').notNull(),
  action:text('action').notNull(), createdAt:text('created_at').notNull(),
},t=>[index('audit_subject_created').on(t.subjectId,t.createdAt)]);

export const contentReviews = sqliteTable('content_reviews', {
  injuryId:text('injury_id').primaryKey(), contentHash:text('content_hash').notNull(),
  state:text('state').notNull(), notes:text('notes').notNull(), reviewerId:text('reviewer_id').notNull(),
  reviewerName:text('reviewer_name').notNull(), version:integer('version').notNull().default(1), updatedAt:text('updated_at').notNull(),
});

export const trainingAccess = sqliteTable('training_access', {
 userId:text('user_id').primaryKey(),mode:text('mode').notNull().default('coached'),programId:text('program_id'),selfUntil:text('self_until'),updatedAt:text('updated_at').notNull(),
});
export const coachProgramDrafts = sqliteTable('coach_program_drafts', {
 coachId:text('coach_id').notNull(),clientId:text('client_id').notNull(),
 payloadJson:text('payload_json'),version:integer('version').notNull().default(1),updatedAt:text('updated_at').notNull(),
},t=>[uniqueIndex('coach_draft_owner_client').on(t.coachId,t.clientId)]);
export const membershipCatalog = sqliteTable('membership_catalog', {
 id:text('id').primaryKey(),priceAgorot:integer('price_agorot'),enabled:integer('enabled').notNull().default(0),paymentUrl:text('payment_url').notNull().default(''),instructions:text('instructions').notNull().default(''),version:integer('version').notNull().default(1),
});
export const membershipOrders = sqliteTable('membership_orders', {
 catalogVersion:integer('catalog_version'),
 id:text('id').primaryKey(),userId:text('user_id').notNull(),email:text('email').notNull(),priceAgorot:integer('price_agorot').notNull(),paymentUrl:text('payment_url').notNull(),instructions:text('instructions').notNull(),state:text('state').notNull().default('pending'),reference:text('reference').notNull().default(''),verifiedReference:text('verified_reference'),reviewer:text('reviewer'),startsAt:text('starts_at'),endsAt:text('ends_at'),createdAt:text('created_at').notNull(),version:integer('version').notNull().default(1),
},t=>[uniqueIndex('membership_one_pending').on(t.userId).where(sql`${t.state} IN ('pending','reported')`),uniqueIndex('membership_payment_unique').on(t.verifiedReference),index('membership_orders_user').on(t.userId,t.createdAt)]);

export const weeklyGoals = sqliteTable('weekly_goals', {clientId:text('client_id').notNull(),week:text('week').notNull(),plannedSessions:integer('planned_sessions').notNull(),version:integer('version').notNull().default(1),updatedAt:text('updated_at').notNull()},t=>[primaryKey({columns:[t.clientId,t.week]}),check('weekly_goal_range',sql`${t.plannedSessions} BETWEEN 0 AND 21`)]);
export const notificationPreferences = sqliteTable('notification_preferences',{userId:text('user_id').primaryKey(),preferencesJson:text('preferences_json').notNull(),version:integer('version').notNull().default(1),updatedAt:text('updated_at').notNull()});
export const notificationDismissals = sqliteTable('notification_dismissals',{userId:text('user_id').notNull(),notificationId:text('notification_id').notNull(),createdAt:text('created_at').notNull()},t=>[primaryKey({columns:[t.userId,t.notificationId]})]);
export const passportDetails = sqliteTable('passport_details',{clientId:text('client_id').primaryKey(),contentJson:text('content_json').notNull(),version:integer('version').notNull().default(1),updatedAt:text('updated_at').notNull()});
export const privateDocuments = sqliteTable('private_documents',{id:text('id').primaryKey(),clientId:text('client_id').notNull(),uploaderId:text('uploader_id').notNull(),uploaderName:text('uploader_name').notNull(),purpose:text('purpose').notNull(),channel:text('channel').notNull().default(''),category:text('category').notNull(),filename:text('filename').notNull(),mime:text('mime').notNull(),bytes:integer('bytes').notNull(),objectKey:text('object_key').notNull(),status:text('status').notNull().default('uploading'),createdAt:text('created_at').notNull()},t=>[index('documents_client_purpose').on(t.clientId,t.purpose,t.status,t.createdAt),check('document_size',sql`${t.bytes} BETWEEN 8 AND 10485760`),check('document_purpose',sql`${t.purpose} IN ('medical','message')`)]);
export const messageLinks = sqliteTable('message_links',{messageId:text('message_id').primaryKey(),documentId:text('document_id'),videoId:text('video_id'),exerciseId:text('exercise_id'),sessionId:text('session_id')});
export const threadStates = sqliteTable('thread_states',{clientId:text('client_id').notNull(),channel:text('channel').notNull(),resolvedThrough:integer('resolved_through').notNull().default(0),resolvedBy:text('resolved_by').notNull(),updatedAt:text('updated_at').notNull()},t=>[primaryKey({columns:[t.clientId,t.channel]})]);

// Isolated mock ledger: these records never grant real feature access.
export const billingSandboxProducts=sqliteTable('billing_sandbox_products',{id:text('id').primaryKey(),contentJson:text('content_json').notNull(),version:integer('version').notNull().default(1)});
export const billingSandboxOrders=sqliteTable('billing_sandbox_orders',{id:text('id').primaryKey(),userId:text('user_id').notNull(),productJson:text('product_json').notNull(),state:text('state').notNull().default('pending'),paidUntil:text('paid_until'),cancelAtEnd:integer('cancel_at_end').notNull().default(0),version:integer('version').notNull().default(1),createdAt:text('created_at').notNull()},t=>[index('sandbox_orders_owner').on(t.userId,t.createdAt)]);
export const billingSandboxEvents=sqliteTable('billing_sandbox_events',{id:text('id').primaryKey(),orderId:text('order_id').notNull(),payloadJson:text('payload_json').notNull(),attemptId:text('attempt_id').notNull(),createdAt:text('created_at').notNull()});
export const billingSandboxTransactions=sqliteTable('billing_sandbox_transactions',{id:text('id').primaryKey(),orderId:text('order_id').notNull(),kind:text('kind').notNull(),amountAgorot:integer('amount_agorot').notNull(),createdAt:text('created_at').notNull()});

export const documentLifecycle=sqliteTable('document_lifecycle',{documentId:text('document_id').primaryKey(),version:integer('version').notNull().default(1),deleteStatus:text('delete_status').notNull().default('none'),requestedAt:text('requested_at'),reviewedAt:text('reviewed_at'),updatedAt:text('updated_at').notNull(),lastActionId:text('last_action_id').notNull()},t=>[check('document_delete_status',sql`${t.deleteStatus} IN ('none','requested','reviewed')`)]);

// Minimal operation receipt and write barrier; no clinical content or contact data.
export const accountDeletions=sqliteTable('account_deletions',{
 userId:text('user_id').primaryKey(),requestId:text('request_id').notNull(),
 state:text('state').notNull(),reviewerId:text('reviewer_id').notNull(),
 startedAt:text('started_at').notNull(),completedAt:text('completed_at'),
},t=>[check('account_deletion_state',sql`${t.state} IN ('deleting','deleted')`)]);

export const pilotCodes=sqliteTable('pilot_codes',{id:text('id').primaryKey(),codeHash:text('code_hash').notNull().unique(),label:text('label').notNull(),durationDays:integer('duration_days').notNull(),maxUses:integer('max_uses').notNull(),usedCount:integer('used_count').notNull().default(0),active:integer('active').notNull().default(1),expiresAt:text('expires_at').notNull(),createdAt:text('created_at').notNull(),createdBy:text('created_by').notNull()});
export const pilotRedemptions=sqliteTable('pilot_redemptions',{codeId:text('code_id').notNull(),userId:text('user_id').notNull(),startsAt:text('starts_at').notNull(),endsAt:text('ends_at').notNull()},t=>[uniqueIndex('pilot_code_user').on(t.codeId,t.userId),index('pilot_user').on(t.userId)]);

export const workoutPreferences=sqliteTable('workout_preferences',{
 userId:text('user_id').primaryKey(),mode:text('mode',{enum:['fixed','flexible']}).notNull().default('fixed'),version:integer('version').notNull().default(1),updatedAt:text('updated_at').notNull()
});

export const coachProgramTemplates=sqliteTable('coach_program_templates',{id:text('id').primaryKey(),ownerId:text('owner_id').notNull(),title:text('title').notNull(),itemsJson:text('items_json').notNull(),version:integer('version').notNull().default(1),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull()},t=>[index('coach_templates_owner_updated').on(t.ownerId,t.updatedAt)]);

export const selfProgramSplits=sqliteTable('self_program_splits',{ownerId:text('owner_id').primaryKey(),payloadJson:text('payload_json').notNull(),version:integer('version').notNull().default(1),updatedAt:text('updated_at').notNull()});

export const staffPersonalAccess=sqliteTable('staff_personal_access',{userId:text('user_id').primaryKey(),email:text('email').notNull(),activatedAt:text('activated_at').notNull()},t=>[index('staff_personal_email').on(t.email)]);

export const workspaceClientEvents=sqliteTable('workspace_client_events',{sequence:integer('sequence').primaryKey({autoIncrement:true}),workspaceId:text('workspace_id').notNull(),clientId:text('client_id').notNull(),previousState:text('previous_state'),state:text('state').notNull(),occurredAt:text('occurred_at').notNull(),source:text('source').notNull()},t=>[index('workspace_client_events_month').on(t.workspaceId,t.occurredAt)]);

export const coachBillingSeats=sqliteTable('coach_billing_seats',{id:text('id').primaryKey(),workspaceId:text('workspace_id').notNull(),clientId:text('client_id'),state:text('state').notNull(),version:integer('version').notNull().default(1),activatedAt:text('activated_at').notNull(),requestedAt:text('requested_at'),reason:text('reason').notNull().default(''),decidedAt:text('decided_at'),decidedBy:text('decided_by'),updatedAt:text('updated_at').notNull()},t=>[uniqueIndex('billing_seat_membership').on(t.workspaceId,t.clientId),index('billing_seat_workspace').on(t.workspaceId,t.state)]);
export const coachBillingSeatEvents=sqliteTable('coach_billing_seat_events',{sequence:integer('sequence').primaryKey({autoIncrement:true}),seatId:text('seat_id').notNull(),state:text('state').notNull(),occurredAt:text('occurred_at').notNull()},t=>[index('billing_seat_history').on(t.seatId,t.occurredAt)]);

export const coachPaymentPolicy=sqliteTable('coach_payment_policy',{id:text('id').primaryKey(),startedAt:text('started_at').notNull()});
export const coachPaymentMandates=sqliteTable('coach_payment_mandates',{workspaceId:text('workspace_id').primaryKey(),provider:text('provider').notNull(),reference:text('reference').notNull(),state:text('state').notNull(),version:integer('version').notNull().default(1),updatedAt:text('updated_at').notNull()});
export const coachMonthlyCharges=sqliteTable('coach_monthly_charges',{id:text('id').primaryKey(),workspaceId:text('workspace_id').notNull(),month:text('month').notNull(),boundaryAt:text('boundary_at').notNull(),clientCount:integer('client_count').notNull(),rateAgorot:integer('rate_agorot').notNull(),amountAgorot:integer('amount_agorot').notNull(),state:text('state').notNull(),provider:text('provider'),mandateVersion:integer('mandate_version'),transactionRef:text('transaction_ref'),attempts:integer('attempts').notNull().default(0),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull()},t=>[uniqueIndex('coach_monthly_charge_once').on(t.workspaceId,t.month),uniqueIndex('coach_payment_receipt_once').on(t.provider,t.transactionRef)]);

export const careTasks=sqliteTable('care_tasks',{id:text('id').primaryKey(),clientId:text('client_id').notNull(),channel:text('channel').notNull(),title:text('title').notNull(),details:text('details').notNull().default(''),assigneeEmail:text('assignee_email').notNull(),dueDay:text('due_day'),state:text('state').notNull().default('open'),creatorId:text('creator_id').notNull(),creatorEmail:text('creator_email').notNull(),updatedBy:text('updated_by').notNull(),version:integer('version').notNull().default(1),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull()},t=>[index('care_task_client_state').on(t.clientId,t.state),index('care_task_assignee_due').on(t.assigneeEmail,t.dueDay)]);
export const careTaskEvents=sqliteTable('care_task_events',{id:text('id').primaryKey(),taskId:text('task_id').notNull(),actorEmail:text('actor_email').notNull(),action:text('action').notNull(),snapshotJson:text('snapshot_json').notNull(),createdAt:text('created_at').notNull()},t=>[index('care_task_history').on(t.taskId,t.createdAt)]);

export const progressLayouts=sqliteTable('progress_layouts',{userId:text('user_id').primaryKey(),orderJson:text('order_json').notNull(),version:integer('version').notNull().default(1),updatedAt:text('updated_at').notNull()});

export const staffWorkoutReviews=sqliteTable('staff_workout_reviews',{staffId:text('staff_id').notNull(),staffRole:text('staff_role').notNull(),clientId:text('client_id').notNull(),sessionId:text('session_id').notNull(),sessionVersion:integer('session_version').notNull(),reviewedAt:text('reviewed_at').notNull()},t=>[primaryKey({columns:[t.staffId,t.staffRole,t.sessionId]}),index('staff_workout_reviews_client').on(t.clientId)]);

export const nutritionCredentials=sqliteTable('nutrition_credentials',{email:text('email').primaryKey(),qualification:text('qualification').notNull(),reference:text('reference').notNull(),issuer:text('issuer').notNull(),active:integer('active').notNull(),verifiedBy:text('verified_by').notNull(),verifiedAt:text('verified_at').notNull(),version:integer('version').notNull().default(1)});

export const appearancePreferences=sqliteTable('appearance_preferences',{userId:text('user_id').primaryKey(),mode:text('mode').notNull(),palette:text('palette').notNull(),version:integer('version').notNull().default(1),updatedAt:text('updated_at').notNull()});
