import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync,existsSync} from 'node:fs';
import ts from 'typescript';
import * as jsx from 'react/jsx-runtime';
import * as units from '../lib/load-units.ts';
import * as effort from '../lib/effort.ts';
const file=new URL('../components/completed-workout-correction.tsx',import.meta.url);
const done={done:true,amount:8,weight:22.6,actualRpe:null,painDuring:0};
function nodes(node){return !node||typeof node!=='object'?[]:[node,...[node.props?.children].flat(Infinity).flatMap(nodes)];}
function fixture(language='en'){
 assert.ok(existsSync(file),'Completed correction UI is missing');
 const states=[],exports={},calls=[];let cursor=0,session={id:'completed',version:3,status:'completed',items:[{exerciseId:'bench',occurrenceId:'first',name:'Bench',unit:'reps',results:[{...done},{...done,amount:6}]},{exerciseId:'bench',occurrenceId:'second',name:'Bench',unit:'reps',effortScale:'rir',load:{sourceUnit:'lb',basis:'total'},results:[{...done,weight:units.toKg(50,'lb'),actualRpe:8}]}]};
 const controller={auth:'ready',busy:false,access:{canStart:true},correctCompletedSet:async p=>{calls.push(p);return {...session,version:4};},refresh:async()=>true};
 const eligible=(s,i,n)=>s.status==='completed'&&!s.retrospective&&i.unit==='reps'&&!i.cardio&&(!i.workoutSection||i.workoutSection==='main')&&i.results[n]?.done;
 const modules={'react/jsx-runtime':jsx,'react':{useState(initial){const i=cursor++;if(!(i in states))states[i]=initial;return [states[i],value=>{states[i]=typeof value==='function'?value(states[i]):value;}];},useRef(initial){const i=cursor++;if(!(i in states))states[i]={current:initial};return states[i];}},'./language-provider':{useLanguage:()=>({language})},'../lib/load-units':units,'../lib/effort':effort,'../lib/completed-workout-corrections':{canCorrectCompletedSet:eligible},'../lib/training':{unitMax:{reps:100}}};
 vm.runInNewContext(ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require:key=>{assert.ok(key in modules,key);return modules[key];},crypto:globalThis.crypto,structuredClone});
 function render(){cursor=0;return nodes(exports.CompletedWorkoutCorrection({session,controller}));}
 const by=(key,value)=>render().find(n=>n.props?.[key]===value);
 const button=label=>render().find(n=>n.type==='button'&&n.props.children===label);
 return {render,by,button,calls,controller,get session(){return session;},set session(value){session=value;},open(){button(language==='en'?'Correct a recorded set':'תיקון סט שתועד').props.onClick();},change(label,value){const input=by('aria-label',label);assert.ok(input,label);input.props.onChange({target:{value}});},submit(){return render().find(n=>n.type==='form').props.onSubmit({preventDefault(){}});}};
}
for(const language of ['he','en'])test(`completed correction explicitly saves the selected occurrence in ${language}`,async()=>{
 const f=fixture(language);f.open();const en=language==='en';
 f.change(en?'Exercise occurrence':'מופע תרגיל','second');f.change(en?'Repetitions':'חזרות','9');f.change(en?'Weight (lb)':'משקל (lb)','52.6');f.change('RIR','3');await f.submit();
 assert.equal(f.calls.length,1);const p=f.calls[0];assert.equal(p.occurrenceId,'second');assert.equal(p.exerciseId,'bench');assert.equal(p.setIndex,0);assert.equal(p.amount,9);assert.equal(p.actualRpe,7);assert.ok(Math.abs(p.weight-units.toKg(52.6,'lb'))<1e-10);assert.equal(p.version,3);assert.match(p.requestId,/^[0-9a-f-]{36}$/);assert.ok(f.by('role','status'));assert.equal(f.render().some(n=>n.type==='form'),false);
});
test('failure retains decimal edits, exact retry identity and a local parallel-send lock',async()=>{
 const f=fixture();f.open();f.change('Weight (kg)','37.9');let finish;
 f.controller.correctCompletedSet=(p,onError)=>{f.calls.push(p);return new Promise(resolve=>{finish=()=>{onError(Object.assign(new Error('synthetic network'),{status:503}));resolve(null);};});};
 const first=f.submit();await f.submit();assert.equal(f.calls.length,1);assert.ok(f.render().filter(n=>['input','select'].includes(n.type)).every(n=>n.props.disabled));finish();await first;
 assert.equal(f.by('aria-label','Weight (kg)').props.value,'37.9');assert.ok(f.by('role','alert'));const retry=f.submit();assert.equal(f.calls.length,2);assert.equal(f.calls[0].requestId,f.calls[1].requestId);finish();await retry;
 f.change('Weight (kg)','38.1');const changed=f.submit();assert.notEqual(f.calls[1].requestId,f.calls[2].requestId);finish();await changed;
});
test('409 stays blocked after edits and requires explicit successful reload before reopening',async()=>{
 const f=fixture();f.open();f.controller.correctCompletedSet=async(p,onError)=>{f.calls.push(p);onError(Object.assign(new Error('synthetic conflict'),{status:409}));return null;};await f.submit();f.change('Repetitions','10');await f.submit();assert.equal(f.calls.length,1);assert.equal(f.by('aria-label','Repetitions').props.value,'10');
 f.controller.refresh=async()=>false;await f.button('Reload and discard changes').props.onClick();assert.ok(f.render().some(n=>n.type==='form'));
 f.session={...f.session,version:9};f.controller.refresh=async()=>true;await f.button('Reload and discard changes').props.onClick();assert.equal(f.render().some(n=>n.type==='form'),false);f.open();f.controller.correctCompletedSet=async p=>{f.calls.push(p);return null;};await f.submit();assert.equal(f.calls[1].version,9);
});
test('feed refresh does not silently replace an open editor snapshot; blank effort remains unknown',async()=>{
 const f=fixture();f.open();f.change('Repetitions','12');f.session={...f.session,version:7,items:f.session.items.map(i=>({...i,results:i.results.map(s=>({...s,weight:99}))}))};await f.submit();assert.equal(f.calls[0].version,3);assert.equal(f.calls[0].weight,22.6);assert.equal(f.calls[0].actualRpe,null);
});
for(const [label,value] of [['Repetitions','101'],['Repetitions','0'],['Weight (kg)',''],['Weight (kg)','-1'],['RPE','10.2']])test(`invalid ${label} ${value} is rejected before persistence`,async()=>{const f=fixture();f.open();f.change(label,value);await f.submit();assert.equal(f.calls.length,0);assert.ok(f.by('role','alert'));});
test('cancel does not persist; auth/access and unsupported session gates hide correction controls',()=>{
 const f=fixture();f.open();f.button('Cancel').props.onClick();assert.equal(f.calls.length,0);assert.equal(f.render().some(n=>n.type==='form'),false);
 for(const auth of ['loading','required','error']){f.controller.auth=auth;assert.equal(f.render().length,0);}f.controller.auth='ready';f.controller.access.canStart=false;assert.equal(f.render().length,0);f.controller.access.canStart=true;f.session={...f.session,retrospective:{}};assert.equal(f.render().length,0);
});
test('unchanged pounds preserve the canonical saved load exactly; blank RIR stays null',async()=>{
 const f=fixture();f.open();f.change('Exercise occurrence','second');f.change('RIR','');await f.submit();assert.equal(f.calls[0].weight,f.session.items[1].results[0].weight);assert.equal(f.calls[0].actualRpe,null);
});
test('set selection is occurrence-scoped and no edits save automatically',async()=>{
 const f=fixture();f.open();f.change('Set','1');f.change('Repetitions','14');assert.equal(f.calls.length,0);await f.submit();assert.equal(f.calls[0].occurrenceId,'first');assert.equal(f.calls[0].setIndex,1);assert.equal(f.calls[0].amount,14);
});
test('a legacy item without a resolved occurrence ID cannot open correction controls',()=>{
 const f=fixture();f.session={...f.session,items:f.session.items.map(item=>({...item,occurrenceId:undefined}))};assert.equal(f.render().length,0);
});
test('Hebrew conflict feedback retains decimal edits and gates retry until reload',async()=>{
 const f=fixture('he');f.open();f.change('משקל (kg)','37.9');f.controller.correctCompletedSet=async(p,onError)=>{f.calls.push(p);onError(Object.assign(new Error('synthetic conflict'),{status:409}));return null;};await f.submit();assert.match(f.by('role','alert').props.children,/האימון השתנה/);assert.equal(f.by('aria-label','משקל (kg)').props.value,'37.9');await f.submit();assert.equal(f.calls.length,1);await f.button('טעינה מחדש וביטול העריכה').props.onClick();assert.match(f.by('role','status').props.children,/האימון נטען מחדש/);assert.equal(f.render().some(n=>n.type==='form'),false);
});
