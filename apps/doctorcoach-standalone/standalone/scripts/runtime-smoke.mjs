// Built standalone Worker + local D1/R2. All provider traffic is synthetic.
// This script cannot send email, access production or deploy anything.
import {createRequire} from 'node:module';
import {realpathSync} from 'node:fs';
import {readFile,readdir} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import path from 'node:path';
import assert from 'node:assert/strict';
import {signLink} from '../crypto.ts';
const root=new URL('../../',import.meta.url).pathname;
const require=createRequire(realpathSync(path.join(root,'node_modules/@cloudflare/vite-plugin/package.json')));
const {Miniflare}=require('miniflare');
const origin='https://staging.example.test',project='https://auth.example.test';
const identities=new Map(),tokens=new Map(),refreshTokens=new Map(),used=new Set(),revoked=new Set();
let serial=0,refreshCount=0;
const legacyKeys=await crypto.subtle.generateKey('Ed25519',true,['sign','verify']);
const legacyPrivate=await crypto.subtle.exportKey('jwk',legacyKeys.privateKey);
const legacyPublic=await crypto.subtle.exportKey('jwk',legacyKeys.publicKey);
function mint(email,first=false){
 let identity=identities.get(email);
 if(!identity){identity={subject:randomUUID(),sid:randomUUID(),primary:Math.floor(Date.now()/1000)};identities.set(email,identity);}
 const at=Math.floor(Date.now()/1000),token=[{alg:'ES256'},{iss:project+'/auth/v1',sub:identity.subject,session_id:identity.sid,aud:'authenticated',role:'authenticated',is_anonymous:false,iat:at,exp:at+300,amr:[{method:'otp',timestamp:identity.primary}]}].map(v=>Buffer.from(JSON.stringify(v)).toString('base64url')).concat('synthetic-'+(++serial)).join('.');
 tokens.set(token,{...identity,email});const refresh='synthetic-refresh-'+serial;refreshTokens.set(refresh,email);
 return {access_token:token,refresh_token:refresh,expires_in:first?1:300};
}
async function modules(dir){const result=[];for(const entry of await readdir(dir,{withFileTypes:true})){const full=path.join(dir,entry.name);if(entry.isDirectory())result.push(...await modules(full));else if(/\.m?js$/.test(entry.name))result.push({type:'ESModule',path:full});}return result;}
const entries=await modules(path.join(root,'dist/server'));
entries.sort((a,b)=>a.path===path.join(root,'dist/server/index.js')?-1:b.path===path.join(root,'dist/server/index.js')?1:a.path.localeCompare(b.path));
const mf=new Miniflare({modules:entries,modulesRoot:path.join(root,'dist/server'),compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],r2Buckets:['BUCKET'],bindings:{DC_AUTH_ORIGIN:origin,DC_SUPABASE_URL:project,DC_SUPABASE_PUBLIC_KEY:'sb_publishable_synthetic',DC_SESSION_KEY:Buffer.alloc(32,7).toString('base64'),DC_LEGACY_ISSUER:'sites:synthetic-old',DC_NEW_ACCOUNTS_ENABLED:'true',DC_LEGACY_PUBLIC_JWK:JSON.stringify(legacyPublic),DOCTORCOACH_ADMIN_EMAILS:'doctor@example.test',DOCTORCOACH_CLINICIAN_EMAILS:'doctor@example.test'},outboundService:async req=>{
 const url=new URL(req.url);assert.equal(url.origin,project);
 if(url.pathname==='/auth/v1/otp')return Response.json({});
 if(url.pathname==='/auth/v1/verify'){const body=await req.json();if(body.token!=='123456'||used.has(body.email))return Response.json({error:'invalid'},{status:401});used.add(body.email);return Response.json(mint(body.email,true));}
 if(url.pathname==='/auth/v1/token'){const body=await req.json(),email=refreshTokens.get(body.refresh_token);if(!email)return Response.json({}, {status:401});refreshCount++;refreshTokens.delete(body.refresh_token);return Response.json(mint(email));}
 const identity=tokens.get((req.headers.get('authorization')??'').slice(7));
 if(url.pathname==='/auth/v1/user')return identity&&!revoked.has(identity.sid)?Response.json({id:identity.subject,email:identity.email,is_anonymous:false,email_confirmed_at:new Date().toISOString()}):Response.json({}, {status:401});
 if(url.pathname.includes('/rpc/'))return Response.json(!!identity&&!revoked.has(identity.sid));
 if(url.pathname==='/auth/v1/logout'){if(identity)revoked.add(identity.sid);return Response.json({});}
 return Response.json({}, {status:404});
}});
try{
 const db=await mf.getD1Database('DB'),bucket=await mf.getR2Bucket('BUCKET');
 const migrations=(await readdir(path.join(root,'drizzle'))).filter(x=>/^\d.*\.sql$/.test(x)).sort();
 const sqlLine=sql=>sql.replaceAll('--> statement-breakpoint','').split('\n').filter(x=>!x.trim().startsWith('--')).join(' ');
 for(const name of migrations)await db.exec(sqlLine(await readFile(path.join(root,'drizzle',name),'utf8')));
 await db.exec(sqlLine(await readFile(path.join(root,'standalone/migrations/0001_identity.sql'),'utf8')));
 let cookies='';
 const request=async(url,body,headers={},method=body?'POST':'GET')=>{
  const r=await mf.dispatchFetch(origin+url,{method,headers:{...(body?{origin,'Content-Type':'application/json'}:{}),cookie:cookies,...headers},body:body?JSON.stringify(body):undefined});
  for(const c of r.headers.getSetCookie()){const pair=c.split(';')[0],key=pair.split('=')[0];cookies=cookies.split('; ').filter(x=>x&&!x.startsWith(key+'=')).concat(pair).join('; ');}
  return r;
 };
 const json=async(url,body,method)=>{const r=await request(url,body,{},method),value=await r.json();assert.equal(r.status,200,url+': '+JSON.stringify(value));return value;};
 assert.equal((await request('/auth/signin')).status,200);
 assert.equal((await (await request('/api/account',undefined,{'oai-authenticated-user-id':'doctor','oai-authenticated-user-email':'doctor@example.test'})).json()).signedIn,false);
 await json('/auth/send',{email:'first@example.test'});
 assert.equal((await request('/auth/verify',{code:'999999'})).status,401);
 assert.equal((await json('/auth/verify',{code:'123456'})).linked,false);
 await json('/auth/register',{confirmed:true});
 const firstCookies=cookies,account=await json('/api/account');
 assert.equal(account.signedIn,true);assert.equal(account.canManageServices,false);assert.equal(account.careRole,null);assert.ok(refreshCount>=1);
 const owner=(await db.prepare('SELECT principal_id FROM dc_identity_aliases WHERE subject=?').bind(identities.get('first@example.test').subject).first()).principal_id;
 const at=new Date().toISOString(),revision='2026-09-28.1';
 for(const id of ['terms','privacy','health','team','media'])await db.prepare('INSERT INTO user_consents(id,user_id,consent_id,revision,accepted,created_at) VALUES(?,?,?,?,1,?)').bind(randomUUID(),owner,id,revision,at).run();
 await db.prepare("INSERT INTO user_intakes(user_id,answers_json,completed,created_at,updated_at) VALUES(?,'{}',1,?,?)").bind(owner,at,at).run();
 await db.prepare("INSERT INTO training_access(user_id,mode,self_until,updated_at) VALUES(?,'self',?,?)").bind(owner,new Date(Date.now()+86400000).toISOString(),at).run();
 await json('/api/program',{exerciseId:'goblet',sets:2,reps:5,weight:100,targetRpe:8,effortScale:'rir',unit:'reps',notes:''});
 let session=(await json('/api/training',{requestId:randomUUID(),before:0})).session;
 assert.equal(session.plannedSets,2);
 session=(await json('/api/training',{action:'set',id:session.id,version:session.version,exerciseId:'goblet',setIndex:0,done:true,amount:5,weight:100,actualRpe:6},'PATCH')).session;
 session=(await json('/api/training',{action:'nextLoad',id:session.id,version:session.version,exerciseId:'goblet',setIndex:0,step:2.5},'PATCH')).session;
 assert.equal(session.items[0].results[1].weight,105);
 session=(await json('/api/training',{action:'set',id:session.id,version:session.version,exerciseId:'goblet',setIndex:1,done:true,amount:5,weight:105,actualRpe:8},'PATCH')).session;
 session=(await json('/api/training',{action:'finish',id:session.id,version:session.version,after:0},'PATCH')).session;
 assert.equal((await json('/api/training')).history[0].id,session.id);
 assert.equal((await json('/api/program')).items[0].effortScale,'rir');
 const video=randomUUID(),videoKey='preserved/private/video',videoBytes=new Uint8Array([0,255,1,2,3,0,4]);
 await db.prepare("INSERT INTO media_assets(id,owner_id,kind,exercise_id,caption,mime,bytes,object_key,status,published,created_at) VALUES(?,?,'review','goblet','','video/mp4',?,?,'ready',0,?)").bind(video,owner,videoBytes.length,videoKey,at).run();
 await bucket.put(videoKey,videoBytes,{httpMetadata:{contentType:'video/mp4'},customMetadata:{fixture:'private'}});
 let download=await request('/api/media/'+video);assert.equal(download.status,200);assert.deepEqual(new Uint8Array(await download.arrayBuffer()),videoBytes);assert.equal(download.headers.get('cache-control'),'private, no-store');
 const document=randomUUID(),docKey='preserved/private/report',pdf=new TextEncoder().encode('%PDF-1.4\nSynthetic private report');
 await db.prepare("INSERT INTO private_documents(id,client_id,uploader_id,uploader_name,purpose,channel,category,filename,mime,bytes,object_key,status,created_at) VALUES(?,?,?,'Synthetic','medical','','other','report.pdf','application/pdf',?,?,'ready',?)").bind(document,owner,owner,pdf.length,docKey,at).run();
 await bucket.put(docKey,pdf,{httpMetadata:{contentType:'application/pdf'},customMetadata:{fixture:'private'}});
 download=await request('/api/documents/'+document);assert.equal(download.status,200);assert.deepEqual(new Uint8Array(await download.arrayBuffer()),pdf);
 cookies='';await json('/auth/send',{email:'second@example.test'});await json('/auth/verify',{code:'123456'});await json('/auth/register',{confirmed:true});
 assert.equal((await json('/api/training')).stats.total,0);
 assert.ok([403,404].includes((await request('/api/media/'+video)).status));
 assert.ok([403,404].includes((await request('/api/documents/'+document)).status));
 assert.ok([403,404].includes((await request('/api/training',{action:'finish',id:session.id,version:session.version,after:0},{},'PATCH')).status));

 // Verify the real built routes with independently signed legacy ownership and
 // two separate coach/client pairs. All rows and signing keys are ephemeral.
 const secondOwner=(await db.prepare('SELECT principal_id FROM dc_identity_aliases WHERE subject=?').bind(identities.get('second@example.test').subject).first()).principal_id;
 const secondCookies=cookies;
 for(const id of [owner,secondOwner]){
  await db.prepare("INSERT INTO care_profiles(user_id,name,goal,experience,equipment,days,medical_json,updated_at) VALUES(?,'Synthetic trainee','Strength','Beginner','Weights',3,?,?)").bind(id,JSON.stringify({medicalHistory:'SYNTHETIC MEDICAL SECRET'}),at).run();
  for(const consent of ['terms','privacy','health','team','media'])await db.prepare('INSERT OR IGNORE INTO user_consents(id,user_id,consent_id,revision,accepted,created_at) VALUES(?,?,?,?,1,?)').bind('runtime-'+id+'-'+consent,id,consent,revision,at).run();
 }
 const linkedLogin=async(email,principal)=>{
  cookies='';await json('/auth/send',{email});await json('/auth/verify',{code:'123456'});
  assert.equal((await request('/auth/register',{confirmed:true})).status,409,'staff email cannot self-register');
  const time=Date.now(),proof=await signLink({iss:'sites:synthetic-old',aud:origin,sub:principal,target:identities.get(email).subject,email,nonce:randomUUID()+randomUUID(),iat:time,exp:time+300000},legacyPrivate);
  await json('/auth/link/inspect',{proof});await json('/auth/link',{proof,confirmed:true});
  assert.equal((await request('/auth/link',{proof,confirmed:true})).status,409,'link proof cannot be replayed');
  return cookies;
 };
 for(const email of ['coach-a@example.test','coach-b@example.test'])await db.prepare("INSERT INTO care_staff(email,name,role,active,updated_at) VALUES(?,?,'coach',1,?)").bind(email,email,at).run();
 const coachACookies=await linkedLogin('coach-a@example.test','legacy-coach-a');
 const coachBCookies=await linkedLogin('coach-b@example.test','legacy-coach-b');
 const doctorCookies=await linkedLogin('doctor@example.test','legacy-doctor');
 const connect=async(clientId,email,medical=0)=>db.prepare("INSERT INTO care_connections(id,client_id,staff_email,medical_access,nutrition_access,created_at,scope) VALUES(?,?,?,?,0,?,'care')").bind(randomUUID(),clientId,email,medical,at).run();
 await connect(owner,'coach-a@example.test');await connect(secondOwner,'coach-b@example.test');await connect(owner,'doctor@example.test',1);
 await db.prepare("INSERT INTO care_notes(id,client_id,author_id,author_name,kind,content,shared,created_at) VALUES(?,?,'legacy-doctor','Synthetic doctor','medical','SYNTHETIC PRIVATE NOTE',0,?)").bind(randomUUID(),owner,at).run();
 cookies=doctorCookies;
 assert.equal((await json('/api/account')).canManageServices,true);
 assert.equal((await json('/api/care/team?client='+encodeURIComponent(owner))).canViewMedical,true);
 assert.equal((await request('/api/documents/'+document)).status,200);
 cookies=coachACookies;
 assert.equal((await json('/api/account')).careRole,'coach');
 const roster=await json('/api/care/team');assert.deepEqual(roster.clients.map(c=>c.userId),[owner]);
 const visible=await json('/api/care/team?client='+encodeURIComponent(owner));
 assert.equal(visible.canViewMedical,false);assert.equal(Object.hasOwn(visible.profile,'medical'),false);
 assert.ok(!JSON.stringify(visible).includes('SYNTHETIC MEDICAL SECRET'));assert.ok(!JSON.stringify(visible).includes('SYNTHETIC PRIVATE NOTE'));
 assert.equal((await request('/api/media/'+video)).status,200);
 assert.equal((await request('/api/documents/'+document)).status,403);
 assert.equal((await request('/api/care/team',{action:'staff',email:'rogue@example.test',name:'Rogue',role:'clinician',active:true})).status,403);
 const coachHistory=JSON.stringify(await json('/api/progress?client='+encodeURIComponent(owner)));
 assert.ok(coachHistory.length>0);
 for(const [viewer,target] of [[coachACookies,secondOwner],[coachBCookies,owner]]){
  cookies=viewer;
  assert.equal((await request('/api/care/team?client='+encodeURIComponent(target))).status,403);
  assert.equal((await request('/api/progress?client='+encodeURIComponent(target))).status,403);
  for(const action of ['note','assign'])assert.equal((await request('/api/care/team',{action,clientId:target,id:randomUUID(),kind:'training',content:'Forbidden',shared:true,title:'Forbidden program',items:[]})).status,403);
 }
 cookies=coachBCookies;assert.equal((await request('/api/media/'+video)).status,403);
 cookies=secondCookies;assert.equal((await request('/api/care/team')).status,403);
 cookies=coachACookies;
 await db.prepare("UPDATE care_connections SET active=0 WHERE client_id=? AND staff_email='coach-a@example.test'").bind(owner).run();
 assert.equal((await request('/api/media/'+video)).status,403);
 assert.equal((await request('/api/care/team?client='+encodeURIComponent(owner))).status,403);
 assert.equal((await request('/api/progress?client='+encodeURIComponent(owner))).status,403);
 cookies=firstCookies;assert.equal((await request('/api/media/'+video)).status,200);
 assert.equal((await json('/api/training')).history[0].id,session.id,'role/link tests preserve completed workout');
 console.log('PASS: built HTTP legacy account linking, replay denial, reserved staff registration denial, trainee/coach/doctor/admin roles, independent coach rosters, cross-coach read/write/progress denial, medical redaction, private media permissions and immediate revocation.');

 // Exercise actual D1 rollback, not only the SQLite test adapter.
 cookies='';await json('/auth/send',{email:'rollback@example.test'});await json('/auth/verify',{code:'123456'});
 await db.exec("CREATE TRIGGER runtime_fail_registration BEFORE INSERT ON dc_identity_details WHEN NEW.legacy=0 BEGIN SELECT RAISE(ABORT,'synthetic registration failure'); END;");
 assert.notEqual((await request('/auth/register',{confirmed:true})).status,200);
 assert.equal((await json('/auth/status',{})).linked,false);
 assert.equal((await db.prepare('SELECT COUNT(*) n FROM dc_identity_aliases WHERE subject=?').bind(identities.get('rollback@example.test').subject).first()).n,0);
 await db.exec('DROP TRIGGER runtime_fail_registration;');
 await json('/auth/register',{confirmed:true});assert.equal((await json('/auth/status',{})).linked,true);
 cookies='';await json('/auth/send',{email:'link-rollback@example.test'});await json('/auth/verify',{code:'123456'});
 const linkTime=Date.now(),retryProof=await signLink({iss:'sites:synthetic-old',aud:origin,sub:'legacy-rollback',target:identities.get('link-rollback@example.test').subject,email:'link-rollback@example.test',nonce:randomUUID()+randomUUID(),iat:linkTime,exp:linkTime+300000},legacyPrivate);
 await db.exec("CREATE TRIGGER runtime_fail_link BEFORE INSERT ON dc_legacy_link_receipts BEGIN SELECT RAISE(ABORT,'synthetic link failure'); END;");
 assert.notEqual((await request('/auth/link',{proof:retryProof,confirmed:true})).status,200);
 assert.equal((await json('/auth/status',{})).linked,false);
 await db.exec('DROP TRIGGER runtime_fail_link;');
 await json('/auth/link',{proof:retryProof,confirmed:true});assert.equal((await json('/auth/status',{})).linked,true);
 console.log('PASS: actual local D1 registration/link storage failures roll back external identities and permit safe retries.');
 cookies=firstCookies;await json('/auth/refresh',{});const beforeLogout=cookies;await json('/auth/logout',{});cookies=beforeLogout;
 assert.equal((await request('/auth/status',{})).status,401);assert.equal((await json('/api/account')).signedIn,false);
 console.log('PASS: built workerd HTTP sign-in, wrong OTP, registration, provider token refresh, spoofed headers, first workout, RIR, next-set load, history, private PDF/video bytes, authenticated cross-user isolation and logout replay. Provider is SYNTHETIC, not real email delivery.');
}finally{await mf.dispose();}
