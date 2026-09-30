import { AuthUser } from './auth';

export type EntityName =
  | 'athlete_profiles'
  | 'injury_episodes'
  | 'medical_reviews'
  | 'medical_restrictions'
  | 'programs'
  | 'program_versions'
  | 'workout_sessions'
  | 'exercise_sets'
  | 'rehab_entries'
  | 'readiness_entries'
  | 'pain_responses'
  | 'outcome_measures'
  | 'body_weight_entries'
  | 'nutrition_plans'
  | 'nutrition_checkins'
  | 'team_notes'
  | 'appointments'
  | 'subscriptions'
  | 'consents'
  | 'audit_events';

export type AuditEvent = {
  id: string;
  actorUserId: string;
  athleteId?: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'approve' | 'export';
  entity: EntityName;
  entityId: string;
  occurredAt: string;
  metadata?: Record<string, string | number | boolean>;
};

export interface DoctorCoachBackend {
  getCurrentUser(): Promise<AuthUser | null>;
  read<T>(entity: EntityName, id: string): Promise<T | null>;
  list<T>(entity: EntityName, athleteId: string): Promise<T[]>;
  create<T extends { id: string }>(entity: EntityName, value: T): Promise<T>;
  update<T extends { id: string }>(entity: EntityName, value: T): Promise<T>;
  createAuditEvent(event: AuditEvent): Promise<void>;
  createUploadUrl(input: { athleteId: string; contentType: string; purpose: 'training-video' | 'medical-document' | 'profile-media' }): Promise<{ uploadUrl: string; objectKey: string }>;
  createCheckoutSession(input: { userId: string; track: 'SELF' | 'COACHING' | 'MEDICAL' | 'NUTRITION'; priceId: string }): Promise<{ checkoutUrl: string }>;
}

export const productionSecurityRequirements = [
  'Server-side authentication and authorization',
  'Row-level or equivalent athlete-scoped access controls',
  'MFA for professional/admin accounts',
  'Encrypted storage and transport',
  'Signed private media URLs',
  'Append-only audit trail for sensitive actions',
  'Consent versioning and withdrawal records',
  'Verified payment webhooks before entitlement changes',
  'Backups with tested restore procedure',
  'Separate staging and production environments',
] as const;

// Deliberately no fake production adapter here. The current app uses local MVP
// persistence. A real provider must satisfy this contract before real clinical data
// or payment processing is enabled.
