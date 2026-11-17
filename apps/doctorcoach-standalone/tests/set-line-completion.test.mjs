import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {randomUUID} from 'node:crypto';
import * as training from '../lib/training.ts';
import * as loads from '../lib/set-load.ts';
import * as units from '../lib/load-units.ts';
import * as effort from '../lib/effort.ts';
import * as sections from '../lib/workout-sections.ts';
import * as navigation from '../lib/workout-navigation.ts';
import * as days from '../lib/workout-days.ts';
import * as experience from '../lib/workout-experience.ts';
import * as autosave from '../lib/set-autosave.ts';
import {platform,client} from './platform-db.mjs';

// Exercise the real component handlers with React-like state across renders,
// and persist through the real owner-scoped store rather than a patch mock.
function setLine({effects=false,document:doc}={}){
 const source=readFileSync(new URL('../components/training-workspace.tsx',import.meta.url),'utf8')+'\nexports.RenderSetLine=SetLine;';
 const code=ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const state=[];let cursor=0;const exports={},pendingEffects=[];
 const react={useState:initial=>{const n=cursor++;if(!(n in state))state[n]=typeof initial==='function'?initial():initial;return [state[n],v=>{state[n]=typeof v==='function'?v(state[n]):v}]},useRef:initial=>{const n=cursor++;return state[n]??(state[n]={current:initial})},useEffect:(effect,deps)=>{if(!effects)return;const n=cursor++,old=state[n];if(!old||deps.some((value,i)=>!Object.is(value,old[i]))){state[n]=deps;pendingEffects.push(effect)}}};
 const modules={'react':react,'react/jsx-runtime':{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})},'../lib/content':{exercises:[],templates:[]},'./load-unit-picker':{useLoadUnit:()=> 'kg'},'../lib/localization':{displayLocale:()=> 'he-IL'},'../lib/training':training,'../lib/set-load':loads,'../lib/load-units':units,'../lib/effort':effort,'../lib/workout-sections':sections,'../lib/workout-navigation':navigation,'../lib/workout-days':days,'../lib/workout-experience':experience};
 modules['../lib/set-autosave']=autosave;
 vm.runInNewContext(code,{exports,document:doc,setTimeout,clearTimeout,queueMicrotask,require:name=>modules[name]??{}});
 const render=props=>{cursor=0;return exports.RenderSetLine(props)};render.flush=()=>{for(const fn of pendingEffects.splice(0))fn()};return render;
}
function nodes(node){if(!node||typeof node!=='object')return [];return [node,...[node.props?.children].flat(Infinity).flatMap(nodes)];}
function label(node){if(node==null||typeof node==='boolean')return '';if(typeof node==='string'||typeof node==='number')return String(node);return (Array.isArray(node)?node:[node.props?.children]).flat(Infinity).map(label).join('');}

for(const [nextReps,expected,step] of [[5,162.5,2.5],[6,157.5,2.5],[5,160.6579,0],[6,156.75,0]])test(`165 x 5 at RPE 8 completes in one press and fills next ${nextReps} reps at target 7 with step ${step}`,async t=>{
 const f=platform(t);await f.connect();await f.training.savePlan(client.userId,{...training.defaultPrescription('goblet'),sets:2,reps:5,weight:100,targetRpe:7});
 let session=await f.training.start(client.userId,{requestId:randomUUID(),before:0});
 if(nextReps!==5)session=await f.training.patch(client.userId,{id:session.id,version:session.version,action:'set',exerciseId:'goblet',setIndex:1,done:false,amount:nextReps,weight:100});
 const render=setLine();const controller={busy:false,feed:{active:session,history:[]},patch:async p=>{session=await f.training.patch(client.userId,{id:session.id,version:session.version,...p});controller.feed.active=session;return session}};
 const draw=()=>nodes(render({item:session.items[0],index:0,controller,hasOtherDraft:false,onDirty:()=>{}}));
 draw().find(n=>n.props?.['aria-label']?.startsWith('משקל בסט')).props.onChange({target:{value:'165'}});
 draw().find(n=>n.props?.ariaLabel?.startsWith('RPE בסט')).props.onChange(8);
 if(step!==0)draw().find(n=>n.props?.label?.startsWith('מדרגת משקל')).props.onChange(String(step));
 const controls=draw();
 assert.equal(controls.filter(n=>n.props?.className?.startsWith('set-save')).length,1);
 assert.equal(controls.some(n=>n.props?.onCheckedChange&&n.props?.['aria-label']?.startsWith('סימון סט')),false);
 assert.equal(label(controls.find(n=>n.props?.className?.startsWith('set-save')).props.children),'סיום סט');
 controller.busy=true;const busy=draw().find(n=>n.props?.className?.startsWith('set-save'));
 assert.equal(busy.props['aria-busy'],true);assert.equal(busy.props.disabled,true);
 assert.equal(label(busy.props.children),'סיום סט');controller.busy=false;
 await controls.find(n=>n.props?.className?.startsWith('set-save')).props.onClick();
 assert.equal(session.items[0].results[0].done,true);
 assert.equal(session.items[0].results[0].weight,165);
 assert.equal(session.items[0].results[1].weight,expected);
 assert.equal((await f.training.feed(client.userId)).active.items[0].results[1].weight,expected);
});

test('clearing a set field preserves a blank draft instead of manufacturing zero',()=>{
 const item={...training.defaultPrescription('goblet'),name:'Synthetic squat',results:[{done:false,weight:20,amount:8,actualRpe:7}]};
 const controller={busy:false,feed:{active:{id:'blank',items:[item],before:0},history:[]}};
 const render=setLine(),draw=()=>nodes(render({item,index:0,controller,hasOtherDraft:false,onDirty:()=>{}}));
 draw().find(n=>n.props?.['aria-label']?.startsWith('משקל בסט')).props.onChange({target:{value:''}});
 assert.equal(draw().find(n=>n.props?.['aria-label']?.startsWith('משקל בסט')).props.value,'');
 draw().find(n=>n.props?.['aria-label']?.startsWith('חזרות בסט')).props.onChange({target:{value:''}});
 assert.equal(draw().find(n=>n.props?.['aria-label']?.startsWith('חזרות בסט')).props.value,'');
 draw().find(n=>n.props?.['aria-label']?.startsWith('משקל בסט')).props.onChange({target:{value:'0'}});
 assert.equal(draw().find(n=>n.props?.['aria-label']?.startsWith('משקל בסט')).props.value,0);
});
test('saved sets offer compact readback and explicit editing without changing completion',()=>{
 const item={...training.defaultPrescription('goblet'),name:'Synthetic squat',results:[{done:true,weight:63.125,amount:8,actualRpe:7}]};
 let writes=0;const controller={busy:false,feed:{active:{id:'compact',items:[item],before:0},history:[]},patch:()=>writes++};
 const render=setLine(),draw=()=>nodes(render({item,index:0,controller,hasOtherDraft:false,onDirty:()=>{}}));
 assert.equal(draw().find(n=>n.props?.className==='set-entry-body').props.hidden,true);
 assert.match(label(draw().find(n=>n.props?.['data-completed-summary'])),/63[.,]125/);
 draw().find(n=>n.props?.className==='set-edit').props.onClick();
 assert.equal(draw().find(n=>n.props?.className==='set-entry-body').props.hidden,false);
 assert.equal(writes,0);assert.equal(item.results[0].done,true);
});
test('compact saved readback retains per-side load basis and recorded pain',()=>{
 const item={...training.defaultPrescription('goblet'),name:'Synthetic split squat',load:{basis:'per-side',sourceUnit:'kg'},results:[{done:true,weight:12.5,amount:8,actualRpe:7,painDuring:5}]};
 const controller={busy:false,feed:{active:{id:'basis-pain',items:[item],before:0},history:[]}};
 const render=setLine(),summary=nodes(render({item,index:0,controller,hasOtherDraft:false,onDirty:()=>{}})).find(n=>n.props?.['data-completed-summary']);
 assert.match(label(summary),/לכל צד/);assert.match(label(summary),/כאב.*5/);
});

test('saved pain remains visible after compact completion',()=>{
 const item={...training.defaultPrescription('goblet'),name:'Synthetic squat',results:[{done:true,weight:20,amount:8,actualRpe:7,painDuring:5}]};
 const controller={busy:false,feed:{active:{id:'pain',items:[item],before:0},history:[]}};
 const summary=nodes(setLine()({item,index:0,controller,hasOtherDraft:false,onDirty:()=>{}})).find(n=>n.props?.['data-completed-summary']);
 assert.match(label(summary),/כאב.*5/);
});
test('completion focus survives server acknowledgement before delayed draft cleanup finishes',()=>{
 const item={...training.defaultPrescription('goblet'),name:'Synthetic squat',results:[{done:false,weight:20,amount:8,actualRpe:7}]};
 const input={},doc={body:{},activeElement:input};
 const controller={busy:false,feed:{active:{id:'focus',items:[item],before:0},history:[]}};
 const render=setLine({effects:true,document:doc}),props={item,index:0,controller,hasOtherDraft:false,onDirty:()=>{}};
 const draw=()=>nodes(render(props));
 const initial=draw(),body=initial.find(n=>n.props?.className==='set-entry-body');body.props.ref.current={contains:el=>el===input};body.props.onFocusCapture?.();render.flush();
 // The server snapshot is committed while local cache acknowledgement still owns busy.
 item.results[0]={...item.results[0],done:true};controller.busy=true;doc.activeElement=doc.body;
 const during=draw(),edit={focus(){if(!controller.busy)doc.activeElement=edit}};during.find(n=>n.props?.className==='set-edit').props.ref.current=edit;render.flush();
 assert.equal(doc.activeElement,doc.body);controller.busy=false;draw();render.flush();
 assert.equal(doc.activeElement,edit);
});
