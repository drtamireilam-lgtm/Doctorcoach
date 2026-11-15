import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {defaultPrescription} from '../lib/training.ts';
import * as responseHelpers from '../lib/api-response.ts';
function fixture(){
 const states=[],exports={};let cursor=0,fail=false,calls=0;
 const item={...defaultPrescription('goblet'),occurrenceId:'slot',name:'Synthetic',results:[{done:true,amount:8,weight:20,actualRpe:7}]};
 const historical={id:'past',status:'completed',version:3,items:[item],startedAt:'2026-11-01T10:00:00Z',finishedAt:'2026-11-01T11:00:00Z',plannedSets:3,completedSets:1,before:0,after:0};
 const active={...historical,id:'ongoing',status:'active',finishedAt:null};
 const modules={'react':{useState(v){const i=cursor++;if(!(i in states))states[i]=typeof v==='function'?v():v;return [states[i],v=>{states[i]=typeof v==='function'?v(states[i]):v;}];},useRef(v){const i=cursor++;return states[i]??(states[i]={current:v});},useCallback:fn=>fn,useEffect:()=>{}},'../lib/api-response':responseHelpers,'../lib/training':{workCompletion:items=>items.reduce((n,i)=>n+i.results.filter(s=>s.done).length,0)}};
 const fetch=async(url,options)=>{let body;
  if(url==='/api/program')body={split:null,items:[],access:{canStart:true},workoutPreference:{mode:'fixed',version:0}};
  else if(url==='/api/training')body={ownerId:'synthetic',active,history:[historical],stats:{total:1,week:1,sets:1}};
  else if(url==='/api/logs')body={logs:[]};else if(url==='/api/favorites')body={favorites:[]};
  else {assert.equal(url,'/api/training/corrections');assert.equal(options.method,'PATCH');calls++;if(fail)return Response.json({error:'conflict'},{status:409});body={...historical,version:4,items:[{...item,results:[{...item.results[0],weight:22.6}]}]};}
  return Response.json(body);
 };
 vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../hooks/use-training.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:key=>modules[key]??{},fetch,AbortSignal,Response,setTimeout,clearTimeout,queueMicrotask});
 return {render(){cursor=0;return exports.useTraining();},get calls(){return calls;},set fail(v){fail=v;},active,historical};
}
test('controller updates corrected history without completing, replacing, or changing active workout and aggregate counts',async()=>{
 const f=fixture();await f.render().refresh();let c=f.render();
 const result=await c.correctCompletedSet({sessionId:'past',version:3,requestId:'synthetic',exerciseId:'goblet',occurrenceId:'slot',setIndex:0,amount:8,weight:22.6,actualRpe:7});
 assert.equal(result.version,4);c=f.render();assert.equal(c.feed.history[0].items[0].results[0].weight,22.6);assert.deepEqual(c.feed.active,f.active);assert.deepEqual(c.feed.stats,{total:1,week:1,sets:1});assert.equal(f.calls,1);
});
test('controller passes conflict status to editor and retains known historical and active values',async()=>{
 const f=fixture();await f.render().refresh();f.fail=true;let error;
 const result=await f.render().correctCompletedSet({sessionId:'past',version:3},e=>{error=e;});
 assert.equal(result,null);assert.equal(error.status,409);assert.equal(f.render().feed.history[0].version,3);assert.deepEqual(f.render().feed.active,f.active);
});
