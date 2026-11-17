import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import * as jsx from 'react/jsx-runtime';
import * as picker from '../lib/coach-exercise-picker.ts';
import * as selection from '../lib/coach-exercise-selection.ts';
import * as families from '../lib/exercise-families.ts';
import * as search from '../lib/exercise-search.ts';
import * as days from '../lib/workout-days.ts';
const source=readFileSync(new URL('../components/coach-exercise-picker.tsx',import.meta.url),'utf8');
const catalog=[{id:'press',name:'לחיצת רגליים',en:'Leg Press',aliases:['Legpress'],equipment:'Machine',group:'רגליים'},...Array.from({length:7},(_,n)=>({id:'row'+n,name:'חתירה '+n,en:'Row '+n,equipment:'Dumbbell',group:'גב'}))];
function nodes(node){return !node||typeof node!=='object'?[]:[node,...[node.props?.children].flat(Infinity).flatMap(nodes)];}
function fixture(language='en',batch=true){
 const states=[],effects=[],exports={},adds=[],batches=[];let cursor=0,pending=[];
 const modules={'react/jsx-runtime':jsx,'react':{useState(initial){const i=cursor++;if(!(i in states))states[i]=initial;return [states[i],value=>{states[i]=typeof value==='function'?value(states[i]):value;}];},useRef(initial){const i=cursor++;if(!(i in states))states[i]={current:initial};return states[i];},useEffect(callback,deps){const i=cursor++;if(!effects[i]||deps.some((v,n)=>v!==effects[i][n])){effects[i]=deps;pending.push(callback);}}},'lucide-react':{Plus:'Plus',Check:'Check',Search:'Search'},'../lib/coach-exercise-picker':picker,'../lib/coach-exercise-selection':selection,'../lib/exercise-families':families,'../lib/exercise-search':search,'../lib/workout-days':days,'./care-ui':{CareSelect:'CareSelect'},'./language-provider':{Localize:'Localize',useLanguage:()=>({language})}};
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require:key=>{assert.ok(key in modules,key);return modules[key];}});
 const props={items:catalog,dayId:'1',selectedIds:[],totalCount:0,onAdd:id=>adds.push(id),...(batch?{onAddMany:ids=>batches.push([...ids])}:{})};
 function render(){cursor=0;const output=nodes(exports.CoachExercisePicker(props));const run=pending;pending=[];run.forEach(f=>f());return output;}
 const by=(key,value)=>render().find(n=>n.props?.[key]===value);
 const labels={add:language==='en'?'Add selected exercises':'הוספת התרגילים שנבחרו',clear:language==='en'?'Clear selection':'ניקוי הבחירה'};
 return {props,adds,batches,render,by,labels,query(value){render().find(n=>n.type==='input'&&n.props.type==='search').props.onChange({target:{value}});},choose(id){const name=search.bilingualExerciseName(catalog.find(i=>i.id===id)),label=language==='en'?'Select '+name:'בחירת '+name;const checkbox=by('aria-label',label);assert.ok(checkbox,'Missing batch checkbox '+label);checkbox.props.onChange({target:{checked:!checkbox.props.checked}});}};
}
for(const language of ['he','en'])test(`queue survives bilingual queries, pages and equipment filters in ${language} and adds in selection order`,()=>{
 const f=fixture(language);f.render();f.query(language==='en'?'Legpress':'לחיצת');f.choose('press');f.query('Row 6');f.choose('row6');f.query('');const filter=f.render().find(n=>n.type==='CareSelect'&&n.props.label==='ציוד');filter.props.onChange('machine');assert.equal(f.by('aria-label',f.labels.add).props.disabled,false);f.by('aria-label',f.labels.add).props.onClick();assert.deepEqual(f.batches,[['press','row6']]);assert.equal(f.by('aria-label',f.labels.add).props.disabled,true);assert.equal(f.adds.length,0);
});
test('one-click add remains repeatable and does not clear the batch queue',()=>{
 const f=fixture();f.render();f.choose('press');const article=f.render().find(n=>n.type==='article'&&n.key==='press'),add=nodes(article).find(n=>n.type==='button');add.props.onClick();add.props.onClick();assert.deepEqual(f.adds,['press','press']);assert.equal(f.by('aria-label',f.labels.add).props.disabled,false);
});
test('capacity changes block the whole batch and preserve selections for removal; clear is explicit',()=>{
 const f=fixture();f.render();f.choose('press');f.query('Row 6');f.choose('row6');f.props.totalCount=29;assert.equal(f.by('aria-label',f.labels.add).props.disabled,true);f.by('aria-label',f.labels.add).props.onClick();assert.equal(f.batches.length,0);f.choose('row6');assert.equal(f.by('aria-label',f.labels.add).props.disabled,false);f.by('aria-label',f.labels.clear).props.onClick();assert.equal(f.by('aria-label',f.labels.add).props.disabled,true);
});
test('day changes cannot submit a queue from the previous day; absent optional callback keeps old picker behavior',()=>{
 const f=fixture();f.render();f.choose('press');f.props.dayId='2';f.render();assert.equal(f.by('aria-label',f.labels.add).props.disabled,true);f.by('aria-label',f.labels.add).props.onClick();assert.equal(f.batches.length,0);f.props.dayId='1';f.render();assert.equal(f.by('aria-label',f.labels.add).props.disabled,true);
 const legacy=fixture('en',false);assert.equal(legacy.render().filter(n=>n.type==='input'&&n.props.type==='checkbox').length,0);assert.equal(legacy.by('aria-label',legacy.labels.add),undefined);
});
test('duplicate dispatch is blocked and callback failure retains the full queue',()=>{
 const f=fixture();f.render();f.choose('press');const button=f.by('aria-label',f.labels.add);button.props.onClick();button.props.onClick();assert.equal(f.batches.length,1);
 f.choose('press');f.props.onAddMany=()=>{throw new Error('synthetic');};f.by('aria-label',f.labels.add).props.onClick();assert.ok(f.by('role','alert'));assert.equal(f.by('aria-label',f.labels.add).props.disabled,false);
});
for(const language of ['he','en'])test(`pagination retains queued exercises in ${language}`,()=>{
 const f=fixture(language);f.render();f.choose('press');f.render().find(n=>n.type==='button'&&n.props.children==='הבא').props.onClick();f.choose('row6');f.render().find(n=>n.type==='button'&&n.props.children==='הקודם').props.onClick();const name=search.bilingualExerciseName(catalog[0]);assert.equal(f.by('aria-label',(language==='en'?'Select ':'בחירת ')+name).props.checked,true);f.by('aria-label',f.labels.add).props.onClick();assert.deepEqual(f.batches,[['press','row6']]);
});
test('explicit parent rejection retains the whole queue and permits a later complete retry',()=>{
 const f=fixture();f.render();f.choose('press');f.props.onAddMany=()=>false;f.by('aria-label',f.labels.add).props.onClick();assert.ok(f.by('role','alert'));assert.equal(f.by('aria-label',f.labels.add).props.disabled,false);f.props.onAddMany=ids=>{f.batches.push([...ids]);return true;};f.by('aria-label',f.labels.add).props.onClick();assert.deepEqual(f.batches,[['press']]);
});
test('catalog changes preserve unavailable selections but block their submission',()=>{
 const f=fixture();f.render();f.choose('press');f.props.items=catalog.slice(1);assert.equal(f.by('aria-label',f.labels.add).props.disabled,true);f.by('aria-label',f.labels.add).props.onClick();assert.equal(f.batches.length,0);assert.match(f.by('role','alert').props.children,/no longer available/);
});

test('exact muscle filter composes with equipment and learning opener is passive',async()=>{const {exercises}=await import('../lib/content.ts');const f=fixture();f.props.items=exercises;let opened=[];f.props.renderLearning=id=>jsx.jsx('button',{'data-learning':id,onClick:()=>opened.push(id)});let tree=f.render();const muscle=tree.find(n=>n.type==='CareSelect'&&n.props.label==='Muscle by anatomy mapping');assert.ok(muscle.props.options.some(o=>o.value==='pectoralis-major'));muscle.props.onChange('pectoralis-major');f.render().find(n=>n.type==='CareSelect'&&n.props.label==='ציוד').props.onChange('barbell');tree=f.render();const articles=tree.filter(n=>n.type==='article');assert.ok(articles.length>0);const expected=picker.filterCoachExercises(exercises,'','all','barbell','all','pectoralis-major');assert.deepEqual(articles.map(n=>n.key),expected.slice(0,6).map(e=>e.id));const opener=tree.find(n=>n.props?.['data-learning']);opener.props.onClick();assert.deepEqual(opened,[expected[0].id]);assert.deepEqual(f.adds,[]);assert.deepEqual(f.batches,[]);});
