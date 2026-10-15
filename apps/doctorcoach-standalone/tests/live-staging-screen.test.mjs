import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const html=await readFile(new URL('../standalone/DoctorCoach-Staging-Login.html',import.meta.url),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
async function fixture(overrides={}){
 const nodes=new Map();for(const [,id] of html.matchAll(/id="([^"]+)"/g))nodes.set(id,{value:'',hidden:false,disabled:false,textContent:'',className:'',listeners:{},focus(){},addEventListener(event,fn){this.listeners[event]=fn;}});
 const calls=[],tokens={access_token:'synthetic-access',refresh_token:'synthetic-refresh'},user={id:'synthetic-user',email:'test@example.test',is_anonymous:false,email_confirmed_at:'2026-01-01'};
 let revoked=false;
 const context={document:{getElementById:id=>nodes.get(id)},Date,Error,Object,AbortSignal,setInterval(){},fetch:async(url,init)=>{
  assert.equal(new URL(url).origin,'https://jbfkzkzcznfacsjdawmf.supabase.co');const path=new URL(url).pathname+new URL(url).search;calls.push({path,init});
  let data=path==='/auth/v1/verify'||path.startsWith('/auth/v1/token')?tokens:path==='/auth/v1/user'?user:path.includes('/rpc/')?!revoked:{};
  if(path.startsWith('/auth/v1/logout'))revoked=true;
  const response=overrides[path]??{status:200,data};return {ok:response.status<400,status:response.status,json:async()=>response.data};
 }};
 new vm.Script(script).runInNewContext(context);
 return {nodes,calls,async event(id,event='click'){nodes.get(id).listeners[event]({preventDefault(){}});for(let i=0;i<8;i++)await new Promise(resolve=>setImmediate(resolve));},async send(){nodes.get('email').value='test@example.test';await this.event('send-form','submit');},async login(){await this.send();nodes.get('code').value='123456';await this.event('verify-form','submit');}};
}
test('local screen sends OTP only to staging and never persists credentials',async()=>{
 const f=await fixture();await f.send();assert.equal(f.calls[0].path,'/auth/v1/otp');assert.equal(JSON.parse(f.calls[0].init.body).email,'test@example.test');assert.equal(f.calls[0].init.credentials,'omit');assert.ok(!/localStorage|sessionStorage|document\.cookie/.test(script));assert.ok(!html.includes('STAGING_PUBLISHABLE_KEY'));assert.ok(!html.includes('sb_secret_'));assert.ok(html.includes('form-action \'none\''));
 await f.event('send-form','submit');assert.equal(f.calls.length,1,'cooldown blocks immediate duplicate');
});
test('verified OTP requires a confirmed identity and active server-side session',async()=>{
 const f=await fixture();await f.login();assert.equal(f.nodes.get('signed-in').hidden,false);assert.match(f.nodes.get('status').textContent,/עברו/);assert.equal(f.nodes.get('code').value,'');assert.ok(f.calls.some(c=>c.path.includes('/rpc/')));assert.ok(!f.nodes.get('result').textContent.includes('synthetic-access'));
});
test('wrong OTP does not mark a user signed in',async()=>{
 const f=await fixture({'/auth/v1/verify':{status:401,data:{}}});await f.login();assert.match(f.nodes.get('status').textContent,/הקוד שגוי/);assert.ok(!f.calls.some(c=>c.path==='/auth/v1/user'));
});
test('unconfirmed identities and inactive sessions cannot pass verification',async()=>{
 for(const overrides of [{'/auth/v1/user':{status:200,data:{id:'x',email:'test@example.test',is_anonymous:false}}},{'/rest/v1/rpc/doctorcoach_staging_session_active':{status:200,data:false}}]){
  const f=await fixture(overrides);await f.login();assert.ok(f.calls.some(c=>c.path.startsWith('/auth/v1/logout')));assert.ok(!f.nodes.get('result').textContent);
 }
});
test('refresh rotates tokens and logout checks revocation before claiming success',async()=>{
 const f=await fixture();await f.login();await f.event('refresh');assert.ok(f.calls.some(c=>c.path.includes('grant_type=refresh_token')));await f.event('logout');assert.equal(f.nodes.get('signed-in').hidden,true);assert.match(f.nodes.get('status').textContent,/הסשן אינו פעיל/);
});
test('SMTP rate limits remain visible without pretending email was delivered',async()=>{
 const f=await fixture({'/auth/v1/otp':{status:429,data:{}}});await f.send();assert.match(f.nodes.get('status').textContent,/מגבלת ניסיונות/);assert.ok(!f.calls.some(c=>c.path==='/auth/v1/verify'));
});
