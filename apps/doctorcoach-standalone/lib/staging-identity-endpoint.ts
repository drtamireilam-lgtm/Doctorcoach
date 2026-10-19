import { supabaseGetUserTransport, supabaseIdentityVerifier } from './supabase-identity.ts';

/** No clinical data, mapping mutation, OTP sending or token persistence. */
export function stagingIdentityEndpoint(projectUrl: string, publishableKey: string, request: typeof fetch = fetch) {
  const issuer = new URL('/auth/v1', projectUrl).href;
  const getUser = supabaseGetUserTransport(projectUrl, publishableKey, request);
  return async (req: Request): Promise<Response> => {
    const reply = (status: number, body: object) => Response.json(body, {
      status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
    });
    if (req.method !== 'POST') return reply(405, { error: 'Method not allowed' });
    const authorization = req.headers.get('authorization');
    const match = authorization?.match(/^Bearer ([A-Za-z0-9_.-]{1,16000})$/);
    if (!match) return reply(401, { error: 'Authentication required' });
    const token = match[1];
    const verify = supabaseIdentityVerifier({
      issuer, getUser,
      checkSession: async () => {
        // RPC has no identity arguments: PostgREST's verified JWT context binds
        // the exact user/session. No service-role key or admin DB client is used.
        const response = await request(new URL('/rest/v1/rpc/doctorcoach_staging_session_active', projectUrl), {
          method: 'POST', headers: { apikey: publishableKey, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: '{}', redirect: 'manual', cache: 'no-store', signal: AbortSignal.timeout(8000),
        });
        return response.ok && await response.json() === true;
      },
    });
    const identity = await verify(token);
    if (!identity) return reply(401, { error: 'Authentication required' });
    return reply(200, { authenticated: true, subject: identity.subject });
  };
}
