import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import * as jsx from 'react/jsx-runtime';
import * as splits from '../lib/program-split.ts';

const source=readFileSync(new URL('../components/program-split-picker.tsx',import.meta.url),'utf8');
function fixture(onSave){
 const states=[],exports={};let cursor=0,continued=0;
 const modules={'react':{useState(initial){const i=cursor++;if(!(i in states))states[i]=initial;return [states[i],v=>{states[i]=typeof v==='function'?v(states[i]):v;}];}},'react/jsx-runtime':jsx,'./ui/dialog':Object.fromEntries(['Dialog','DialogContent','DialogTitle','DialogDescription','DialogClose'].map(k=>[k,k])),'./language-provider':{Localize:'Localize'},'../lib/program-split':splits};
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require:k=>modules[k]});
 function render(){cursor=0;return exports.ProgramSplitPicker({value:null,busy:false,onSave,onSaved:()=>continued++});}
 function find(node,predicate){if(!node||typeof node!=='object')return null;if(predicate(node))return node;for(const child of [node.props?.children].flat(Infinity)){const found=find(child,predicate);if(found)return found;}return null;}
 function click(text){const button=find(render(),n=>n.type==='button'&&n.props.children===text);assert.ok(button,text);button.props.onClick();}
 const flush=async()=>{for(let i=0;i<4;i++)await new Promise(r=>setImmediate(r));};
 return {click,flush,render,find,get continued(){return continued;}};
}
const save='שמירת החלוקה והמשך לבחירת תרגילים';
test('split success closes the dialog and advances to exercises once',async()=>{
 const f=fixture(async()=>true);f.click('הכנת תוכנית אימון');f.click(save);await f.flush();
 assert.equal(f.find(f.render(),n=>n.type==='Dialog').props.open,false);assert.equal(f.continued,1);
});
test('rejected split displays the server error inside the dialog without advancing',async()=>{
 const f=fixture(async()=>{throw Error('Complete health consent');});f.click('הכנת תוכנית אימון');f.click(save);await f.flush();
 assert.equal(f.find(f.render(),n=>n.props?.role==='alert').props.children,'Complete health consent');assert.equal(f.find(f.render(),n=>n.type==='Dialog').props.open,true);assert.equal(f.continued,0);
});
test('unconfirmed split result displays a retry message and leaves the dialog open',async()=>{
 const f=fixture(async()=>null);f.click('הכנת תוכנית אימון');f.click(save);await f.flush();
 assert.ok(f.find(f.render(),n=>n.props?.role==='alert'));assert.equal(f.find(f.render(),n=>n.type==='Dialog').props.open,true);assert.equal(f.continued,0);
});
