import test from 'node:test';
import assert from 'node:assert/strict';
import { stagingIdentityEndpoint } from '../lib/staging-identity-endpoint.ts';
const url='https://staging.example.test', key='sb_publishable_test';
const sub='123e4567-e89b-12d3-a456-426614174000', sid='223e4567-e89b-12d3-a456-426614174000';
function token() {const now=Math.floor(Date.now()/1000);return [{alg:'ES256'},{iss:url+'/auth/v1',aud:'authenticated',sub,session_id:sid,role:'authenticated',is_anonymous:false,iat:now,exp:now+600,amr:[{method:'otp',timestamp:now}]}].map(v=>Buffer.from(JSON.stringify(v)).toString('base64url')).concat('signature').join('.');}
const req=(proof=token())=>new Request(url,{method:'POST',headers:{Authorization:'Bearer '+proof}});
test('unauthenticated and unsupported-method requests never access providers',async()=>{
 const handler=stagingIdentityEndpoint(url,key,async()=>{throw Error('must not call');});
 assert.equal((await handler(new Request(url))).status,405);
 assert.equal((await handler(new Request(url,{method:'POST'}))).status,401);
 assert.equal((await handler(req('forged'))).status,401);
});
test('RPC is bound to the exact token, accepts only boolean true and never caller identity',async()=>{
 for(const active of [true,false,{},'true',null]) {
  const calls=[],proof=token();
  const handler=stagingIdentityEndpoint(url,key,async(target,options)=>{
   calls.push({target:String(target),options});
   return Response.json(calls.length===1?{id:sub,is_anonymous:false,email_confirmed_at:'2026-01-01T00:00:00Z'}:active);
  });
  const response=await handler(req(proof));assert.equal(response.status,active===true?200:401);
  assert.equal(calls[1].target,url+'/rest/v1/rpc/doctorcoach_staging_session_active');
  assert.equal(calls[1].options.body,'{}');assert.equal(calls[1].options.headers.Authorization,'Bearer '+proof);
  assert.equal(response.headers.get('cache-control'),'no-store');
  const body=await response.json();assert.equal(body.authenticated,active===true?true:undefined);
  assert.ok(!JSON.stringify(body).includes(proof));
 }
});
test('RPC outages and provider rejection deny access',async()=>{
 const providerFail=stagingIdentityEndpoint(url,key,async()=>new Response('',{status:401}));
 assert.equal((await providerFail(req())).status,401);
 let calls=0;
 const sessionFail=stagingIdentityEndpoint(url,key,async()=>{if(++calls===1)return Response.json({id:sub,is_anonymous:false,email_confirmed_at:'2026-01-01T00:00:00Z'});throw Error('private failure');});
 const result=await sessionFail(req());assert.equal(result.status,401);assert.ok(!(await result.text()).includes('private failure'));
});
