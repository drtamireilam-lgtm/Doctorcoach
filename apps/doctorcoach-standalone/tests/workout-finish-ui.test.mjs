import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import * as jsx from 'react/jsx-runtime';
function fixture(patch){
 const states=[],exports={};let cursor=0,saved=null,closed=0;
 const modules={'react':{useState(initial){const i=cursor++;if(!(i in states))states[i]=initial;return [states[i],v=>{states[i]=v;}];}},'react/jsx-runtime':jsx,'./language-provider':{Localize:'Localize'},'./ui/dialog':Object.fromEntries(['Dialog','DialogContent','DialogTitle','DialogDescription','DialogClose'].map(k=>[k,k])),'../lib/workout-finish':{},'../lib/training':{},'./video-workspace':{}};
 vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../components/workout-finish.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require:k=>modules[k]});
 const render=(open=true)=>{cursor=0;return exports.FinishWorkoutDialog({controller:{busy:false,patch,feed:{history:[]}},session:{},open,onClose:()=>{closed++;},onSaved:s=>{saved=s;}});};
 function find(node,predicate){if(!node||typeof node!=='object')return null;if(predicate(node))return node;for(const child of [node.props?.children].flat(Infinity)){const result=find(child,predicate);if(result)return result;}return null;}
 return {render,find,renderSaved:()=>exports.SavedWorkout({session:{},controller:{feed:{history:[]}},go:()=>{}}),get saved(){return saved;},get closed(){return closed;}};
}
test('finish waits for completed server response before acknowledging save',async()=>{
 let resolve;const pending=new Promise(r=>{resolve=r;});const f=fixture(()=>pending);
 const submission=f.find(f.render(),n=>n.type==='form').props.onSubmit({preventDefault(){}});assert.equal(f.saved,null);
 resolve({id:'saved',status:'completed'});await submission;assert.equal(f.saved.id,'saved');
});
test('failed finish keeps user-entered fields and shows an inline retry error',async()=>{
 const f=fixture(async()=>null);
 f.find(f.render(),n=>n.type==='textarea').props.onChange({target:{value:'keep this note'}});
 await f.find(f.render(),n=>n.type==='form').props.onSubmit({preventDefault(){}});
 assert.equal(f.saved,null);assert.equal(f.find(f.render(),n=>n.type==='textarea').props.value,'keep this note');assert.ok(f.find(f.render(),n=>n.props?.role==='alert'));
});

test('closing a filled summary never submits or requires the pain field',()=>{
 let calls=0;const f=fixture(()=>{calls++;});
 f.find(f.render(),n=>n.type==='textarea').props.onChange({target:{value:'unsaved note'}});
 const cancel=f.find(f.render(),n=>n.type==='button'&&n.props.children==='חזרה לאימון ללא סיום');
 assert.equal(cancel.props.type,'button');cancel.props.onClick();assert.equal(f.closed,1);assert.equal(calls,0);
 const close=f.find(f.render(),n=>n.props?.['aria-label']==='סגירה');
 assert.equal(close.props.type,'button');close.props.onClick();assert.equal(f.closed,2);assert.equal(calls,0);
});

test('summary drafts survive closing and reopening without saving to server',()=>{
 let calls=0;const f=fixture(()=>{calls++;});
 const fields=(tree)=>{const form=f.find(tree,n=>n.type==='form');return [form.props.children].flat(Infinity).filter(n=>n?.type==='label').map(label=>f.find(label,n=>n.type==='input'||n.type==='textarea'));};
 const before=fields(f.render());
 ['3','7.5','draft note'].forEach((value,i)=>before[i].props.onChange({target:{value}}));
 f.find(f.render(),n=>n.props?.['aria-label']==='סגירה').props.onClick();
 assert.equal(f.find(f.render(false),n=>n.type==='Dialog').props.open,false);
 assert.deepEqual(fields(f.render(true)).map(n=>n.props.value),['3','7.5','draft note']);assert.equal(calls,0);
 const workspace=readFileSync(new URL('../components/training-workspace.tsx',import.meta.url),'utf8');
 assert.match(workspace,/<FinishWorkoutDialog key=\{session.id\} open=\{finish\}/);
 assert.doesNotMatch(workspace,/finish&&<FinishWorkoutDialog/);
});


test('saved workout keeps heading semantics and announces the confirmation separately',()=>{
 const f=fixture(async()=>null),tree=f.renderSaved();
 const heading=f.find(tree,n=>n.type==='h1');assert.ok(heading);assert.equal(heading.props.role,undefined);
 const notice=f.find(tree,n=>n.type==='p'&&n.props.role==='status');assert.ok(notice);
});
