// Local full-app runner: live Staging identity + disposable local D1/R2.
// It has no deployment or remote-database migration operations.
import {createRequire} from 'node:module';
import {realpathSync} from 'node:fs';
import {readFile,readdir,stat} from 'node:fs/promises';
import {createServer} from 'node:http';
import {randomBytes,createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
const project='https://jbfkzkzcznfacsjdawmf.supabase.co';
const port=Number(process.env.DC_STAGING_LOCAL_PORT??8788);
if(!Number.isInteger(port)||port<1024||port>65535)throw new Error('Invalid local port');
const origin='http://localhost:'+port;
const publicKey=process.env.DC_STAGING_PUBLIC_KEY??(await readFile(path.join(root,'standalone/DoctorCoach-Staging-Login.html'),'utf8')).match(/const PUBLIC_KEY='([^']+)'/)[1];
if(!/^sb_publishable_[\w-]+$/.test(publicKey))throw new Error('Staging publishable key required; never use privileged keys');
const require=createRequire(realpathSync(path.join(root,'node_modules/@cloudflare/vite-plugin/package.json')));
const {Miniflare}=require('miniflare');
async function modules(dir){const out=[];for(const entry of await readdir(dir,{withFileTypes:true})){const full=path.join(dir,entry.name);if(entry.isDirectory())out.push(...await modules(full));else if(/\.m?js$/.test(entry.name))out.push({type:'ESModule',path:full});}return out;}
const entries=await modules(path.join(root,'dist/server'));
entries.sort((a,b)=>a.path===path.join(root,'dist/server/index.js')?-1:b.path===path.join(root,'dist/server/index.js')?1:a.path.localeCompare(b.path));
const allowed=new Set(['/auth/v1/otp','/auth/v1/verify','/auth/v1/user','/auth/v1/token','/auth/v1/logout','/rest/v1/rpc/doctorcoach_staging_session_active']);
const mf=new Miniflare({modules:entries,modulesRoot:path.join(root,'dist/server'),compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],r2Buckets:['BUCKET'],bindings:{DC_AUTH_ORIGIN:origin,DC_SUPABASE_URL:project,DC_SUPABASE_PUBLIC_KEY:publicKey,DC_SESSION_KEY:randomBytes(32).toString('base64'),DC_LEGACY_ISSUER:'sites:local-synthetic-legacy',DC_NEW_ACCOUNTS_ENABLED:'true',DC_LEGACY_BRIDGE_ENABLED:'false'},outboundService:async request=>{
 const url=new URL(request.url);
 if(url.origin!==project||!allowed.has(url.pathname))return Response.json({error:'Local staging runner blocks this outbound destination'},{status:403});
 const response=await fetch(request.url,{method:request.method,headers:Object.fromEntries(request.headers),...(!['GET','HEAD'].includes(request.method)?{body:await request.arrayBuffer()}:{}),redirect:'manual',signal:AbortSignal.timeout(15000)});
 return new Response(await response.arrayBuffer(),{status:response.status,headers:Object.fromEntries(response.headers)});
}});
const db=await mf.getD1Database('DB');
const sqlLine=sql=>sql.replaceAll('--> statement-breakpoint','').split('\n').filter(x=>!x.trim().startsWith('--')).join(' ');
for(const name of (await readdir(path.join(root,'drizzle'))).filter(x=>/^\d.*\.sql$/.test(x)).sort())await db.exec(sqlLine(await readFile(path.join(root,'drizzle',name),'utf8')));
await db.exec(sqlLine(await readFile(path.join(root,'standalone/migrations/0001_identity.sql'),'utf8')));
const consolePage=`<!doctype html><html lang="he" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>DoctorCoach — Staging מקומי</title><style>body{font:18px system-ui;background:#f5f6fa;color:#172132;max-width:700px;margin:50px auto;padding:24px}button,a{display:block;padding:14px;margin:16px 0}button{font:inherit}#status{white-space:pre-line}</style><h1>DoctorCoach המלא — בדיקה מקומית</h1><p>הכניסה מתבצעת מול Supabase Staging בלבד. נתוני האפליקציה הם מקומיים ונמחקים בעצירת התהליך. לא מקשרים חשבון קיים ולא מייבאים נתונים.</p><a href="/auth/signin?return_to=%2F__staging">כניסה או הרשמה עם קוד במייל</a><button id="grant">אישור גישת אימון ניסיונית במסד המקומי בלבד</button><p>לאחר הכניסה, אפשר לאשר גישת בדיקה ללא תשלום. השאלון וההסכמות מתבצעים במסכי האפליקציה עצמה.</p><a href="/">פתיחת האפליקציה המלאה</a><a href="/auth/signout?return_to=%2F__staging">יציאה</a><p id="status" role="status"></p><script>document.getElementById('grant').onclick=async()=>{const button=document.getElementById('grant');button.disabled=true;try{const r=await fetch('/__staging/grant',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({confirmed:true})});document.getElementById('status').textContent=r.ok?'גישת הבדיקה אושרה. פתח את האפליקציה והמשך בשאלון ובניית תוכנית.':'לא ניתן לאשר. ודא שנכנסת ויצרת חשבון בדיקה חדש.';}catch{document.getElementById('status').textContent='שגיאת חיבור מקומי.';}finally{button.disabled=false;}};</script></html>`;
const assets=path.resolve(root,'dist/client');
const mime={'.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2','.ico':'image/x-icon'};
async function handle(req){
 const url=new URL(req.url);
 if(url.origin!==origin)return new Response('Wrong local origin',{status:421});
 if(req.method==='GET'&&url.pathname==='/__staging')return new Response(consolePage,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'"}});
 if(url.pathname==='/__staging/grant'){
  if(req.method!=='POST'||req.headers.get('origin')!==origin||req.headers.get('sec-fetch-site')==='cross-site')return new Response('Denied',{status:403});
  const body=await req.text();if(body.length>200)return new Response('Too large',{status:413});
  try{if(JSON.parse(body)?.confirmed!==true)return new Response('Confirmation required',{status:400});}catch{return new Response('Invalid JSON',{status:400});}
  // The real Worker validates provider identity/session before this local grant.
  const account=await mf.dispatchFetch(origin+'/api/account',{headers:{cookie:req.headers.get('cookie')??''}});
  if(!account.ok||!(await account.json()).signedIn)return new Response('Sign in first',{status:401});
  const matches=(req.headers.get('cookie')??'').split(';').map(x=>x.trim()).filter(x=>x.startsWith('__Host-dc_session='));
  if(matches.length!==1)return new Response('Denied',{status:401});
  const hash=createHash('sha256').update(matches[0].slice('__Host-dc_session='.length)).digest('hex');
  const principal=await db.prepare('SELECT a.principal_id id FROM dc_auth_sessions s JOIN dc_identity_aliases a ON a.issuer=s.issuer AND a.subject=s.subject WHERE s.id_hash=? AND s.revoked_at IS NULL').bind(hash).first();
  if(!principal?.id?.startsWith('dc:'))return new Response('New local account required',{status:403});
  await db.prepare("INSERT INTO training_access(user_id,mode,self_until,updated_at) VALUES(?,'self',?,?) ON CONFLICT(user_id) DO UPDATE SET mode='self',self_until=excluded.self_until,updated_at=excluded.updated_at").bind(principal.id,new Date(Date.now()+86400000).toISOString(),new Date().toISOString()).run();
  return Response.json({ok:true,scope:'disposable-local-db-only'});
 }
 if(req.method==='GET'&&!url.pathname.startsWith('/api/')&&!url.pathname.startsWith('/auth/')){
  const filename=path.resolve(assets,'.'+decodeURIComponent(url.pathname));
  if(filename.startsWith(assets+path.sep)){try{if((await stat(filename)).isFile())return new Response(await readFile(filename),{headers:{'Content-Type':mime[path.extname(filename)]??'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}catch{/* App route fallback. */}}
 }
 return mf.dispatchFetch(req.url,{method:req.method,headers:Object.fromEntries(req.headers),...(!['GET','HEAD'].includes(req.method)?{body:await req.arrayBuffer()}:{} )});
}
const server=createServer(async(input,output)=>{
 try{
  const headers=new Headers();for(const [name,value]of Object.entries(input.headers))if(value!==undefined)headers.set(name,Array.isArray(value)?value.join(','):value);
  const chunks=[];let length=0;for await(const chunk of input){length+=chunk.length;if(length>1024*1024){output.writeHead(413);output.end();return;}chunks.push(chunk);}
  const request=new Request('http://'+input.headers.host+input.url,{method:input.method,headers,...(chunks.length?{body:Buffer.concat(chunks)}:{})});
  const response=await handle(request);const outgoing={};for(const [name,value]of response.headers)if(name!=='set-cookie')outgoing[name]=value;
  const cookies=response.headers.getSetCookie();if(cookies.length)outgoing['set-cookie']=cookies;
  output.writeHead(response.status,outgoing);output.end(Buffer.from(await response.arrayBuffer()));
 }catch{output.writeHead(500,{'Content-Type':'text/plain; charset=utf-8'});output.end('Local staging request failed. No production fallback.');}
});
server.listen(port,'127.0.0.1',()=>console.log('LOCAL ONLY: '+origin+'/__staging\nLive Supabase Staging; disposable local D1/R2; no production or deployment.'));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{server.close();await mf.dispose();process.exit(0);});
