import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {platform} from './platform-db.mjs';
import {authGateway,sessionCookie} from '../standalone/gateway.ts';
import {supabaseProvider} from '../standalone/provider.ts';
const schema=await readFile(new URL('../standalone/migrations/0001_identity.sql',import.meta.url),'utf8');
const origin='https://staging.example.test',issuer='https://auth.example.test/auth/v1';
const extractCookie=(response,name)=>response.headers.getSetCookie().find(c=>c.startsWith(name+'='))?.split(';')[0];
async function setup(t){
 const f=platform(t);f.sql.exec(schema);let time=Date.now(),used=false,enabled=true,authorization,exchanges=0;
 const tokens={access_token:'server-only-access',refresh_token:'server-only-refresh',expires_at:time+600000};
 const proof={claims:{issuer,subject:'123e4567-e89b-12d3-a456-426614174000',authenticatedAt:time,expiresAt:tokens.expires_at},email:'oauth-user@example.test'};
 const provider={issuer,send:async()=>{},verify:async()=>tokens,refresh:async()=>tokens,authenticate:async token=>token===tokens.access_token?proof:null,logout:async()=>{},oauth:{
  async enabled(){return {google:enabled,apple:enabled};},
  authorizationUrl(provider,callback,challenge){authorization={provider,callback,challenge};const u=new URL('https://auth.example.test/auth/v1/authorize');u.search=new URLSearchParams({provider,redirect_to:callback,code_challenge:challenge,code_challenge_method:'s256'}).toString();return u.href;},
  async exchange(code,verifier){exchanges++;if(code!=='valid-code'||used||Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier))).toString('base64url')!==authorization.challenge)throw Error('invalid grant');used=true;proof.claims.authenticatedAt=time;proof.claims.expiresAt=time+600000;tokens.expires_at=time+600000;return tokens;},
 }};
 const settings={origin,legacyIssuer:'test-legacy',encryptionKey:Buffer.alloc(32,9).toString('base64'),allowNewAccounts:true,reservedEmails:[],now:()=>time};
 const gateway=authGateway(f.db,provider,settings);
 const next=async()=>Response.json({public:true});
 const post=(path,body={},cookie='',headers={})=>gateway.handle(new Request(origin+path,{method:'POST',headers:{origin,'content-type':'application/json',cookie,...headers},body:JSON.stringify(body)}),next);
 const callback=(cookie,query='code=valid-code')=>gateway.handle(new Request(origin+'/auth/oauth/callback?'+query,{headers:{cookie}}),next);
 return {...f,gateway,provider,post,callback,advance:n=>time+=n,disable:()=>enabled=false,exchanges:()=>exchanges};
}

test('OAuth starts only by same-origin POST and sends PKCE without exposing its verifier or tokens',async t=>{
 const f=await setup(t);
 assert.equal((await f.post('/auth/oauth/start',{provider:'google'},'',{origin:'https://evil.test'})).status,403);
 const r=await f.post('/auth/oauth/start',{provider:'google',returnTo:'/#plan',english:true});
 assert.equal(r.status,200);const body=await r.json(),u=new URL(body.url);
 assert.equal(u.origin,'https://auth.example.test');assert.equal(u.searchParams.get('provider'),'google');assert.equal(u.searchParams.get('redirect_to'),origin+'/auth/oauth/callback');
 assert.equal(u.searchParams.get('code_challenge_method'),'s256');assert.match(u.searchParams.get('code_challenge'),/^[\w-]{43}$/);
 assert.ok(!body.url.includes('code_verifier'));assert.ok(!JSON.stringify(body).includes('server-only'));
 const flow=r.headers.getSetCookie().find(c=>c.startsWith('__Host-dc_oauth='));assert.ok(flow);assert.match(flow,/HttpOnly/);assert.match(flow,/Secure/);assert.match(flow,/SameSite=Lax/);assert.match(flow,/Max-Age=600/);
});

test('successful callback creates an opaque session and retains explicit account registration',async t=>{
 const f=await setup(t),start=await f.post('/auth/oauth/start',{provider:'apple',returnTo:'/#plan',english:true});
 assert.equal(start.status,200);const r=await f.callback(extractCookie(start,'__Host-dc_oauth'));
 assert.equal(r.status,303);assert.equal(r.headers.get('location'),origin+'/auth/signin?lang=en&return_to=%2F%23plan');
 const session=extractCookie(r,sessionCookie);assert.ok(session);assert.match(r.headers.getSetCookie().find(c=>c.startsWith(sessionCookie+'=')),/SameSite=Strict/);
 assert.ok(r.headers.getSetCookie().some(c=>c.startsWith('__Host-dc_oauth=')&&c.includes('Max-Age=0')));
 assert.ok(!JSON.stringify([...r.headers]).includes('server-only'));
 assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM dc_identity_aliases').get().n,0);
 const status=await(await f.post('/auth/status',{},session)).json();assert.equal(status.linked,false);
 assert.equal((await f.post('/auth/register',{confirmed:true},session)).status,200);
 assert.equal((await(await f.post('/auth/status',{},session)).json()).linked,true);
});

test('missing, corrupt, expired, canceled and replayed OAuth flows cannot create extra sessions',async t=>{
 const f=await setup(t);
 for(const cookie of ['', '__Host-dc_oauth=forged']){const r=await f.callback(cookie);assert.equal(r.status,303);assert.match(r.headers.get('location'),/oauth_error=/);}
 assert.equal(f.exchanges(),0);
 let start=await f.post('/auth/oauth/start',{provider:'google'}),flow=extractCookie(start,'__Host-dc_oauth');
 const canceled=await f.callback(flow,'error=access_denied&error_description=PRIVATE_PROVIDER_DETAIL');assert.match(canceled.headers.get('location'),/oauth_error=cancelled/);assert.ok(!canceled.headers.get('location').includes('PRIVATE'));
 f.advance(600001);assert.match((await f.callback(flow)).headers.get('location'),/oauth_error=/);assert.equal(f.exchanges(),0);
 start=await f.post('/auth/oauth/start',{provider:'google'});flow=extractCookie(start,'__Host-dc_oauth');
 assert.ok(extractCookie(await f.callback(flow),sessionCookie));
 const replay=await f.callback(flow);assert.match(replay.headers.get('location'),/oauth_error=/);assert.equal(extractCookie(replay,sessionCookie),undefined);
 assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM dc_auth_sessions').get().n,1);
});

test('unconfigured and unsupported providers stay unavailable while email sign-in remains present',async t=>{
 const f=await setup(t);f.disable();assert.deepEqual(await(await f.post('/auth/providers')).json(),{google:false,apple:false});
 assert.equal((await f.post('/auth/oauth/start',{provider:'google'})).status,503);
 assert.equal((await f.post('/auth/oauth/start',{provider:'github'})).status,400);
 const page=await f.gateway.handle(new Request(origin+'/auth/signin'),async()=>new Response('missing'));
 const html=await page.text();assert.match(html,/id="oauth-google"/);assert.match(html,/id="oauth-apple"/);
});

test('successful replacement preserves the mapped owner and revokes the old session; cancel leaves it valid',async t=>{
 const f=await setup(t),challenge=await f.gateway.store.send('oauth-user@example.test','test-ip'),old=await f.gateway.store.verify(challenge.challenge,'123456');
 const owner=await f.gateway.store.register(old.sid);
 let start=await f.post('/auth/oauth/start',{provider:'google',returnTo:'/#plan'},sessionCookie+'='+old.sid);
 await f.callback(extractCookie(start,'__Host-dc_oauth'),'error=access_denied');
 assert.equal((await f.gateway.store.current(old.sid)).user.userId,owner.userId);
 start=await f.post('/auth/oauth/start',{provider:'apple',returnTo:'/#plan'},sessionCookie+'='+old.sid);
 const response=await f.callback(extractCookie(start,'__Host-dc_oauth'));
 assert.equal(response.headers.get('location'),origin+'/#plan');
 const newCookie=extractCookie(response,sessionCookie);assert.ok(newCookie);assert.notEqual(newCookie,sessionCookie+'='+old.sid);
 assert.equal((await(await f.post('/auth/status',{},newCookie)).json()).linked,true);
 await assert.rejects(f.gateway.store.current(old.sid));
 assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM dc_identity_details').get().n,1);
});

test('a code from another browser cannot replace the session and unsafe return URLs are discarded',async t=>{
 const f=await setup(t),first=await f.post('/auth/oauth/start',{provider:'google',returnTo:'https://evil.test/'}),second=await f.post('/auth/oauth/start',{provider:'google'});
 const rejected=await f.callback(extractCookie(first,'__Host-dc_oauth'));assert.match(rejected.headers.get('location'),/oauth_error=/);assert.equal(extractCookie(rejected,sessionCookie),undefined);
 const accepted=await f.callback(extractCookie(second,'__Host-dc_oauth'));assert.ok(extractCookie(accepted,sessionCookie));assert.ok(!accepted.headers.get('location').includes('evil.test'));
 assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM dc_auth_sessions').get().n,1);
});

test('Supabase OAuth transport pins settings and exchanges PKCE server-side with bounded requests',async()=>{
 const calls=[];
 const provider=supabaseProvider('https://auth.example.test','sb_publishable_test',async(url,options)=>{calls.push({url:String(url),options});return String(url).endsWith('/settings')?Response.json({external:{google:true,apple:false,github:true}}):Response.json({access_token:'access',refresh_token:'refresh',expires_in:3600});});
 assert.ok(provider.oauth);assert.deepEqual(await provider.oauth.enabled(),{google:true,apple:false});
 const url=new URL(provider.oauth.authorizationUrl('google',origin+'/auth/oauth/callback','x'.repeat(43)));assert.equal(url.pathname,'/auth/v1/authorize');assert.equal(url.searchParams.get('code_challenge_method'),'s256');
 const tokens=await provider.oauth.exchange('valid-code','x'.repeat(72));assert.equal(tokens.access_token,'access');
 const exchange=calls.at(-1);assert.equal(exchange.url,'https://auth.example.test/auth/v1/token?grant_type=pkce');assert.deepEqual(JSON.parse(exchange.options.body),{auth_code:'valid-code',code_verifier:'x'.repeat(72)});assert.equal(exchange.options.redirect,'manual');assert.ok(exchange.options.signal);
 await assert.rejects(provider.oauth.exchange('', 'short'));
});
