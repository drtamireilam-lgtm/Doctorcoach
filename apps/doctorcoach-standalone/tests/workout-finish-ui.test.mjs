import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import * as jsx from 'react/jsx-runtime';
function fixture(patch){
 const states=[],exports={};let cursor=0,saved=null;
 const modules={'react':{useState(initial){const i=cursor++;if(!(i in states))states[i]=initial;return [states[i],v=>{states[i]=v;}];}},'react/jsx-runtime':jsx,'./language-provider':{Localize:'Localize'},'./ui/dialog':Object.fromEntries(['Dialog','DialogContent','DialogTitle','DialogDescription','DialogClose'].map(k=>[k,k])),'../lib/workout-finish':{},'../lib/training':{},'./video-workspace':{}};
 vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../components/workout-finish.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require:k=>modules[k]});
 const render=()=>{cursor=0;return exports.FinishWorkoutDialog({controller:{busy:false,patch,feed:{history:[]}},session:{},onClose:()=>{},onSaved:s=>{saved=s;}});};
 function find(node,predicate){if(!node||typeof node!=='object')return null;if(predicate(node))return node;for(const child of [node.props?.children].flat(Infinity)){const result=find(child,predicate);if(result)return result;}return null;}
 return {render,find,get saved(){return saved;}};
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
