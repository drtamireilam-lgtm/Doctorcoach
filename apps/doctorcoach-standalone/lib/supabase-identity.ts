/** Isolated server integration; deliberately not imported by live routes.
 * getUser must be Supabase's server Auth API/SDK, never a client-supplied callback.
 * checkSession must query trusted auth.sessions state and enforce configured
 * inactivity/time-box limits. A valid signature alone cannot prove non-revocation.
 */
import type { IdentityVerifier } from './identity-mapping.ts';

type User = { id: string; is_anonymous?: boolean; email_confirmed_at?: string; banned_until?: string };
export type SessionCheck = {
  issuer: string; subject: string; sessionId: string; checkedAt: number;
};
export type SupabaseIdentityDependencies = {
  issuer: string;
  getUser: (token: string) => Promise<{ data: { user: User | null }; error: unknown }>;
  checkSession: (input: SessionCheck) => Promise<boolean>;
  now?: () => number;
};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const seconds = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) > 0;
function decode(part: string): Record<string, unknown> | null {
  if (!/^[A-Za-z0-9_-]+$/.test(part)) return null;
  const bytes = Uint8Array.from(atob(part.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
  const value: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  return object(value) ? value : null;
}

export function supabaseIdentityVerifier(deps: SupabaseIdentityDependencies): IdentityVerifier {
  const url = new URL(deps.issuer);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash ||
      url.pathname !== '/auth/v1' || url.href !== deps.issuer ||
      typeof deps.getUser !== 'function' || typeof deps.checkSession !== 'function') {
    throw new Error('A pinned HTTPS issuer and trusted user/session validators are required.');
  }
  const now = deps.now ?? Date.now;
  return async token => {
    try {
      if (typeof token !== 'string' || token.length > 16000) return null;
      const parts = token.split('.');
      if (parts.length !== 3 || !/^[A-Za-z0-9_-]+$/.test(parts[2])) return null;
      const header = decode(parts[0]), claims = decode(parts[1]), at = now();
      // Decoding is only a cheap rejection filter, never signature verification.
      if (!header || !['HS256', 'ES256', 'RS256'].includes(String(header.alg)) || header.crit !== undefined ||
          !claims || claims.iss !== deps.issuer || claims.aud !== 'authenticated' ||
          claims.role !== 'authenticated' || claims.is_anonymous !== false ||
          typeof claims.sub !== 'string' || !uuid.test(claims.sub) ||
          typeof claims.session_id !== 'string' || !uuid.test(claims.session_id) ||
          !seconds(claims.exp) || claims.exp * 1000 <= at ||
          !seconds(claims.iat) || claims.iat * 1000 > at + 30000 || claims.iat >= claims.exp ||
          (claims.nbf !== undefined && (!seconds(claims.nbf) || claims.nbf * 1000 > at)) ||
          !Array.isArray(claims.amr)) return null;
      // Email OTP only in this staging phase. Refresh/recovery/MFA timestamps
      // do not establish recent primary authentication for account linking.
      const issuedAt = claims.iat;
      const authentication = claims.amr.filter(entry => object(entry) && entry.method === 'otp' &&
        seconds(entry.timestamp) && entry.timestamp * 1000 <= at + 30000 && entry.timestamp <= issuedAt);
      if (!authentication.length) return null;
      const authenticatedAt = Math.max(...authentication.map(entry => entry.timestamp as number)) * 1000;
      const result = await deps.getUser(token); // Auth server verifies the exact token/signature.
      const user = result.data?.user;
      if (result.error || !user || user.id !== claims.sub || user.is_anonymous !== false ||
          !user.email_confirmed_at || !Number.isFinite(Date.parse(user.email_confirmed_at)) ||
          Date.parse(user.email_confirmed_at) > now() + 30000 ||
          (user.banned_until && (!Number.isFinite(Date.parse(user.banned_until)) || Date.parse(user.banned_until) > now()))) return null;
      if (await deps.checkSession({ issuer: deps.issuer, subject: user.id, sessionId: claims.session_id, checkedAt: now() }) !== true) return null;
      if (claims.exp * 1000 <= now()) return null;
      return { issuer: deps.issuer, subject: user.id, authenticatedAt, expiresAt: claims.exp * 1000 };
    } catch { return null; } // Provider/network/session failure denies access without leaking tokens.
  };
}

/** Server-only getUser transport, using a public key, never service_role.
 * No redirect following, persistence, token logging, or issuer from an input JWT.
 */
export function supabaseGetUserTransport(projectUrl: string, publishableKey: string, request: typeof fetch = fetch) {
  const url = new URL(projectUrl);
  let publicKey = publishableKey.startsWith('sb_publishable_');
  if (!publicKey) {
    try {
      const parts = publishableKey.split('.');
      const claims = parts.length === 3 ? decode(parts[1]) : null;
      // Compatibility with the Edge runtime's built-in legacy anon key only.
      publicKey = claims?.role === 'anon' && claims.iss === 'supabase' && claims.ref === url.hostname.split('.')[0];
    } catch { publicKey = false; }
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/' ||
      !publicKey) throw new Error('Pinned project URL and public API key required.');
  return async (token: string): Promise<{ data: { user: User | null }; error: unknown }> => {
    try {
      if (!token || token.length > 16000 || /[\r\n]/.test(token)) return { data: { user: null }, error: 'Invalid proof' };
      const response = await request(new URL('/auth/v1/user', url), {
        headers: { apikey: publishableKey, Authorization: `Bearer ${token}` },
        redirect: 'manual', cache: 'no-store', signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) return { data: { user: null }, error: 'Provider rejected proof' };
      const value: unknown = await response.json();
      if (!object(value) || typeof value.id !== 'string') return { data: { user: null }, error: 'Invalid provider response' };
      return { data: { user: value as User }, error: null };
    } catch { return { data: { user: null }, error: 'Provider unavailable' }; }
  };
}
