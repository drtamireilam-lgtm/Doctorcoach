import { AuthUser, UserRole } from './auth';

export type ApiSession = {
  accessToken: string;
  expiresAt: string;
  user: AuthUser;
};

export type AuditEvent = {
  id: string;
  actorUserId: string;
  athleteId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  occurredAt: string;
  metadata?: Record<string, string | number | boolean | null>;
};

export type SignedUpload = {
  uploadUrl: string;
  objectKey: string;
  expiresAt: string;
  headers?: Record<string, string>;
};

export type StoredMedia = {
  id: string;
  athleteId: string;
  ownerUserId: string;
  objectKey: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
  purpose: 'training-video' | 'medical-document' | 'profile' | 'education';
};

export interface IdentityGateway {
  currentSession(): Promise<ApiSession | null>;
  signIn(email: string, password: string): Promise<ApiSession>;
  signOut(): Promise<void>;
  refreshSession(): Promise<ApiSession>;
}

export interface DoctorCoachApi {
  getProfile(athleteId: string): Promise<unknown>;
  saveProfile(athleteId: string, payload: unknown): Promise<void>;
  listTimeline(athleteId: string): Promise<unknown[]>;
  appendTimeline(athleteId: string, payload: unknown): Promise<void>;
  createSignedUpload(input: {
    athleteId: string;
    fileName: string;
    contentType: string;
    sizeBytes: number;
    purpose: StoredMedia['purpose'];
  }): Promise<SignedUpload>;
  confirmUpload(input: {
    athleteId: string;
    objectKey: string;
    contentType: string;
    sizeBytes: number;
    purpose: StoredMedia['purpose'];
  }): Promise<StoredMedia>;
  appendAudit(event: Omit<AuditEvent, 'id' | 'occurredAt'>): Promise<AuditEvent>;
}

export type ServerAuthorizationContext = {
  userId: string;
  roles: UserRole[];
  athleteId?: string;
  /** Load active assignments from trusted server data, never from a request body. */
  athleteAssignments?: Array<{
    athleteId: string;
    role: 'coach' | 'medical' | 'dietitian';
    active: boolean;
  }>;
};

/**
 * Client-side role checks are only a UX convenience. Production authorization
 * must be repeated server-side for every read/write. Athlete-scoped resources
 * should use row-level checks and signed/private object access for media.
 */
export function canAccessAthlete(
  ctx: ServerAuthorizationContext,
  athleteId: string,
  requiredStaffRole?: 'coach' | 'medical' | 'dietitian',
): boolean {
  if (!ctx.userId.trim() || !athleteId.trim()) return false;
  if (!requiredStaffRole && ctx.roles.includes('trainee') && ctx.athleteId === athleteId) return true;
  // Administrator status alone never grants access to every clinical record.
  // This is a resource-scope check, not a replacement for action/consent checks.
  return (ctx.athleteAssignments ?? []).some((assignment) =>
    assignment.active && assignment.athleteId === athleteId &&
    ctx.roles.includes(assignment.role) &&
    (!requiredStaffRole || assignment.role === requiredStaffRole),
  );
}

export class HttpDoctorCoachApi implements DoctorCoachApi {
  constructor(private baseUrl: string, private getToken: () => Promise<string | null>) {}

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const token = await this.getToken();
    if (!token?.trim()) throw new Error('Authentication required');
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
        ...(init?.headers || {}),
      },
    });
    if (!response.ok) throw new Error(`DoctorCoach API ${response.status}`);
    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
  }

  getProfile(athleteId: string) { return this.request<unknown>(`/v1/athletes/${athleteId}`); }
  saveProfile(athleteId: string, payload: unknown) { return this.request<void>(`/v1/athletes/${athleteId}`, { method: 'PUT', body: JSON.stringify(payload) }); }
  listTimeline(athleteId: string) { return this.request<unknown[]>(`/v1/athletes/${athleteId}/timeline`); }
  appendTimeline(athleteId: string, payload: unknown) { return this.request<void>(`/v1/athletes/${athleteId}/timeline`, { method: 'POST', body: JSON.stringify(payload) }); }
  createSignedUpload(input: Parameters<DoctorCoachApi['createSignedUpload']>[0]) { return this.request<SignedUpload>('/v1/media/sign-upload', { method: 'POST', body: JSON.stringify(input) }); }
  confirmUpload(input: Parameters<DoctorCoachApi['confirmUpload']>[0]) { return this.request<StoredMedia>('/v1/media/confirm', { method: 'POST', body: JSON.stringify(input) }); }
  appendAudit(event: Parameters<DoctorCoachApi['appendAudit']>[0]) { return this.request<AuditEvent>('/v1/audit', { method: 'POST', body: JSON.stringify(event) }); }
}
