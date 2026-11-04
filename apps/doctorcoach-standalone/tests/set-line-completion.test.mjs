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
import {platform,client} from './platform-db.mjs';

// Exercise the real component handlers with React-like state across renders,
// and persist through the real owner-scoped store rather than a patch mock.
function setLine(){
 const source=readFileSync(new URL('../components/training-workspace.tsx',import.meta.url),'utf8')+'\nexports.RenderSetLine=SetLine;';
 const code=ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const state=[];let cursor=0;const exports={};
 const react={useState:initial=>{const n=cursor++;if(!(n in state))state[n]=typeof initial==='function'?initial():initial;return [state[n],v=>{state[n]=typeof v==='function'?v(state[n]):v}]},useRef:initial=>{const n=cursor++;return state[n]??(state[n]={current:initial})},useEffect:()=>{}};
 const modules={'react':react,'react/jsx-runtime':{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})},'../lib/content':{exercises:[],templates:[]},'./load-unit-picker':{useLoadUnit:()=> 'kg'},'../lib/localization':{displayLocale:()=> 'he-IL'},'../lib/training':training,'../lib/set-load':loads,'../lib/load-units':units,'../lib/effort':effort,'../lib/workout-sections':sections,'../lib/workout-navigation':navigation,'../lib/workout-days':days,'../lib/workout-experience':experience};
 vm.runInNewContext(code,{exports,require:name=>modules[name]??{}});
 return props=>{cursor=0;return exports.RenderSetLine(props)};
}
function nodes(node){if(!node||typeof node!=='object')return [];return [node,...[node.props?.children].flat(Infinity).flatMap(nodes)];}

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
 assert.equal(controls.find(n=>n.props?.className?.startsWith('set-save')).props.children,'סיום סט');
 await controls.find(n=>n.props?.className?.startsWith('set-save')).props.onClick();
 assert.equal(session.items[0].results[0].done,true);
 assert.equal(session.items[0].results[0].weight,165);
 assert.equal(session.items[0].results[1].weight,expected);
 assert.equal((await f.training.feed(client.userId)).active.items[0].results[1].weight,expected);
});
