import type { SupabaseClient } from '@supabase/supabase-js';

/** LAB team role records are server-controlled; never authorize mutations in the browser. */
export type TeamRole = 'owner' | 'admin' | 'doctor' | 'head_coach' | 'coach' | 'ux_qa' | 'marketing' | 'dietitian';
export type TeamStatus = 'active' | 'suspended';
export type TeamMembership = {
  user_id: string;
  role: TeamRole;
  status: TeamStatus;
  created_at: string;
  updated_at: string;
};

export type TeamAccess =
  | 'manage_team'
  | 'manage_coaches'
  | 'assign_trainees'
  | 'review_medical'
  | 'manage_training'
  | 'review_ux'
  | 'manage_marketing';

const grants: Record<TeamRole, readonly TeamAccess[]> = {
  owner: ['manage_team', 'manage_coaches', 'assign_trainees', 'review_medical', 'manage_training', 'review_ux', 'manage_marketing'],
  admin: ['manage_coaches', 'assign_trainees', 'manage_training'],
  doctor: ['review_medical'],
  head_coach: ['manage_coaches', 'assign_trainees', 'manage_training'],
  coach: ['manage_training'],
  ux_qa: ['review_ux'],
  marketing: ['manage_marketing'],
  dietitian: [],
};

export function hasTeamAccess(membership: TeamMembership | null, permission: TeamAccess): boolean {
  return membership?.status === 'active' && grants[membership.role].includes(permission);
}

/**
 * Loads the signed-in user's own membership via RLS.
 * This is only a UI hint: all sensitive operations must be re-authorized server-side.
 */
export async function loadMyTeamMembership(client: SupabaseClient): Promise<TeamMembership | null> {
  const { data: auth, error: authError } = await client.auth.getUser();
  if (authError || !auth.user || auth.user.is_anonymous) throw new Error('נדרשת התחברות מאומתת.');
  const { data, error } = await client.from('dc_team_members')
    .select('user_id,role,status,created_at,updated_at')
    .eq('user_id', auth.user.id)
    .maybeSingle();
  if (error) throw new Error('לא ניתן לטעון הרשאות צוות.');
  return data as TeamMembership | null;
}
