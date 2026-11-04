import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

const cwd=fileURLToPath(new URL('../',import.meta.url));
async function run(t,preload){
 const evidence=await mkdtemp(join(tmpdir(),'dc-oauth-isolation-'));
 t.after(()=>rm(evidence,{recursive:true,force:true}));
 const args=['--experimental-strip-types'];
 if(preload){const path=join(evidence,'preload.mjs');await writeFile(path,preload);args.push('--import',pathToFileURL(path).href);}
 args.push('scripts/oauth-browser-smoke.mjs');
 const child=spawn(process.execPath,args,{cwd,env:{...process.env,DC_OAUTH_EVIDENCE:evidence},windowsHide:true});
 let stdout='',stderr='';child.stdout.on('data',d=>stdout+=d);child.stderr.on('data',d=>stderr+=d);
 const timer=setTimeout(()=>{stderr+='\nOAuth fixture child exceeded the 45000ms test watchdog\n';child.kill();},45000);
 try{const code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',resolve);});return {code,stdout,stderr};}
 finally{clearTimeout(timer);}
}

test('OAuth fixtures run concurrently while the former fixed port is occupied',async t=>{
 const blocker=createServer();await new Promise((resolve,reject)=>{blocker.once('error',reject);blocker.listen(37864,'127.0.0.1',resolve);});
 try{
  const results=await Promise.all([run(t),run(t),run(t)]);
  for(const result of results){assert.equal(result.code,0,result.stderr);const report=JSON.parse(result.stdout);assert.equal(report.checks.length,5);assert.deepEqual(report.errors,[]);}
  const origins=results.map(r=>JSON.parse(r.stdout).origin);
  assert.equal(new Set(origins).size,3,'each concurrent fixture must own a different origin');
 }finally{await new Promise(resolve=>blocker.close(resolve));}
});

test('fixture startup errors report the bind failure',async t=>{
 const result=await run(t,`import {Server} from 'node:http';Server.prototype.listen=function(){queueMicrotask(()=>this.emit('error',Object.assign(new Error('synthetic bind denied'),{code:'EACCES'})));return this;};`);
 assert.equal(result.code,1,result.stderr);assert.match(result.stderr,/synthetic bind denied/);assert.doesNotMatch(result.stderr,/unsettled top-level await/);
});

test('a startup that never signals readiness fails explicitly instead of exiting 13',async t=>{
 const result=await run(t,`import {Server} from 'node:http';Server.prototype.listen=function(){return this;};`);
 assert.equal(result.code,1,result.stderr);assert.match(result.stderr,/OAuth fixture did not start listening/);assert.doesNotMatch(result.stderr,/unsettled top-level await/);
});
