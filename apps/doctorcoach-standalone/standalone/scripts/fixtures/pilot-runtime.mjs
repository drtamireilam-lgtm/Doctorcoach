import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {realpathSync} from 'node:fs';
import {readFile,readdir,stat} from 'node:fs/promises';
import {randomUUID,createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {CONSENT_REVISION} from '../../../lib/intake.ts';
import {googleCalendarStore,CALENDAR_SCOPE} from '../../../lib/google-calendar.ts';

const root=fileURLToPath(new URL('../../../',import.meta.url));
const require=createRequire(realpathSync(path.join(root,'node_modules/@cloudflare/vite-plugin/package.json')));
const {Miniflare}=require('miniflare');
const sqlLine=sql=>sql.replaceAll('--> statement-breakpoint','').split('\n').filter(x=>!x.trim().startsWith('--')).join(' ');
const mime={'.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2','.ico':'image/x-icon','.glb':'model/gltf-binary'};
async function modules(dir){const out=[];for(const e of await readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())out.push(...await modules(p));else if(/\.m?js$/.test(e.name))out.push({type:'ESModule',path:p});}return out;}

export async function pilotRuntime(){
 // Calendar validates an allowlisted origin even in local tests. All requests
 // are dispatched to Miniflare or intercepted built assets, never this host.
 const origin='https://doctorcoach-isolated-staging.dr-tamireilam.workers.dev';let mf,options;
 const calendarBindings={DOCTORCOACH_CALENDAR_ID:'synthetic@group.calendar.google.com',DOCTORCOACH_CALENDAR_CLIENT_ID:'synthetic-client',DOCTORCOACH_CALENDAR_OWNER_EMAIL:'owner@example.test',DOCTORCOACH_CALENDAR_ENCRYPTION_KEY:Buffer.alloc(32,19).toString('base64url')};
 try{
  const entries=await modules(path.join(root,'dist/server'));entries.sort((a,b)=>a.path===path.join(root,'dist/server/index.js')?-1:b.path===path.join(root,'dist/server/index.js')?1:a.path.localeCompare(b.path));
  options={modules:entries,modulesRoot:path.join(root,'dist/server'),compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],r2Buckets:['BUCKET'],bindings:{DC_AUTH_ORIGIN:origin,DC_SUPABASE_URL:'https://auth.example.test',DC_SUPABASE_PUBLIC_KEY:'sb_publishable_synthetic',DC_SESSION_KEY:Buffer.alloc(32,7).toString('base64'),DC_LEGACY_ISSUER:'synthetic:pilot',DC_NEW_ACCOUNTS_ENABLED:'true',DC_USER_MANAGEMENT_ENABLED:'true',DOCTORCOACH_ADMIN_EMAILS:'owner@example.test',DOCTORCOACH_CLINICIAN_EMAILS:'owner@example.test',...calendarBindings},outboundService:'pilot-providers'};
  // Async test-control service avoids synchronous D1 proxy calls blocking the
  // Node thread that must answer the app's concurrent synthetic provider calls.
  const main={...options,name:'pilot-app',d1Databases:{DB:'pilot-disposable-db'}};
  const control={name:'pilot-local-control',modules:true,d1Databases:{DB:'pilot-disposable-db'},script:`export default {async fetch(req,env){try{const {kind,sql,args=[]}=await req.json();const value=kind==='exec'?await env.DB.exec(sql):await env.DB.prepare(sql).bind(...args)[kind]();return Response.json({value});}catch(error){return Response.json({error:String(error)},{status:500});}}}`};
  const fixtureRoot=fileURLToPath(new URL('./',import.meta.url));
  const providerWorker={name:'pilot-providers',bindings:{SYNTHETIC_CALENDAR_SCOPE:CALENDAR_SCOPE},modulesRoot:fixtureRoot,compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],modules:['pilot-providers.mjs','synthetic-auth-provider.mjs'].map(name=>({type:'ESModule',path:path.join(fixtureRoot,name)}))};
  options={host:'127.0.0.1',port:0,workers:[main,control,providerWorker]};
  mf=new Miniflare(options);
  console.error('PILOT setup: disposable Worker started; initializing local schema');
  let startupTimer;
  try{await Promise.race([mf.ready,new Promise((_,reject)=>{startupTimer=setTimeout(()=>reject(Error('Disposable Worker readiness timed out after 30000ms')),30000);})]);}finally{clearTimeout(startupTimer);}
  console.error('PILOT setup: Worker ready');
  let db=await mf.getD1Database('DB','pilot-app');
  console.error('PILOT setup: local D1 handle acquired');
  for(const name of (await readdir(path.join(root,'drizzle'))).filter(x=>/^\d.*\.sql$/.test(x)).sort()){await db.exec(sqlLine(await readFile(path.join(root,'drizzle',name),'utf8')));console.error('PILOT schema:',name);}
  for(const name of ['0001_identity.sql','0002_user_management.sql','0003_trainee_guidance.sql'])await db.exec(sqlLine(await readFile(path.join(root,'standalone/migrations',name),'utf8')));
  console.error('PILOT setup: local schema ready; seeding synthetic identities');
  const providerService=await mf.getWorker('pilot-providers'),providerFetch=providerService.fetch.bind(providerService);
  const providerControl=async(action,body={})=>(await providerFetch('https://pilot-fixture-control/',{method:'POST',body:JSON.stringify({action,...body})})).json();
  const provider={codeFor:email=>providerControl('code',{email})};
  const identities={owner:{id:'synthetic-owner',email:'owner@example.test',role:'physician'},coach:{id:'synthetic-coach',email:'coach@example.test',role:'coach'},coachB:{id:'synthetic-coach-b',email:'coach-b@example.test',role:'coach'},a:{id:'synthetic-trainee-a',email:'trainee-a@example.test',role:'trainee'},b:{id:'synthetic-trainee-b',email:'trainee-b@example.test',role:'trainee'},secretary:{id:'synthetic-secretary',email:'secretary@example.test',role:'trainee'}};
  const at=new Date().toISOString();
  for(const [key,p] of Object.entries(identities)){
   const subject=randomUUID();await providerControl('identity',{email:p.email,subject});
   if(['owner','coach','coachB'].includes(key))await db.prepare('INSERT INTO care_staff(email,name,role,active,updated_at) VALUES(?,?,?,1,?)').bind(p.email,'Synthetic '+key,key==='owner'?'clinician':'coach',at).run();
   await db.prepare("INSERT INTO dc_identity_principals(id,state,origin_issuer,origin_subject,created_at) VALUES(?,'active',?,?,?)").bind(p.id,'https://auth.example.test/auth/v1',subject,Date.now()).run();
   await db.prepare('INSERT INTO dc_identity_aliases(issuer,subject,principal_id,created_at) VALUES(?,?,?,?)').bind('https://auth.example.test/auth/v1',subject,p.id,Date.now()).run();
   await db.prepare('INSERT INTO dc_identity_details(principal_id,email,display_name,legacy) VALUES(?,?,?,1)').bind(p.id,p.email,'Synthetic '+key).run();
   await db.prepare("UPDATE dc_managed_users SET role=?,approval='approved' WHERE user_id=?").bind(p.role,p.id).run();
   await db.prepare("INSERT INTO care_profiles(user_id,name,goal,experience,equipment,days,medical_json,updated_at) VALUES(?,?,'Strength','Beginner','Weights',3,?,?)").bind(p.id,'Synthetic '+key,JSON.stringify({medicalHistory:'SYNTHETIC MEDICAL SECRET '+key}),at).run();
   for(const consent of ['terms','privacy','health','team','media'])await db.prepare('INSERT INTO user_consents(id,user_id,consent_id,revision,accepted,created_at) VALUES(?,?,?,?,1,?)').bind(randomUUID(),p.id,consent,CONSENT_REVISION,at).run();
   await db.prepare("INSERT INTO user_intakes(user_id,answers_json,completed,tour_completed,created_at,updated_at) VALUES(?,'{}',1,1,?,?)").bind(p.id,at,at).run();
  }
  for(const [key,permission] of [['owner','owner'],['secretary','secretary']])await db.prepare('INSERT INTO dc_management_grants(user_id,permission,granted_by,granted_at) VALUES(?,?,?,?)').bind(identities[key].id,permission,identities.owner.id,Date.now()).run();
  await db.prepare("INSERT INTO care_connections(id,client_id,staff_email,medical_access,nutrition_access,active,created_at,scope) VALUES(?,?,?,1,0,1,?,'care')").bind(randomUUID(),identities.a.id,identities.owner.email,at).run();
  async function asyncDatabase(){
   const service=await mf.getWorker('pilot-local-control'),fetch=service.fetch.bind(service);
   const call=async(kind,sql,args=[])=>{const response=await fetch('http://local-control/',{method:'POST',body:JSON.stringify({kind,sql,args})});const value=await response.json();if(!response.ok)throw Error(value.error);return value.value;};
   const statement=(sql,args=[])=>({bind:(...values)=>statement(sql,values),first:()=>call('first',sql,args),run:()=>call('run',sql,args),all:()=>call('all',sql,args)});
   return {exec:sql=>call('exec',sql),prepare:sql=>statement(sql)};
  }
  db=await asyncDatabase();
  const apiActor=key=>{
   const identity=identities[key];let cookies='';
   return {...identity,get cookies(){return cookies;},set cookies(v){cookies=v;},
    async request(url,body,method=body===undefined?'GET':'POST'){
     const response=await mf.dispatchFetch(origin+url,{method,headers:{origin,'content-type':'application/json',cookie:cookies,'cf-connecting-ip':'127.0.0.'+(Object.keys(identities).indexOf(key)+1)},...(body===undefined?{}:{body:JSON.stringify(body)})});
     for(const c of response.headers.getSetCookie()){const pair=c.split(';')[0],name=pair.split('=')[0];cookies=cookies.split('; ').filter(x=>x&&!x.startsWith(name+'=')).concat(pair).join('; ');}return response;
    },
    async json(url,body,method){const r=await this.request(url,body,method);const value=await r.json();assert.equal(r.status,200,`${key} ${url}: ${JSON.stringify(value)}`);return value;},
    async login(){await this.json('/auth/send',{email:identity.email});await this.json('/auth/verify',{code:await provider.codeFor(identity.email)});assert.equal((await this.json('/auth/status',{})).authenticated,true);},
   };
  };
  async function resetLocalResendWindow(email){await db.prepare('UPDATE dc_auth_limits SET window_start=? WHERE id=?').bind(Date.now()-60001,'send-email:'+createHash('sha256').update(email).digest('hex')).run();}
  async function enableCalendar(){
   const bindings=calendarBindings;
   const store=googleCalendarStore(db,{clientId:bindings.DOCTORCOACH_CALENDAR_CLIENT_ID,ownerEmail:identities.owner.email,adminEmails:identities.owner.email,encryptionKey:bindings.DOCTORCOACH_CALENDAR_ENCRYPTION_KEY,origin,calendarId:bindings.DOCTORCOACH_CALENDAR_ID},providerFetch);
   const owner={userId:identities.owner.id,email:identities.owner.email};await store.credentials(owner,'SYNTHETIC-SECRET',0);const b=await store.begin(owner);await store.finish(owner,b.state,b.state,'SYNTHETIC-CODE');
  }
  return {origin,identities,provider,actor:apiActor,fetch:fetchLocal,get db(){return db;},resetLocalResendWindow,enableCalendar,calendarState:()=>providerControl('state'),setCalendarFailure:value=>providerControl('calendarFailure',{value}),
   async close(){await mf.dispose();},
  };
 }catch(e){console.error('PILOT setup failed:',e);await mf?.dispose();throw e;}

 async function fetchLocal(req){
  const url=new URL(req.url);if(url.origin!==origin)return new Response('Wrong local origin',{status:421});
  if(req.method==='GET'&&!url.pathname.startsWith('/api/')&&!url.pathname.startsWith('/auth/')){
   const assets=path.resolve(root,'dist/client'),name=path.resolve(assets,'.'+decodeURIComponent(url.pathname));
   if(name.startsWith(assets+path.sep)){try{if((await stat(name)).isFile())return new Response(await readFile(name),{headers:{'content-type':mime[path.extname(name)]??'application/octet-stream'}});}catch{/* Worker app route. */}}
  }
  return mf.dispatchFetch(req.url,{method:req.method,headers:Object.fromEntries(req.headers),...(['GET','HEAD'].includes(req.method)?{}:{body:await req.arrayBuffer()})});
 }
}
