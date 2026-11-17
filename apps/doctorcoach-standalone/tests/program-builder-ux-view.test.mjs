import * as status from '../lib/program-draft-status.ts';
import * as copy from '../lib/program-copy.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import * as jsx from 'react/jsx-runtime';
import * as training from '../lib/training.ts';
import * as days from '../lib/workout-days.ts';
import * as sections from '../lib/workout-sections.ts';
import * as content from '../lib/content.ts';
import * as builder from '../lib/program-builder-ux.ts';
import * as custom from '../lib/custom-exercise-types.ts';
import * as dose from '../lib/import-source.ts';
const nodes=n=>!n||typeof n!=='object'?[]:[n,...[n.props?.children].flat(Infinity).flatMap(nodes)];
function fixture(){const state=[],exports={},saves=[];let cursor=0,confirm=false;const machine={ready:false,blocked:'',saving:false,dirty:false,error:'',updatedAt:null,save:async force=>{saves.push(force);return true;}};
 const react={useState:v=>{const i=cursor++;if(!(i in state))state[i]=typeof v==='function'?v():v;return [state[i],v=>state[i]=typeof v==='function'?v(state[i]):v];},useRef:v=>{const i=cursor++;return state[i]??(state[i]={current:v});},useEffect:()=>{},useLayoutEffect:fn=>fn()};
 const modules={'../lib/program-draft-status':status,'../lib/program-copy':copy,'./program-quick-actions':{ProgramQuickActions:'QuickActions'},'react':react,'react/jsx-runtime':jsx,'../lib/content':content,'../lib/training':training,'../lib/workout-days':days,'../lib/workout-sections':sections,'../lib/custom-exercise-types':custom,'../lib/import-source':dose,'../lib/program-builder-ux':builder,'../lib/request-id':{requestId:()=>crypto.randomUUID()},'./language-provider':{useLanguage:()=>({language:'en'})},'../hooks/use-custom-exercises':{useCustomExercises:()=>({exercises:content.exercises,customs:[]})},'../hooks/use-care':{useCareAction:()=>({busy:false,error:'',setError:()=>{}})},'../hooks/use-program-autosave':{useProgramAutosave:()=>({machine,resource:{data:null,loading:false}})},'./care-ui':{CareSelect:'CareSelect'},'./coach-exercise-picker':{CoachExercisePicker:'Picker'},'./workout-sections':{WorkoutSections:'Sections'},'./program-quick-dose':{ProgramQuickDose:'Quick'},'./program-draft-preview':{ProgramDraftPreview:'Preview'},'./program-draft-actions':{ProgramDraftActions:'Actions'}};
 vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../components/care-workspace.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:k=>modules[k]??{},crypto,structuredClone,window:{confirm:()=>confirm}});
 return {render(){cursor=0;return nodes(exports.ProgramBuilder({clientId:'synthetic',clientName:'Synthetic',reload:()=>{}}));},saves,set confirm(value){confirm=value;},machine};
}
test('builder batch appends all selected exercises once and preview/back never calls draft save or publish',()=>{const f=fixture();let tree=f.render();const picker=tree.find(n=>n.type==='Picker');assert.equal(typeof picker.props.onAddMany,'function');assert.equal(picker.props.onAddMany(['goblet','bench']),true);tree=f.render();const actions=tree.find(n=>n.type==='Actions');assert.equal(actions.props.itemCount,2);actions.props.onPreview();tree=f.render();const preview=tree.find(n=>n.type==='Preview');assert.equal(preview.props.items.length,2);assert.deepEqual(f.saves,[]);preview.props.onBack();assert.equal(f.render().find(n=>n.type==='Actions').props.itemCount,2);});
test('quick pending buffers block preview and cancelled day changes retain current editor',()=>{const f=fixture();f.render().find(n=>n.type==='Picker').props.onAdd('goblet');let tree=f.render();const toggle=tree.find(n=>n.type==='button'&&n.props['aria-pressed']!==undefined);assert.ok(toggle);toggle.props.onClick();tree=f.render();tree.find(n=>n.type==='Quick').props.onDirtyChange(true);tree=f.render();assert.equal(tree.find(n=>n.type==='Actions').props.pendingFields,true);tree.find(n=>n.type==='Actions').props.onPreview();assert.equal(f.render().some(n=>n.type==='Preview'),false);const day=tree.find(n=>n.type==='CareSelect'&&n.props.label==='יום אימון לעריכה');day.props.onChange('2');assert.equal(f.render().find(n=>n.type==='CareSelect'&&n.props.label==='יום אימון לעריכה').props.value,'1');f.confirm=true;day.props.onChange('2');assert.equal(f.render().find(n=>n.type==='CareSelect'&&n.props.label==='יום אימון לעריכה').props.value,'2');});
test('footer saves through the existing machine and current capacity is rechecked between immediate batch callbacks',async()=>{const f=fixture(),picker=f.render().find(n=>n.type==='Picker');assert.equal(picker.props.onAddMany(Array(29).fill('goblet')),true);assert.equal(picker.props.onAddMany(['bench','goblet']),false);let tree=f.render();assert.equal(tree.find(n=>n.type==='Actions').props.itemCount,29);await tree.find(n=>n.type==='Actions').props.onSave();assert.deepEqual(f.saves,[true]);});

test('quick actions retain duplicate identity and stop while a field is pending',()=>{
 const f=fixture();f.render().find(n=>n.type==='Picker').props.onAddMany(['goblet','bench']);f.render().find(n=>n.type==='button'&&n.props['aria-pressed']!==undefined).props.onClick();
 const quick=()=>f.render().find(n=>n.type==='Quick');let before=quick().props.items;const key=days.planItemKey(before[0]);quick().props.onChange(key,{sets:4,targetRpe:8});
 quick().props.renderActions(quick().props.items[0]).props.onDuplicate();let items=quick().props.items;assert.equal(items.length,3);assert.equal(items[1].sets,4);assert.notEqual(days.planItemKey(items[0]),days.planItemKey(items[1]));
 const firstKey=days.planItemKey(items[0]);quick().props.renderActions(items[0]).props.onMove(1);items=quick().props.items;assert.equal(days.planItemKey(items[1]),firstKey);
 quick().props.onDirtyChange(true);const actions=quick().props.renderActions(items[0]);assert.equal(actions.props.disabled,true);actions.props.onDuplicate();actions.props.onMove(1);assert.deepEqual(quick().props.items,items);
 const header=f.render().find(n=>String(n.props?.className).startsWith('program-draft-status'));assert.match(header.props.children[0],/still being edited/);
});
