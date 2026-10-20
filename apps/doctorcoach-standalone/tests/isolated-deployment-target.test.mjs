import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
const config=JSON.parse(readFileSync(new URL('../standalone/wrangler.isolated-staging.json',import.meta.url),'utf8'));
function check(patch){
 const dir=mkdtempSync(join(tmpdir(),'dc-target-'));
 try{const file=join(dir,'config.json');writeFileSync(file,JSON.stringify({...config,...patch}));return spawnSync(process.execPath,['standalone/scripts/check-isolated-staging.mjs',file],{encoding:'utf8'});}finally{rmSync(dir,{recursive:true,force:true});}
}
test('dedicated LAB target passes the read-only preflight',()=>assert.equal(check({}).status,0));
test('LAB preflight rejects production routes and custom domains before deployment',()=>{
 for(const patch of [{route:'drtamireilam.com/*'},{routes:[{pattern:'drtamireilam.com',custom_domain:true}]},{routes:['doctorcoach.dr-tamireilam.chatgpt.site/*']}]){
  assert.notEqual(check(patch).status,0,JSON.stringify(patch));
 }
});
test('LAB preflight rejects unexpected remote resource bindings',()=>{
 for(const patch of [{durable_objects:{bindings:[{name:'SHARED',class_name:'Data',script_name:'production'}]}},{queues:{producers:[{binding:'EVENTS',queue:'production'}]}},{send_email:[{name:'MAIL'}]},{analytics_engine_datasets:[{binding:'ANALYTICS',dataset:'production'}]}])assert.notEqual(check(patch).status,0,JSON.stringify(patch));
});
