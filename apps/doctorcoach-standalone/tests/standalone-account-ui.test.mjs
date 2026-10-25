import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {authPage} from '../standalone/page.ts';
import {legacyLinkPage} from '../standalone/legacy-link-page.ts';
const script=html=>html.match(/<script nonce="[^"]+">([\s\S]*?)<\/script>/)[1];
const flush=async()=>{for(let n=0;n<4;n++)await new Promise(resolve=>setImmediate(resolve));};
async function ui({incoming='',responses={},isolatedStaging=false}={}){
 const response=authPage({signout:false,returnTo:'/#program',english:false,isolatedStaging}),html=await response.text(),nodes=new Map(),calls=[],redirects=[];
 for(const m of html.matchAll(/id="([^"]+)"/g))nodes.set(m[1],{hidden: new RegExp('id="'+m[1]+'" hidden').test(html),disabled:false,value:'',textContent:'',listeners:{},addEventListener(event,fn){this.listeners[event]=fn;},focus(){this.focused=true;}});
 for(const id of ['email-form','code-form','new-form','link-form']){const node=nodes.get(id),fields={email:{value:'new@example.test',focus(){}},code:{value:'123456',focus(){}},confirmed:{checked:false}};node.fields=fields;node.elements={namedItem:name=>fields[name]};node.querySelector=selector=>selector.includes('code')?fields.code:selector.includes('email')?fields.email:{disabled:false};}
 const location={hash:incoming?'#legacy_proof='+encodeURIComponent(incoming):'',pathname:'/auth/signin',search:'',assign:url=>redirects.push(url)};
 const history={replaceState(){location.hash='';}};
 const context={URL,URLSearchParams,Date,Error,Object,encodeURIComponent,location,history,setInterval(){},document:{getElementById:id=>nodes.get(id)||null,querySelectorAll:()=>[...nodes.values()]},fetch:async(path,init)=>{calls.push([path,JSON.parse(init.body)]);const value=responses[path]??(path==='/auth/status'?{status:401}:{});return {ok:!value.status||value.status<400,status:value.status||200,json:async()=>value};}};
 new vm.Script(script(html)).runInNewContext(context);await flush();
 return {nodes,calls,redirects,location,async event(id,event='click'){nodes.get(id).listeners[event]({preventDefault(){},target:nodes.get(id)});await flush();}};
}
test('HE/EN sign-in and old-runtime pages have valid scripts, explicit confirmation and strict CSP',async()=>{
 for(const english of [true,false])for(const signout of [true,false]){
  const response=authPage({signout,returnTo:'/?x="</script><script>alert(1)</script>',english}),html=await response.text();
  assert.match(html,new RegExp('dir="'+(english?'ltr':'rtl')+'"'));assert.equal((html.match(/<script /g)||[]).length,1);new vm.Script(script(html));
  assert.match(response.headers.get('Content-Security-Policy'),/frame-ancestors 'none'/);assert.equal(response.headers.get('Cache-Control'),'no-store');
  if(!signout){assert.match(html,/name="confirmed" required/);assert.ok(!html.includes('external-proof'));assert.match(html,/prefers-color-scheme:light/);}
 }
 for(const english of [true,false]){const r=legacyLinkPage('https://staging.example.test',english);new vm.Script(script(await r.text()));assert.equal(r.headers.get('Referrer-Policy'),'no-referrer');}
});
test('unlinked user is guided to existing account and cannot silently register or use an unconfigured bridge',async()=>{
 const f=await ui({responses:{'/auth/status':{linked:false,canRegister:false,linkingReady:false}}});
 assert.equal(f.nodes.get('account').hidden,false);assert.equal(f.nodes.get('not-ready').hidden,false);assert.equal(f.nodes.get('start').disabled,true);assert.equal(f.nodes.get('new-form').hidden,true);
 assert.ok(!f.calls.some(([p])=>p==='/auth/register'));assert.equal(f.nodes.get('account-title').focused,true);
});
test('new account requires a separate unchecked confirmation before posting',async()=>{
 const f=await ui({responses:{'/auth/status':{linked:false,canRegister:true,linkingReady:false},'/auth/register':{linked:true}}});
 await f.event('new-form','submit');assert.ok(!f.calls.some(([p])=>p==='/auth/register'));
 f.nodes.get('new-form').fields.confirmed.checked=true;await f.event('new-form','submit');assert.ok(f.calls.some(([p,b])=>p==='/auth/register'&&b.confirmed));assert.deepEqual(f.redirects,['/#program']);
});
test('returned proof is cleared from address bar, inspected and never linked before user confirmation',async()=>{
 const f=await ui({incoming:'signed-proof',responses:{'/auth/status':{linked:false,canRegister:true,linkingReady:true},'/auth/link/inspect':{existingEmail:'old@example.test',signInEmail:'new@example.test'},'/auth/link':{linked:true}}});
 assert.equal(f.location.hash,'');assert.equal(f.nodes.get('review').hidden,false);assert.equal(f.nodes.get('existing-email').textContent,'old@example.test');assert.ok(!f.calls.some(([p])=>p==='/auth/link'));
 await f.event('link-form','submit');assert.ok(!f.calls.some(([p])=>p==='/auth/link'));
 f.nodes.get('link-form').fields.confirmed.checked=true;await f.event('link-form','submit');assert.ok(f.calls.some(([p,b])=>p==='/auth/link'&&b.proof==='signed-proof'&&b.confirmed));
});
test('wrong code and repeated immediate resend show feedback without duplicate send requests',async()=>{
 const f=await ui({responses:{'/auth/send':{sent:true},'/auth/verify':{status:401}}});await f.event('email-form','submit');assert.equal(f.nodes.get('resend').disabled,true);
 await f.event('resend');assert.equal(f.calls.filter(([p])=>p==='/auth/send').length,1);
 await f.event('code-form','submit');assert.match(f.nodes.get('message').textContent,/הקוד שגוי/);assert.ok(!f.calls.some(([p])=>p==='/auth/register'));
});

test('switch email restores entry and sends the replacement address',async()=>{
 const f=await ui({responses:{'/auth/send':{sent:true}}});
 await f.event('email-form','submit');
 assert.equal(f.nodes.get('code-form').hidden,false);
 // Exercise restoration even when an earlier account response hid the form.
 f.nodes.get('email-form').hidden=true;
 await f.event('switch-email');
 assert.equal(f.nodes.get('email-form').hidden,false);
 assert.equal(f.nodes.get('code-form').hidden,true);
 f.nodes.get('email-form').fields.email.value='replacement@example.test';
 await f.event('email-form','submit');
 assert.equal(f.calls.filter(([p])=>p==='/auth/send').at(-1)[1].email,'replacement@example.test');
 assert.equal(f.nodes.get('code-form').hidden,false);
});

test('isolated staging offers a separate test account without legacy links or proof requests',async()=>{
 for(const english of [false,true]){
  const html=await authPage({signout:false,returnTo:'/',english,isolatedStaging:true}).text();
  assert.ok(!html.includes('https://doctorcoach.dr-tamireilam.chatgpt.site/'));
  assert.ok(!html.includes('id="start"'));assert.match(html,/<details open>/);
  new vm.Script(script(html));
 }
 const f=await ui({isolatedStaging:true,incoming:'old-proof',responses:{'/auth/status':{linked:false,canRegister:true,linkingReady:false},'/auth/register':{linked:true}}});
 assert.equal(f.nodes.get('account').hidden,false);assert.equal(f.nodes.get('new-form').hidden,false);
 assert.ok(!f.calls.some(([p])=>p.startsWith('/auth/link')));
 await f.event('new-form','submit');assert.ok(!f.calls.some(([p])=>p==='/auth/register'));
 f.nodes.get('new-form').fields.confirmed.checked=true;await f.event('new-form','submit');
 assert.deepEqual(f.redirects,['/#program']);
});

test('refresh restores code entry from the server challenge and does not send another email',async()=>{
 const f=await ui({responses:{'/auth/pending':{pending:true,email:'resume@example.test',resendAt:Date.now()+30000}}});
 assert.equal(f.nodes.get('code-form').hidden,false);
 assert.equal(f.nodes.get('email-form').hidden,true);
 assert.equal(f.nodes.get('resend').disabled,true);
 assert.ok(!f.calls.some(([p])=>p==='/auth/send'));
 assert.equal(f.nodes.get('code-form').fields.code.value,'');
});

test('HE/EN sign-in offers Google, Apple and email with one submit per method',async()=>{
 for(const english of [true,false]){
  const html=await authPage({signout:false,returnTo:'/?lang='+ (english?'en':'he')+'#plan',english,isolatedStaging:true}).text();
  for(const label of english?['Continue with Google','Continue with Apple','Continue with Email']:['המשך עם Google','המשך עם Apple','המשך עם דוא"ל'])assert.ok(html.includes(label),label);
  assert.equal((html.match(/id="oauth-google"/g)||[]).length,1);assert.equal((html.match(/id="oauth-apple"/g)||[]).length,1);
  assert.equal((html.match(/id="email-form"/g)||[]).length,1);
 }
});
