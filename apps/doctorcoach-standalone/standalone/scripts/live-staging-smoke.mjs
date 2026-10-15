// Tests the actual loopback HTTP runner without sending OTP or creating users.
import {spawn} from 'node:child_process';
import {request as httpRequest} from 'node:http';
import {once} from 'node:events';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const port=18788,origin='http://localhost:'+port;
const child=spawn(process.execPath,[fileURLToPath(new URL('./live-staging-server.mjs',import.meta.url))],{env:{...process.env,DC_STAGING_LOCAL_PORT:String(port)},stdio:['ignore','pipe','pipe']});
let output='',errors='',passed=0;
child.stderr.on('data',chunk=>errors+=chunk);
const ready=new Promise((resolve,reject)=>{
 child.stdout.on('data',chunk=>{output+=chunk;if(output.includes('LOCAL ONLY:'))resolve();});
 child.once('exit',code=>reject(new Error('Runner exited '+code+': '+errors)));
});
const timer=setTimeout(()=>child.kill('SIGTERM'),30000);
try{
 await ready;
 const check=async(name,fn)=>{await fn();passed++;console.log('PASS: '+name);};
 await check('local control page is available without remote identity calls',async()=>{const r=await fetch(origin+'/__staging');assert.equal(r.status,200);assert.ok((await r.text()).includes('Supabase Staging'));assert.match(r.headers.get('cache-control'),/no-store/);});
 await check('real full-app sign-in page renders',async()=>{const r=await fetch(origin+'/auth/signin');assert.equal(r.status,200);assert.ok((await r.text()).includes('email-form'));});
 await check('full app renders its public entry page',async()=>{const r=await fetch(origin+'/');assert.equal(r.status,200);assert.ok((await r.text()).includes('DoctorCoach'));});
 await check('spoofed browser identity cannot gain application access',async()=>{const r=await fetch(origin+'/api/account',{headers:{'oai-authenticated-user-id':'doctor','oai-authenticated-user-email':'doctor@example.test'}});assert.equal((await r.json()).signedIn,false);});
 await check('local training grant requires same-origin POST',async()=>{const r=await fetch(origin+'/__staging/grant',{method:'POST',body:JSON.stringify({confirmed:true})});assert.equal(r.status,403);});
 await check('local grant rejects unconfirmed payload',async()=>{const r=await fetch(origin+'/__staging/grant',{method:'POST',headers:{origin},body:'{}'});assert.equal(r.status,400);});
 await check('local grant requires a verified registered application session',async()=>{const r=await fetch(origin+'/__staging/grant',{method:'POST',headers:{origin},body:JSON.stringify({confirmed:true})});assert.equal(r.status,401);});
 await check('foreign Host cannot reach local control endpoints',async()=>{const status=await new Promise((resolve,reject)=>{const r=httpRequest(origin+'/__staging',{headers:{Host:'evil.example'}},res=>{res.resume();resolve(res.statusCode);});r.on('error',reject);r.end();});assert.equal(status,421);});
 await check('malformed grant JSON is denied without a write',async()=>{const r=await fetch(origin+'/__staging/grant',{method:'POST',headers:{origin},body:'not-json'});assert.equal(r.status,400);});
 console.log(`${passed} passed, 0 failed. No OTP sent; no remote database writes.`);
}finally{clearTimeout(timer);child.kill('SIGTERM');if(child.exitCode===null)await once(child,'exit');}
