import test from 'node:test';
import assert from 'node:assert/strict';
import {syntheticAuthProvider} from '../standalone/scripts/fixtures/synthetic-auth-provider.mjs';
const base='https://auth.example.test';
const post=(path,body,token)=>new Request(base+path,{method:'POST',headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});

test('synthetic OTP is consumed per issuance and old codes cannot consume a new issuance',async()=>{
 const p=syntheticAuthProvider();await p.fetch(post('/auth/v1/otp',{email:'a@example.test'}));const first=p.codeFor('a@example.test');
 assert.equal((await p.fetch(post('/auth/v1/verify',{email:'a@example.test',token:first}))).status,200);
 assert.equal((await p.fetch(post('/auth/v1/verify',{email:'a@example.test',token:first}))).status,401);
 await p.fetch(post('/auth/v1/otp',{email:'a@example.test'}));const next=p.codeFor('a@example.test');assert.notEqual(next,first);
 assert.equal((await p.fetch(post('/auth/v1/verify',{email:'a@example.test',token:first}))).status,401);
 assert.equal((await p.fetch(post('/auth/v1/verify',{email:'a@example.test',token:next}))).status,200);
});

test('synthetic fresh authentication retains identity but replaces provider session; refresh retains that session',async()=>{
 const p=syntheticAuthProvider();const login=async()=>{await p.fetch(post('/auth/v1/otp',{email:'a@example.test'}));return (await p.fetch(post('/auth/v1/verify',{email:'a@example.test',token:p.codeFor('a@example.test')}))).json();};
 const first=await login(),claims=t=>JSON.parse(Buffer.from(t.split('.')[1],'base64url'));
 await p.fetch(post('/auth/v1/logout?scope=local',{},first.access_token));
 assert.equal((await p.fetch(new Request(base+'/auth/v1/user',{headers:{authorization:'Bearer '+first.access_token}}))).status,401);
 assert.equal((await p.fetch(post('/auth/v1/token?grant_type=refresh_token',{refresh_token:first.refresh_token}))).status,401);
 const second=await login();assert.equal(claims(first.access_token).sub,claims(second.access_token).sub);assert.notEqual(claims(first.access_token).session_id,claims(second.access_token).session_id);
 const refreshed=await (await p.fetch(post('/auth/v1/token?grant_type=refresh_token',{refresh_token:second.refresh_token}))).json();
 assert.equal(claims(refreshed.access_token).session_id,claims(second.access_token).session_id);
 assert.equal((await p.fetch(post('/auth/v1/token?grant_type=refresh_token',{refresh_token:second.refresh_token}))).status,401);
});

test('synthetic OTP expiry/outage fail closed and other outbound origins are blocked',async()=>{
 let now=Date.now();const p=syntheticAuthProvider({now:()=>now});await p.fetch(post('/auth/v1/otp',{email:'a@example.test'}));now+=600001;
 assert.equal((await p.fetch(post('/auth/v1/verify',{email:'a@example.test',token:p.codeFor('a@example.test')}))).status,401);
 p.outage=true;assert.equal((await p.fetch(post('/auth/v1/otp',{email:'b@example.test'}))).status,503);
 await assert.rejects(()=>p.fetch(new Request('https://example.com/')),/Blocked synthetic provider destination/);
});
