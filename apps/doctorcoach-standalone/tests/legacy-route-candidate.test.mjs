import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createLegacyMigrationRoute} from '../standalone/legacy-route-candidate.ts';
import {prepareLinkKeys} from '../standalone/scripts/prepare-link-keys.mjs';
import {signLink,verifyLink,random} from '../standalone/crypto.ts';
import {legacyHandoffUrl} from '../standalone/legacy-handoff.ts';
test('handoff has no production default and only uses a configured distinct HTTPS origin',()=>{
 assert.equal(legacyHandoffUrl(false,undefined,'https://new.example.test'),undefined);
 for(const value of [undefined,'http://old.example.test','https://old.example.test/','https://user@old.example.test','https://old.example.test/?proof=x','https://new.example.test'])assert.throws(()=>legacyHandoffUrl(true,value,'https://new.example.test'));
 assert.equal(legacyHandoffUrl(true,'https://old-test.example.test','https://new.example.test'),'https://old-test.example.test/account/migrate');
});
async function fixture(t){
 const dir=await mkdtemp(path.join(tmpdir(),'dc-bridge-keys-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 const bundle=path.join(dir,'keys');await prepareLinkKeys(bundle);
 const old=JSON.parse(await readFile(path.join(bundle,'old-runtime-secrets.json'),'utf8')),next=JSON.parse(await readFile(path.join(bundle,'new-runtime-secrets.json'),'utf8'));
 const config={enabled:true,oldOrigin:'https://old.example.test',standaloneOrigin:'https://new.example.test',legacyIssuer:'sites:synthetic-old',externalPublicKey:JSON.parse(old.DC_EXTERNAL_PUBLIC_JWK),legacyPrivateKey:JSON.parse(old.DC_LEGACY_PRIVATE_JWK)};
 let user=null,calls=0;const route=createLegacyMigrationRoute(config,async()=>{calls++;return user;});
 const now=Date.now(),proof=await signLink({iss:config.standaloneOrigin,aud:config.legacyIssuer,sub:'new-subject',target:'new-subject',email:'new@example.test',nonce:random(),iat:now,exp:now+300000},JSON.parse(next.DC_LINK_PRIVATE_JWK));
 const request=(body={},headers={})=>new Request(config.oldOrigin+'/account/migrate',{method:'POST',headers:{origin:config.oldOrigin,'Content-Type':'application/json',...headers},body:JSON.stringify({proof,...body})});
 return {bundle,config,old,next,proof,route,request,setUser:v=>{user=v;},get calls(){return calls;}};
}
test('offline signing bundle has independent keys, public-only verification keys and cannot be overwritten',async t=>{
 const f=await fixture(t),pub=JSON.parse(await readFile(path.join(f.bundle,'public-keys.json'),'utf8'));
 assert.ok(!('d' in pub.legacy));assert.ok(!('d' in pub.external));assert.notEqual(pub.legacy.x,pub.external.x);
 const saved=await readFile(path.join(f.bundle,'old-runtime-secrets.json'),'utf8');await assert.rejects(prepareLinkKeys(f.bundle));assert.equal(await readFile(path.join(f.bundle,'old-runtime-secrets.json'),'utf8'),saved);
 if(process.platform!=='win32')assert.equal((await stat(path.join(f.bundle,'old-runtime-secrets.json'))).mode&0o777,0o600);
});
test('candidate stays disabled by default and rejects noncanonical or shared origins',async t=>{
 const f=await fixture(t);assert.equal((await createLegacyMigrationRoute({...f.config,enabled:false},async()=>{throw Error();})(f.request())).status,404);
 for(const oldOrigin of ['http://old.example.test','https://old.example.test/','https://new.example.test'])assert.throws(()=>createLegacyMigrationRoute({...f.config,oldOrigin},async()=>null));
});
test('candidate rejects wrong route, method and cross-site or non-JSON POST before trusted-session lookup',async t=>{
 const f=await fixture(t);
 for(const req of [new Request(f.config.oldOrigin+'/other'),new Request('https://attacker.test/account/migrate'),new Request(f.config.oldOrigin+'/account/migrate',{method:'DELETE'}),f.request({}, {origin:'https://attacker.test'}),f.request({}, {'sec-fetch-site':'cross-site'}),f.request({}, {'Content-Type':'text/plain'})])assert.ok((await f.route(req)).status>=400);
 assert.equal(f.calls,0);
});
test('forged headers do not establish old-account ownership; trusted session and explicit confirmation are required',async t=>{
 const f=await fixture(t);assert.equal((await f.route(f.request({confirmed:true},{'oai-authenticated-user-id':'forged'}))).status,401);
 f.setUser({userId:'original-owner',email:'old@example.test'});
 const inspect=await f.route(f.request({action:'inspect'}));assert.equal(inspect.status,200);assert.deepEqual(await inspect.json(),{existingEmail:'old@example.test',signInEmail:'new@example.test'});
 assert.equal((await f.route(f.request({confirmed:false}))).status,403);
 const signed=await f.route(f.request({confirmed:true}));assert.equal(signed.status,200);assert.equal(signed.headers.get('Cache-Control'),'no-store');
 const verified=await verifyLink((await signed.json()).proof,JSON.parse(f.next.DC_LEGACY_PUBLIC_JWK),f.config.legacyIssuer,f.config.standaloneOrigin);assert.equal(verified.sub,'original-owner');assert.equal(verified.target,'new-subject');
});
test('trusted session failure returns a generic no-store denial without exposing exception details',async t=>{
 const f=await fixture(t),route=createLegacyMigrationRoute(f.config,async()=>{throw Error('private-session-detail');});
 const response=await route(f.request());assert.equal(response.status,503);assert.equal(response.headers.get('Cache-Control'),'no-store');assert.ok(!(await response.text()).includes('private-session-detail'));
});
