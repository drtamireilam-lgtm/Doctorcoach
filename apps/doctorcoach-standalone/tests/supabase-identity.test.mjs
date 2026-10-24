import test from 'node:test';
import assert from 'node:assert/strict';
import { supabaseIdentityVerifier, supabaseGetUserTransport } from '../lib/supabase-identity.ts';
import { verifyIdentity } from '../lib/identity-mapping.ts';
const issuer = 'https://staging.example.test/auth/v1', now = 1800000000000;
const sub = '123e4567-e89b-12d3-a456-426614174000', session = '223e4567-e89b-12d3-a456-426614174000';
const base = { iss: issuer, sub, session_id: session, aud: 'authenticated', role: 'authenticated', is_anonymous: false, iat: now/1000-1, exp: now/1000+600, amr: [{method:'otp',timestamp:now/1000-60}] };
const token = (changes={}, header={alg:'ES256'}) => [header,{...base,...changes}].map(v=>Buffer.from(JSON.stringify(v)).toString('base64url')).concat('signature').join('.');
const user = { id: sub, is_anonymous:false, email_confirmed_at:new Date(now-100000).toISOString() };
function setup(overrides={}) {
  const calls = [];
  const deps = { issuer, now:()=>now, getUser:async t=>{calls.push(['user',t]);return {data:{user},error:null};}, checkSession:async input=>{calls.push(['session',input]);return true;}, ...overrides };
  return {calls,verify:supabaseIdentityVerifier(deps)};
}
test('provider and live session must approve the exact proof before branding',async()=>{
  const {verify,calls}=setup(), proof=token();
  assert.deepEqual(await verifyIdentity(proof,verify,[issuer],now),{issuer,subject:sub,authenticatedAt:now-60000,expiresAt:now+600000});
  assert.equal(calls[0][1],proof);
  assert.deepEqual(calls[1][1],{issuer,subject:sub,sessionId:session,checkedAt:now});
});
for (const [name,changes,header] of [
  ['expired',{exp:now/1000}],['other project',{iss:'https://evil.test/auth/v1'}],
  ['wrong audience',{aud:'anon'}],['service role',{role:'service_role'}],['anonymous',{is_anonymous:true}],
  ['missing session',{session_id:undefined}],['invalid subject',{sub:'client-picked'}],
  ['future issue',{iat:now/1000+60}],['not yet valid',{nbf:now/1000+1}],
  ['missing primary auth',{amr:[{method:'token_refresh',timestamp:now/1000-1}]}],
  ['recovery only',{amr:[{method:'recovery',timestamp:now/1000-1}]}],
  ['future primary auth',{amr:[{method:'otp',timestamp:now/1000+60}]}],
  ['unsigned',{}, {alg:'none'}],['unsupported critical header',{}, {alg:'ES256',crit:['custom']}],
]) test(`rejects ${name} before any provider or session call`,async()=>{
  const {verify,calls}=setup();assert.equal(await verify(token(changes,header)),null);assert.equal(calls.length,0);
});
test('decoding a forged token never substitutes for provider verification',async()=>{
  const {verify,calls}=setup({getUser:async()=>({data:{user:null},error:'bad signature'})});
  assert.equal(await verify(token()),null);assert.equal(calls.length,0);
});
for(const [name,replacement] of [['mismatched user',{...user,id:session}],['unconfirmed email',{...user,email_confirmed_at:null}],['anonymous user',{...user,is_anonymous:true}],['banned user',{...user,banned_until:new Date(now+10000).toISOString()}]])
  test(`rejects ${name}`,async()=>{const {verify,calls}=setup({getUser:async()=>({data:{user:replacement},error:null})});assert.equal(await verify(token()),null);assert.equal(calls.length,0);});
test('revoked session, session error and provider outage deny access',async()=>{
  for(const overrides of [{checkSession:async()=>false},{checkSession:async()=>{throw Error('db offline');}},{getUser:async()=>{throw Error('network offline');}}]) assert.equal(await setup(overrides).verify(token()),null);
});
test('refresh does not make old OTP authentication fresh',async()=>{
  const result=await setup().verify(token({amr:[{method:'otp',timestamp:now/1000-3600},{method:'token_refresh',timestamp:now/1000-1}]}));
  assert.equal(result.authenticatedAt,now-3600000);
});

test('OAuth primary authentication is explicitly opt-in and still requires the trusted user and active session',async()=>{
 const proof=token({amr:[{method:'oauth',timestamp:now/1000-30},{method:'token_refresh',timestamp:now/1000-1}]});
 assert.equal(await setup().verify(proof),null);
 const enabled=setup({primaryMethods:['otp','oauth']});
 assert.equal((await enabled.verify(proof)).authenticatedAt,now-30000);
 assert.equal(enabled.calls.length,2);
 assert.equal(await setup({primaryMethods:['otp','oauth'],checkSession:async()=>false}).verify(proof),null);
 assert.equal(await setup({primaryMethods:['otp','oauth'],getUser:async()=>({data:{user:null},error:'invalid'})}).verify(proof),null);
});
test('expiry is rechecked after asynchronous provider/session calls',async()=>{
  let clock=now;
  const {verify}=setup({now:()=>clock,checkSession:async()=>{clock+=700000;return true;}});
  assert.equal(await verify(token()),null);
});
test('mandatory pinned validators and HTTPS configuration',()=>{
  assert.throws(()=>setup({checkSession:undefined}));assert.throws(()=>setup({issuer:'http://example.test/auth/v1'}));
});
test('transport uses pinned endpoint, exact bearer token and bounded nonredirecting request',async()=>{
  let observed;
  const getUser=supabaseGetUserTransport('https://staging.example.test','sb_publishable_test',async(url,options)=>{observed={url:String(url),options};return Response.json(user);});
  assert.equal((await getUser(token())).data.user.id,sub);
  assert.equal(observed.url,'https://staging.example.test/auth/v1/user');
  assert.equal(observed.options.headers.Authorization,`Bearer ${token()}`);
  assert.equal(observed.options.redirect,'manual');assert.equal(observed.options.cache,'no-store');assert.ok(observed.options.signal);
});
test('transport suppresses provider errors and rejects malformed input/configuration',async()=>{
  assert.throws(()=>supabaseGetUserTransport('http://example.test','sb_publishable_test'));
  assert.throws(()=>supabaseGetUserTransport('https://example.test','service_role_secret'));
  for(const request of [async()=>new Response('private detail',{status:401}),async()=>{throw Error('private detail');},async()=>Response.json({unexpected:true})]) {
    const result=await supabaseGetUserTransport('https://staging.example.test','sb_publishable_test',request)(token());
    assert.equal(result.data.user,null);assert.ok(result.error);assert.ok(!JSON.stringify(result).includes('private detail'));
  }
});
test('legacy public anon compatibility is pinned to project and excludes service_role',()=>{
 const legacy=(role,ref)=>[{alg:'HS256'},{role,ref,iss:'supabase'}].map(v=>Buffer.from(JSON.stringify(v)).toString('base64url')).concat('signature').join('.');
 assert.doesNotThrow(()=>supabaseGetUserTransport('https://staging.supabase.co',legacy('anon','staging')));
 assert.throws(()=>supabaseGetUserTransport('https://staging.supabase.co',legacy('service_role','staging')));
 assert.throws(()=>supabaseGetUserTransport('https://staging.supabase.co',legacy('anon','other')));
});
