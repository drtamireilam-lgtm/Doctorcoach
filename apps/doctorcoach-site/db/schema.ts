import { integer, real, sqliteTable, text, uniqueIndex, index, primaryKey, check } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const programItems = sqliteTable('program_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  ownerId: text('owner_id').notNull(),
  exerciseId: text('exercise_id').notNull(),
  sets: integer('sets').notNull().default(2),
  reps: integer('reps').notNull().default(10),
  unit: text('unit').notNull().default('reps'),
  weight: real('weight').notNull().default(0),
  targetRpe: real('target_rpe'),
  effortScale: text('effort_scale').notNull().default('rpe'),
  notes: text('notes').notNull().default(''),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, t => [uniqueIndex('program_owner_exercise').on(t.ownerId, t.exerciseId)]);

export const workoutLogs = sqliteTable('workout_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  ownerId: text('owner_id').notNull(),
  exerciseCount: integer('exercise_count').notNull(),
  before: integer('pain_before').notNull(),
  after: integer('pain_after').notNull(),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, t => [index('logs_owner_created').on(t.ownerId, t.createdAt)]);

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
  expiresAt:text('expires_at').notNull(), consumedBy:text('consumed_by'), createdAt:text('created_at').notNull(),
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
  id:text('id').primaryKey(), ownerId:text('owner_id').notNull(), context:text('context').notNull(), category:text('category').notNull(),
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
