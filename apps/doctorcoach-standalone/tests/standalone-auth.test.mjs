import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {platform,client,stranger,profile} from './platform-db.mjs';
import {authStore} from '../standalone/auth-store.ts';
import {authGateway,sessionCookie,challengeCookie,sanitize,safeReturn} from '../standalone/gateway.ts';
import {signLink,tokenVault} from '../standalone/crypto.ts';
import {legacyLinkBridge} from '../standalone/legacy-bridge.ts';
import {supabaseProvider} from '../standalone/provider.ts';
import {defaultPrescription} from '../lib/training.ts';
import {nextSetLoad,setEstimated1RM} from '../lib/set-load.ts';
import {isStaff} from '../lib/staff.ts';
const schema=await readFile(new URL('../standalone/migrations/0001_identity.sql',import.meta.url),'utf8');
const origin='https://staging.example.test',issuer='https://auth.example.test/auth/v1',legacyIssuer='sites:synthetic-old';
async function setup(t){const f=platform(t);f.sql.exec(schema);let time=Date.now(),seq=0,refreshes=0;const tokens=new Map(),codes=new Map(),revoked=new Set();
 function mint(email,subject=randomUUID(),authenticatedAt=time){const n=String(++seq),value={access_token:'synthetic.access.'+n,refresh_token:'refresh-'+n,expires_at:time+5*60000};tokens.set(value.access_token,{claims:{issuer,subject,authenticatedAt,expiresAt:value.expires_at},email});return value;}
 const provider={issuer,async send(email){codes.set(email,{code:'123456',at:time});},async verify(email,code){const c=codes.get(email);if(!c||c.code!==code||time-c.at>=10*60000)throw new Error('invalid');codes.delete(email);return mint(email);},async authenticate(token){const p=tokens.get(token);return p&&!revoked.has(p.claims.subject)&&p.claims.expiresAt>time?p:null;},async refresh(refresh){refreshes++;const token=[...tokens.keys()].find(k=>k.endsWith('.'+refresh.slice(8))),p=tokens.get(token);if(!p||revoked.has(p.claims.subject))throw new Error('revoked');return mint(p.email,p.claims.subject,p.claims.authenticatedAt);},async logout(token){const p=tokens.get(token);if(p)revoked.add(p.claims.subject);}};
 const legacyKeys=await crypto.subtle.generateKey('Ed25519',true,['sign','verify']),externalKeys=await crypto.subtle.generateKey('Ed25519',true,['sign','verify']);
 const legacyPrivate=await crypto.subtle.exportKey('jwk',legacyKeys.privateKey),legacyPublic=await crypto.subtle.exportKey('jwk',legacyKeys.publicKey),externalPrivate=await crypto.subtle.exportKey('jwk',externalKeys.privateKey),externalPublic=await crypto.subtle.exportKey('jwk',externalKeys.publicKey);
 const settings={legacyIssuer,origin,encryptionKey:Buffer.alloc(32,7).toString('base64'),legacyPublicKey:legacyPublic,externalPrivateKey:externalPrivate,allowNewAccounts:true,reservedEmails:['doctor@example.test'],now:()=>time};
 const store=authStore(f.db,provider,settings),gateway=authGateway(f.db,provider,settings);
 const login=async email=>{const c=await store.send(email,'ip-'+email);return store.verify(c.challenge,'123456');};
 const legacyProof=async(sid,subject=client.userId,email=client.email,extra={})=>{const current=await store.current(sid);return signLink({iss:legacyIssuer,aud:origin,sub:subject,target:current.subject,email,nonce:randomUUID()+randomUUID(),iat:time,exp:time+300000,...extra},legacyPrivate);};
 const api=async(path,body={},cookie='',extras={})=>gateway.handle(new Request(origin+path,{method:'POST',headers:{origin,'Content-Type':'application/json',cookie,...extras},body:JSON.stringify(body)}),async req=>Response.json({user:req.headers.get('oai-authenticated-user-id'),email:req.headers.get('oai-authenticated-user-email')}));
 return {...f,store,provider,gateway,settings,login,legacyProof,api,legacyPrivate,externalPublic,now:()=>time,advance:n=>{time+=n;},refreshes:()=>refreshes,revoked};
}
test('fresh start registers distinct owner and personal accounts before reserving the owner; no legacy identity or data is imported',async t=>{
 const f=await setup(t);
 const ownerEmail='fresh-owner@example.test',personalEmail='fresh-personal@example.test';
 const ownerLogin=await f.login(ownerEmail),owner=await f.store.register(ownerLogin.sid);
 const personalLogin=await f.login(personalEmail),personal=await f.store.register(personalLogin.sid);
 assert.notEqual(owner.userId,personal.userId);
 f.settings.reservedEmails.push(ownerEmail);
 assert.equal((await f.store.register(ownerLogin.sid)).userId,owner.userId);
 assert.equal(isStaff(owner,ownerEmail),true);
 assert.equal(isStaff(personal,ownerEmail),false);
 assert.equal((await f.store.current(personalLogin.sid)).user.userId,personal.userId);
 assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM dc_identity_details WHERE legacy=1').get().n,0);
 assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM dc_legacy_link_receipts').get().n,0);
 assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM care_profiles').get().n,0);
 assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM training_sessions').get().n,0);
});
test('wrong, expired and replayed OTP cannot create an application session; retry with correct code succeeds',async t=>{
 const f=await setup(t),c=await f.store.send('new@example.test','ip');await assert.rejects(f.store.verify(c.challenge,'999999'));const r=await f.store.verify(c.challenge,'123456');assert.equal(r.user,null);await assert.rejects(f.store.verify(c.challenge,'123456'));assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM dc_auth_sessions').get().n,1);
 const next=await f.store.send('later@example.test','ip2');f.advance(600001);await assert.rejects(f.store.verify(next.challenge,'123456'));
});
test('five wrong attempts close the challenge and OTP send cooldown survives a new browser',async t=>{
 const f=await setup(t),c=await f.store.send('new@example.test','ip');for(let i=0;i<5;i++)await assert.rejects(f.store.verify(c.challenge,'999999'));await assert.rejects(f.store.verify(c.challenge,'123456'));await assert.rejects(f.store.send('new@example.test','different-ip'),e=>e.status===429);
});
test('registration is explicit and preserves a separate principal; matching a reserved email cannot gain staff access',async t=>{
 const f=await setup(t),r=await f.login('doctor@example.test');await assert.rejects(f.store.register(r.sid),e=>e.status===409);assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM dc_identity_aliases').get().n,0);
 const newSession=await f.login('new@example.test'),user=await f.store.register(newSession.sid);assert.match(user.userId,/^dc:/);assert.equal((await f.store.current(newSession.sid)).user.userId,user.userId);
 const body=await (await f.api('/api/account',{},`${sessionCookie}=${r.sid}`)).json();assert.equal(body.user,null);
});
test('forged identity headers are stripped, cookie fixation and cross-site mutations are rejected',async t=>{
 const f=await setup(t);const fake=await f.api('/api/account',{},'',{'oai-authenticated-user-id':'doctor','oai-authenticated-user-email':'doctor@example.test'});assert.deepEqual(await fake.json(),{user:null,email:null});
 const r=await f.login('new@example.test');await f.store.register(r.sid);
 const res=await f.api('/auth/logout',{},`${sessionCookie}=${r.sid}`,{origin:'https://evil.test'});assert.equal(res.status,403);assert.ok((await f.store.current(r.sid)).user);
 assert.equal((await f.api('/api/account',{},`${sessionCookie}=${r.sid}; ${sessionCookie}=${r.sid}`)).status,200);assert.equal((await (await f.api('/api/account',{},`${sessionCookie}=${r.sid}; ${sessionCookie}=${r.sid}`)).json()).user,null);
});
test('refresh keeps identity, tokens are encrypted server-side, logout invalidates replay immediately',async t=>{
 const f=await setup(t),r=await f.login('new@example.test'),u=await f.store.register(r.sid),row=f.sql.prepare('SELECT * FROM dc_auth_sessions').get();assert.ok(!row.tokens_cipher.includes('synthetic'));f.advance(5*60000);assert.equal((await f.store.current(r.sid)).user.userId,u.userId);assert.equal(f.refreshes(),1);
 await f.store.logout(r.sid);await assert.rejects(f.store.current(r.sid));const request=await f.api('/api/account',{},`${sessionCookie}=${r.sid}`,{'oai-authenticated-user-id':'client'});assert.equal((await request.json()).user,null);
});
test('idle or absolute expiry, provider revocation, mapping disable and outages fail closed',async t=>{
 for(const scenario of ['idle','revoked','blocked','outage']){const f=await setup(t),r=await f.login('new'+scenario+'@example.test'),u=await f.store.register(r.sid);if(scenario==='idle')f.advance(3600001);if(scenario==='revoked')f.revoked.add((await f.store.current(r.sid)).subject);if(scenario==='blocked')f.sql.prepare("UPDATE dc_identity_principals SET state='blocked' WHERE id=?").run(u.userId);if(scenario==='outage')f.provider.authenticate=async()=>{throw new Error('offline');};await assert.rejects(f.store.current(r.sid));}
});
test('dual verified bridge proof binds the exact external subject and canonical old user, not their emails',async t=>{
 const f=await setup(t),r=await f.login('different-email@example.test');await f.connect();const proof=await f.legacyProof(r.sid);await assert.rejects(f.store.link(r.sid,proof,false));const linked=await f.store.link(r.sid,proof,true);assert.equal(linked.userId,client.userId);assert.equal(linked.email,client.email);await assert.rejects(f.store.link(r.sid,proof,true));
 const other=await f.login('other@example.test');await assert.rejects(f.store.link(other.sid,await f.legacyProof(r.sid),true));assert.equal((await f.store.current(other.sid)).user,null);
});
test('signed bridge rejects forgery, expired proof, wrong issuer/audience and switching an existing account',async t=>{
 const f=await setup(t),r=await f.login('new@example.test');for(const changes of [{iss:'evil'},{aud:'https://evil.test'},{exp:f.now()-1},{iat:f.now()+60000}])await assert.rejects(f.store.link(r.sid,await f.legacyProof(r.sid,'client',client.email,changes),true));await assert.rejects(f.store.link(r.sid,(await f.legacyProof(r.sid))+'x',true));const user=await f.store.register(r.sid);await assert.rejects(f.store.link(r.sid,await f.legacyProof(r.sid),true));assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM dc_legacy_link_receipts').get().n,0,'failed linking must not consume legacy proof');assert.equal((await f.store.current(r.sid)).user.userId,user.userId);
});
test('the legacy bridge requires old-runtime login plus a fresh signed external proof and explicit confirmation',async t=>{
 const f=await setup(t),r=await f.login('new@example.test');const current=await f.store.current(r.sid),start=await f.api('/auth/link/start',{},`${sessionCookie}=${r.sid}`),requestProof=(await start.json()).proof;let oldUser=null;const oldOrigin='https://old.example.test';const bridge=legacyLinkBridge({oldOrigin,standaloneOrigin:origin,legacyIssuer,externalPublicKey:f.externalPublic,legacyPrivateKey:f.legacyPrivate,getLegacyUser:async()=>oldUser,now:f.now});const request=()=>new Request(oldOrigin+'/link',{method:'POST',headers:{origin:oldOrigin},body:JSON.stringify({proof:requestProof,confirmed:true})});assert.equal((await bridge(request())).status,401);oldUser=client;const result=await bridge(request());assert.equal(result.status,200);assert.equal((await f.store.link(r.sid,(await result.json()).proof,true)).userId,client.userId);assert.notEqual(current.subject,client.userId);
});
test('verified old mapping preserves program, first workout, RPE/RIR recommendations, history and private object ownership',async t=>{
 const f=await setup(t);await f.connect();await f.training.savePlan(client.userId,{...defaultPrescription('goblet'),sets:2,reps:5,weight:100,targetRpe:8,effortScale:'rir'});
 const before=f.sql.prepare('SELECT * FROM user_consents WHERE user_id=? ORDER BY id').all(client.userId);const r=await f.login('new-email@example.test');const user=await f.store.link(r.sid,await f.legacyProof(r.sid),true);assert.deepEqual(f.sql.prepare('SELECT * FROM user_consents WHERE user_id=? ORDER BY id').all(user.userId),before);
 const invoke=async(sid,fn)=>f.gateway.handle(new Request(origin+'/api/training',{headers:{cookie:`${sessionCookie}=${sid}`}}),async req=>{const owner=req.headers.get('oai-authenticated-user-id');return Response.json(await fn(owner));});
 let s=await (await invoke(r.sid,owner=>f.training.start(owner,{requestId:randomUUID(),before:0}))).json();assert.equal(s.plannedSets,2);s=await (await invoke(r.sid,owner=>f.training.patch(owner,{id:s.id,version:s.version,action:'set',exerciseId:'goblet',setIndex:0,done:true,amount:5,weight:100,actualRpe:6}))).json();assert.equal(nextSetLoad(s.items[0],0,s).calculatedWeight,105.4);assert.ok(setEstimated1RM(s.items[0].results[0],s.items[0].unit)>100);
 s=await (await invoke(r.sid,owner=>f.training.patch(owner,{id:s.id,version:s.version,action:'set',exerciseId:'goblet',setIndex:1,done:true,amount:5,weight:105.4,actualRpe:8}))).json();s=await f.training.patch(user.userId,{id:s.id,version:s.version,action:'finish',after:0});assert.equal((await f.training.feed(user.userId)).stats.total,1);assert.equal((await f.training.feed(stranger.userId)).stats.total,0);
 const other=await f.login('other@example.test');const strangerUser=await f.store.register(other.sid);await assert.rejects(f.training.patch(strangerUser.userId,{id:s.id,version:s.version,action:'finish',after:0}));
 const video=randomUUID();f.sql.prepare("INSERT INTO media_assets(id,owner_id,kind,exercise_id,caption,mime,bytes,object_key,status,published,created_at) VALUES(?,?,'review','goblet','','video/mp4',10,'existing/private/object','ready',0,?)").run(video,user.userId,new Date().toISOString());assert.equal((await f.media.readable(user,video)).object_key,'existing/private/object');await assert.rejects(f.media.readable(strangerUser,video));
 assert.equal((await f.training.getPlan(user.userId))[0].effortScale,'rir');
});
test('sign-in response uses HttpOnly Secure host cookies and does not return provider tokens',async t=>{
 const f=await setup(t),sent=await f.api('/auth/send',{email:'new@example.test'}),c=sent.headers.get('set-cookie').split(';')[0],r=await f.api('/auth/verify',{code:'123456'},c),text=await r.text();assert.equal(r.status,200);assert.match(r.headers.get('set-cookie'),/HttpOnly; Secure; SameSite=Strict/);assert.ok(!text.includes('access_token'));assert.ok(!text.includes('refresh_token'));
 for(const path of ['//evil.test','/\\evil.test','/auth/logout','/signin-with-chatgpt'])assert.equal(safeReturn(path),'/');assert.equal(safeReturn('/#plan'),'/#plan');
});
test('session vault refuses tampering and ciphertext transplanted to another session',async()=>{
 const v=tokenVault(Buffer.alloc(32,9).toString('base64')),sealed=await v.seal({token:'private'},'a');assert.deepEqual(await v.open(sealed,'a'),{token:'private'});await assert.rejects(v.open(sealed,'b'));await assert.rejects(v.open(sealed.slice(0,-2)+'XX','a'));
});
test('real Supabase HTTP adapter verifies user and live session, rejects forged signature at the provider',async()=>{
 const time=Date.now(),project='https://auth.example.test',subject=randomUUID(),sid=randomUUID(),claims={iss:project+'/auth/v1',sub:subject,session_id:sid,aud:'authenticated',role:'authenticated',is_anonymous:false,iat:Math.floor(time/1000),exp:Math.floor(time/1000)+300,amr:[{method:'otp',timestamp:Math.floor(time/1000)}]},token=[{alg:'ES256'},claims].map(x=>Buffer.from(JSON.stringify(x)).toString('base64url')).concat('signed').join('.');let active=true;const calls=[];
 const http=async(url,init)=>{calls.push([String(url),JSON.parse(init.body??'{}')]);if(String(url).endsWith('/auth/v1/verify'))return Response.json({access_token:token,refresh_token:'synthetic-refresh',expires_in:300});if(String(url).endsWith('/auth/v1/user'))return init.headers.Authorization===`Bearer ${token}`?Response.json({id:subject,email:'new@example.test',is_anonymous:false,email_confirmed_at:new Date(time-1000).toISOString()}):new Response('',{status:401});if(String(url).includes('/rpc/'))return Response.json(active);return Response.json({});};
 const p=supabaseProvider(project,'sb_publishable_synthetic',http,()=>time);const t=await p.verify('new@example.test','123456');assert.equal((await p.authenticate(t.access_token)).claims.subject,subject);assert.ok(calls.some(([u])=>u.includes('doctorcoach_staging_session_active')));active=false;assert.equal(await p.authenticate(t.access_token),null);assert.equal(await p.authenticate(token+'x'),null);assert.equal(calls[0][1].type,'email');
});
test('concurrent refresh claims at most one refresh token and a logout during refresh cannot resurrect a session',async t=>{
 const f=await setup(t),r=await f.login('new@example.test');await f.store.register(r.sid);f.advance(5*60000);const both=await Promise.allSettled([f.store.current(r.sid),f.store.current(r.sid)]);assert.equal(f.refreshes(),1);assert.ok(both.every(x=>x.status==='fulfilled'));
 f.advance(5*60000);const refresh=f.provider.refresh;f.provider.refresh=async token=>{await f.store.logout(r.sid);return refresh(token);};await assert.rejects(f.store.current(r.sid));assert.ok(f.sql.prepare('SELECT revoked_at FROM dc_auth_sessions').get().revoked_at);
});
test('absolute session expiry and same-origin requirements apply to existing API writes',async t=>{
 const f=await setup(t),r=await f.login('new@example.test');await f.store.register(r.sid);const res=await f.api('/api/program',{},`${sessionCookie}=${r.sid}`,{origin:'https://evil.test'});assert.equal(res.status,403);f.sql.prepare('UPDATE dc_auth_sessions SET expires_at=?').run(f.now());await assert.rejects(f.store.current(r.sid));
});
test('temporary provider outage denies private APIs with retryable 503 without destroying the session',async t=>{
 const f=await setup(t),r=await f.login('new@example.test');await f.store.register(r.sid);const original=f.provider.authenticate;f.provider.authenticate=async()=>{const e=new Error('unavailable');e.status=503;throw e;};assert.equal((await f.api('/api/account',{},`${sessionCookie}=${r.sid}`)).status,503);f.provider.authenticate=original;assert.ok((await f.store.current(r.sid)).user);
});
test('Supabase redirect responses are rejected without forwarding credentials to another host',async()=>{
 let options;const provider=supabaseProvider('https://auth.example.test','sb_publishable_synthetic',async(url,init)=>{options=init;return new Response(null,{status:302,headers:{Location:'https://attacker.test'}});});await assert.rejects(provider.send('new@example.test'));assert.equal(options.redirect,'manual');
});

test('account-link preview validates both owners without changing mappings or consuming proof',async t=>{
 const f=await setup(t),r=await f.login('different-email@example.test'),proof=await f.legacyProof(r.sid);
 const before=f.sql.prepare('SELECT COUNT(*) n FROM dc_identity_aliases').get().n;
 const preview=await f.api('/auth/link/inspect',{proof},`${sessionCookie}=${r.sid}`);
 assert.equal(preview.status,200);assert.deepEqual(await preview.json(),{existingEmail:client.email,signInEmail:'different-email@example.test'});
 assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM dc_identity_aliases').get().n,before);
 assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM dc_legacy_link_receipts').get().n,0);
 const other=await f.login('other@example.test');assert.equal((await f.api('/auth/link/inspect',{proof},`${sessionCookie}=${other.sid}`)).status,403);
 assert.equal((await f.api('/auth/link',{proof,confirmed:false},`${sessionCookie}=${r.sid}`)).status,400);
 assert.equal((await f.api('/auth/link',{proof,confirmed:true},`${sessionCookie}=${r.sid}`)).status,200);
 assert.equal((await f.store.current(r.sid)).user.userId,client.userId);
 assert.equal((await f.api('/auth/link/inspect',{proof},`${sessionCookie}=${r.sid}`)).status,409);
});
test('guided handoff is disabled until bridge configuration exists; enabled handoff uses fragment only',async t=>{
 const f=await setup(t),r=await f.login('new@example.test'),cookie=`${sessionCookie}=${r.sid}`;
 const status=await (await f.api('/auth/status',{},cookie)).json();assert.equal(status.linkingReady,false);assert.equal(status.canRegister,true);
 assert.equal((await (await f.api('/auth/link/start',{},cookie)).json()).handoffUrl,undefined);
 const gateway=authGateway(f.db,f.provider,{...f.settings,legacyLinkUrl:'https://old.example.test/account/migrate'});
 const res=await gateway.handle(new Request(origin+'/auth/link/start',{method:'POST',headers:{origin,'Content-Type':'application/json',cookie},body:'{}'}),async()=>new Response());
 const body=await res.json(),url=new URL(body.handoffUrl);assert.equal(url.origin,'https://old.example.test');assert.equal(url.search,'');assert.equal(new URLSearchParams(url.hash.slice(1)).get('request'),body.proof);
 for(const legacyLinkUrl of ['http://old.example.test/link','https://evil@old.example.test/link','https://old.example.test/link?identity=foo',origin+'/link'])assert.throws(()=>authGateway(f.db,f.provider,{...f.settings,legacyLinkUrl}));
});
test('old-runtime inspection signs nothing until explicit confirmation and authenticates the old owner',async t=>{
 const f=await setup(t),r=await f.login('new@example.test'),proof=(await (await f.api('/auth/link/start',{},`${sessionCookie}=${r.sid}`)).json()).proof;
 let oldUser=null;const oldOrigin='https://old.example.test',bridge=legacyLinkBridge({oldOrigin,standaloneOrigin:origin,legacyIssuer,externalPublicKey:f.externalPublic,legacyPrivateKey:f.legacyPrivate,getLegacyUser:async()=>oldUser,now:f.now});
 const request=body=>new Request(oldOrigin+'/account/migrate',{method:'POST',headers:{origin:oldOrigin,'Content-Type':'application/json'},body:JSON.stringify(body)});
 assert.equal((await bridge(request({action:'inspect',proof}))).status,401);oldUser=client;
 const inspection=await bridge(request({action:'inspect',proof}));assert.deepEqual(await inspection.json(),{existingEmail:client.email,signInEmail:'new@example.test'});
 assert.equal((await bridge(request({proof,confirmed:false}))).status,403);
 assert.equal((await bridge(new Request(oldOrigin+'/account/migrate'))).status,200);
 assert.equal((await bridge(new Request('https://attacker.test/account/migrate'))).status,403);
 f.advance(300001);assert.equal((await bridge(request({action:'inspect',proof}))).status,403);
});

test('link receipt storage failure rolls back the mapping and the same proof can be retried',async t=>{
 const f=await setup(t),r=await f.login('retry@example.test'),proof=await f.legacyProof(r.sid);
 f.sql.exec("CREATE TRIGGER fail_legacy_receipt BEFORE INSERT ON dc_legacy_link_receipts BEGIN SELECT RAISE(ABORT,'synthetic storage failure'); END");
 await assert.rejects(f.store.link(r.sid,proof,true));
 assert.equal((await f.store.current(r.sid)).user,null,'failed link must not leave a usable identity alias');
 assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM dc_legacy_link_receipts').get().n,0);
 f.sql.exec('DROP TRIGGER fail_legacy_receipt');
 assert.equal((await f.store.link(r.sid,proof,true)).userId,client.userId);
 await assert.rejects(f.store.link(r.sid,proof,true));
});

test('concurrent submission of the same legacy proof has one winner and one receipt',async t=>{
 const f=await setup(t),r=await f.login('parallel@example.test'),proof=await f.legacyProof(r.sid);
 const results=await Promise.allSettled([f.store.link(r.sid,proof,true),f.store.link(r.sid,proof,true)]);
 assert.equal(results.filter(x=>x.status==='fulfilled').length,1);
 assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM dc_legacy_link_receipts').get().n,1);
 assert.equal((await f.store.current(r.sid)).user.userId,client.userId);
});

test('registration storage failure leaves no orphan identity and allows retry',async t=>{
 const f=await setup(t),r=await f.login('register-retry@example.test');
 f.sql.exec("CREATE TRIGGER fail_new_details BEFORE INSERT ON dc_identity_details WHEN NEW.legacy=0 BEGIN SELECT RAISE(ABORT,'synthetic storage failure'); END");
 await assert.rejects(f.store.register(r.sid));
 assert.equal((await f.store.current(r.sid)).user,null);
 assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM dc_identity_principals').get().n,0);
 f.sql.exec('DROP TRIGGER fail_new_details');
 const user=await f.store.register(r.sid);assert.match(user.userId,/^dc:/);
 assert.equal((await f.store.current(r.sid)).user.userId,user.userId);
});

test('concurrent registration returns one complete principal and matching details',async t=>{
 const f=await setup(t),r=await f.login('register-race@example.test');
 const users=await Promise.all([f.store.register(r.sid),f.store.register(r.sid)]);
 assert.equal(users[0].userId,users[1].userId);
 assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM dc_identity_principals').get().n,1);
 assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM dc_identity_details').get().n,1);
});

test('refresh can resume only the current unconsumed OTP challenge without creating a session',async t=>{
 const f=await setup(t),sent=await f.api('/auth/send',{email:'resume@example.test'}),challenge=sent.headers.get('set-cookie').split(';')[0];
 const pending=await f.api('/auth/pending',{},challenge);
 assert.equal(pending.status,200);assert.match(pending.headers.get('cache-control'),/no-store/);
 assert.deepEqual(await pending.json(),{pending:true,email:'resume@example.test',resendAt:f.now()+60000});
 assert.deepEqual(await (await f.api('/auth/pending')).json(),{pending:false});
 assert.deepEqual(await (await f.api('/auth/pending',{},challengeCookie+'=forged')).json(),{pending:false});
 assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM dc_auth_sessions').get().n,0);
 await f.api('/auth/verify',{code:'123456'},challenge);
 assert.deepEqual(await (await f.api('/auth/pending',{},challenge)).json(),{pending:false});
});
test('expired or exhausted OTP challenges cannot restore the code screen',async t=>{
 const f=await setup(t),c=await f.store.send('expired-resume@example.test','ip');
 for(let n=0;n<5;n++)await assert.rejects(f.store.verify(c.challenge,'999999'));
 assert.deepEqual(await (await f.api('/auth/pending',{},challengeCookie+'='+c.challenge)).json(),{pending:false});
 const fresh=await f.store.send('fresh-resume@example.test','ip');f.advance(600001);
 assert.deepEqual(await (await f.api('/auth/pending',{},challengeCookie+'='+fresh.challenge)).json(),{pending:false});
 assert.equal((await f.api('/auth/pending',{},'',{origin:'https://other.test'})).status,403);
});

test('legacy auth redirects and sign-in language switches retain language and safe return routes',async t=>{
 const f=await setup(t),next=async()=>new Response('missing');
 for(const lang of ['en','he'])for(const action of ['signin','signout']){
  const r=await f.gateway.handle(new Request(origin+'/'+action+'-with-chatgpt?lang='+lang+'&return_to=%2F%23settings'),next);
  const url=new URL(r.headers.get('location'));
  assert.equal(url.pathname,'/auth/'+action);assert.equal(url.searchParams.get('lang'),lang);assert.equal(url.searchParams.get('return_to'),'/?lang='+lang+'#settings');
  const page=await f.gateway.handle(new Request(origin+'/auth/'+action+'?lang='+lang+'&return_to='+encodeURIComponent('/?lang='+(lang==='en'?'he':'en')+'#settings')),next);
  const html=await page.text();assert.ok(html.includes('lang="'+lang+'"'));assert.ok(html.includes('/?lang='+lang+'#settings'));
 }
 const unsafe=await f.gateway.handle(new Request(origin+'/signin-with-chatgpt?lang=en&return_to=https%3A%2F%2Fevil.test'),next);
 assert.equal(new URL(unsafe.headers.get('location')).searchParams.get('return_to'),'/?lang=en');
});
