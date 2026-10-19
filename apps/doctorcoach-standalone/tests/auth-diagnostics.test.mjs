import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source=readFileSync(new URL('../app/chatgpt-auth.ts',import.meta.url),'utf8');
async function fixture({identity=true,storageFails=false,cookie=true}={}){
 const logs=[],exports={};
 const h=new Headers(cookie?{cookie:'__Host-dc_session=secret-cookie'}:{});
 if(identity){h.set('oai-authenticated-user-id','dc:synthetic');h.set('oai-authenticated-user-email','synthetic@example.test');}
 const modules={
  'next/headers':{headers:async()=>h},'next/navigation':{redirect(){}},
  './chatgpt-auth-paths':{},'../db/raw':{getRawDb:()=>({})},
  '../lib/account-deletion':{deletionStatus:async()=>null},
  'cloudflare:workers':{env:{BUCKET:{}}},
  '../lib/deletion-journal':{deletionJournal:()=>({read:async()=>{if(storageFails)throw Error('secret-provider-detail');return null;}}),restoreDeletionBarrier:async()=>{}},
 };
 const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
 vm.runInNewContext(js,{exports,require:name=>{assert.ok(name in modules,name);return modules[name];},console:{warn:value=>logs.push(value)}});
 return {user:await exports.getChatGPTUser(),logs};
}
test('storage failure denies access and emits only a fixed diagnostic code',async()=>{
 const f=await fixture({storageFails:true});assert.equal(f.user,null);
 assert.deepEqual(f.logs,['DC_AUTH_DIAG deletion_storage_denied']);
 assert.ok(!JSON.stringify(f.logs).includes('secret'));
});
test('missing trusted identity stays denied, with diagnostics only for session-cookie requests',async()=>{
 const f=await fixture({identity:false});assert.equal(f.user,null);
 assert.deepEqual(f.logs,['DC_AUTH_DIAG identity_headers_missing']);
 const anonymous=await fixture({identity:false,cookie:false});assert.equal(anonymous.user,null);assert.deepEqual(anonymous.logs,[]);
});
test('verified identity with available deletion journal remains accepted without diagnostics',async()=>{
 const f=await fixture();assert.equal(f.user.userId,'dc:synthetic');assert.deepEqual(f.logs,[]);
});
