export type UserRole = 'trainee' | 'coach' | 'medical' | 'dietitian' | 'admin';

export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  roles: UserRole[];
  athleteId?: string;
};

export type Permission =
  | 'profile:read'
  | 'profile:write:self'
  | 'medical:review'
  | 'medical:write'
  | 'training:assign'
  | 'training:log'
  | 'training:self-program'
  | 'nutrition:write'
  | 'team:notes'
  | 'admin:manage';

const rolePermissions: Record<UserRole, Permission[]> = {
  trainee: ['profile:read', 'profile:write:self', 'training:log'],
  coach: ['profile:read', 'training:assign', 'training:log', 'team:notes'],
  medical: ['profile:read', 'medical:review', 'medical:write', 'team:notes'],
  dietitian: ['profile:read', 'nutrition:write', 'team:notes'],
  admin: ['profile:read', 'medical:review', 'medical:write', 'training:assign', 'training:log', 'training:self-program', 'nutrition:write', 'team:notes', 'admin:manage'],
};

export function can(user: AuthUser | null, permission: Permission): boolean {
  if (!user) return false;
  return user.roles.some((role) => rolePermissions[role].includes(permission));
}

export function requirePermission(user: AuthUser | null, permission: Permission): void {
  if (!can(user, permission)) {
    throw new Error(`Permission denied: ${permission}`);
  }
}

export interface AuthProvider {
  currentUser(): Promise<AuthUser | null>;
  signIn(email: string, password: string): Promise<AuthUser>;
  signOut(): Promise<void>;
}

/**
 * Development-only provider so the UI can be wired before a production identity
 * provider is selected. Never treat this as production authentication.
 */
export class DemoAuthProvider implements AuthProvider {
  private user: AuthUser | null = null;

  async currentUser(): Promise<AuthUser | null> {
    return this.user;
  }

  async signIn(email: string): Promise<AuthUser> {
    this.user = {
      id: 'demo-user',
      email,
      displayName: 'Demo User',
      roles: ['admin'],
      athleteId: 'demo-athlete',
    };
    return this.user;
  }

  async signOut(): Promise<void> {
    this.user = null;
  }
}
