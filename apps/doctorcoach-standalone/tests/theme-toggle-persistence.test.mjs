import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {appearanceWithMode} from '../lib/advanced-theme.ts';

// Execute the real rendered button handler. The reducer deliberately stays stale,
// as React state does until the next render: saving must receive the new value.
function toggle(context){
 const source=readFileSync(new URL('../components/theme-provider.tsx',import.meta.url),'utf8');
 const code=ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const exports={};
 const require=name=>name==='react'?{createContext:()=>({}),useContext:()=>context}:name==='react/jsx-runtime'?{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})}:name.includes('advanced-theme')?{appearanceWithMode}:{};
 vm.runInNewContext(code,{exports,require});
 return exports.ThemeToggle().props.children;
}
test('header toggle saves the newly selected mode immediately, not the stale rendered mode',async()=>{
 for(const mode of ['dark','light']){
  const old={mode,palette:'blue'},saved=[];
  const [rendered]=toggle({current:old,busy:false,signedIn:true,message:null,edit:a=>saved.push(['preview',a]),save:async a=>saved.push(['save',a])});
  const button=rendered.props;
  button.onClick();
  assert.equal(saved.length,2);assert.equal(saved[1][0],'save');
  assert.equal(saved[1][1].mode,mode==='dark'?'light':'dark');
  assert.equal(saved[1][1].palette,'blue');assert.equal(old.mode,mode);
 }
});
test('toggle is disabled during preference synchronization and exposes save failures',()=>{
 const context={current:{mode:'dark',palette:'red'},busy:true,signedIn:true,message:'failed'};
 const [button,status]=toggle(context);
 assert.equal(button.props.disabled,true);assert.equal(status.props.role,'status');assert.match(status.props.children,/נכשלה/);
});
