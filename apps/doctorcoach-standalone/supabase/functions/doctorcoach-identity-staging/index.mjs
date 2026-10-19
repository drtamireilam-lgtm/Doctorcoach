import { stagingIdentityEndpoint } from '../../../lib/staging-identity-endpoint.ts';
// Built-in Edge runtime variables; no service-role or secret API key.
const keys = JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS') || '{}');
const candidate = keys.default;
const key = typeof candidate === 'string' && candidate.startsWith('sb_publishable_')
  ? candidate : Deno.env.get(candidate || 'SUPABASE_PUBLISHABLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY');
const handler = key ? stagingIdentityEndpoint(Deno.env.get('SUPABASE_URL'), key) : null;
Deno.serve(req => handler ? handler(req) : Response.json({ error: 'Staging configuration unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } }));
