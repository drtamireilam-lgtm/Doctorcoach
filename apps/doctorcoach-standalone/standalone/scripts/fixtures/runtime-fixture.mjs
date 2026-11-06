import {createRequire} from 'node:module';
import {realpathSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {CALENDAR_SCOPE} from '../../../lib/google-calendar.ts';

const require=createRequire(realpathSync(new URL('../../../node_modules/@cloudflare/vite-plugin/package.json',import.meta.url)));
const {Miniflare}=require('miniflare');
const fixtureRoot=fileURLToPath(new URL('./',import.meta.url));
export async function runtimeFixture(options){
 let appOptions=options;
 const configuration=()=>({workers:[
  {...appOptions,name:'runtime-app',outboundService:'runtime-providers'},
  {name:'runtime-providers',modulesRoot:fixtureRoot,compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],bindings:{SYNTHETIC_CALENDAR_SCOPE:CALENDAR_SCOPE},modules:['runtime-providers.mjs','synthetic-auth-provider.mjs'].map(name=>({type:'ESModule',path:path.join(fixtureRoot,name)}))},
 ]});
 const mf=new Miniflare(configuration());
 try{
  await mf.ready;
  let service=await mf.getWorker('runtime-providers');
  const providerFetch=(...args)=>service.fetch(...args);
  const call=async(action,body={})=>{const r=await providerFetch('https://runtime-fixture-control/',{method:'POST',body:JSON.stringify({action,...body})});if(!r.ok)throw Error('Local fixture control failed');return r.json();};
  const control=async(action,body={})=>{
   if(action!=='bindings')return call(action,body);
   // Keep real Miniflare binding reloads: handlers also import cloudflare:workers
   // env. Checkpoint only the synthetic provider state that a reload clears.
   const state=await call('snapshot');
   appOptions={...appOptions,bindings:{...appOptions.bindings,...body.bindings}};
   await mf.setOptions(configuration());service=await mf.getWorker('runtime-providers');
   return call('restore',{state});
  };
  return {mf,providerFetch,control};
 }catch(error){await mf.dispose();throw error;}
}
