import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {appearanceWithMode,themePresets,themeTokens,colorsFor,contrast,mix,textOn} from '../lib/advanced-theme.ts';

// Execute the real rendered button handler. The reducer deliberately stays stale,
// as React state does until the next render: saving must receive the new value.
function render(context,component='ThemeToggle'){
 const source=readFileSync(new URL('../components/theme-provider.tsx',import.meta.url),'utf8');
 const code=ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const exports={};
 const require=name=>name==='react'?{createContext:()=>({}),useContext:()=>context}:name==='react/jsx-runtime'?{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})}:name.includes('advanced-theme')?{appearanceWithMode,themePresets,themeTokens,colorsFor}:name.includes('language-provider')?{useLanguage:()=>({language:'en'})}:{};
 vm.runInNewContext(code,{exports,require});
 return component==='ThemeToggle'?exports.ThemeToggle().props.children:exports.AppearancePicker({active:true});
}
test('header toggle saves the newly selected mode immediately, not the stale rendered mode',async()=>{
 for(const mode of ['dark','light']){
  const old={mode,palette:'blue'},saved=[];
  const [rendered]=render({current:old,busy:false,signedIn:true,message:null,edit:a=>saved.push(['preview',a]),save:async a=>saved.push(['save',a])});
  const button=rendered.props;
  button.onClick();
  assert.equal(saved.length,2);assert.equal(saved[1][0],'save');
  assert.equal(saved[1][1].mode,mode==='dark'?'light':'dark');
  assert.equal(saved[1][1].palette,'blue');assert.equal(old.mode,mode);
 }
});
test('toggle is disabled during preference synchronization and exposes save failures',()=>{
 const context={current:{mode:'dark',palette:'red'},busy:true,signedIn:true,message:'failed'};
 const [button,status]=render(context);
 assert.equal(button.props.disabled,true);assert.equal(status.props.role,'status');assert.match(status.props.children,/נכשלה/);
});

test('all thirteen picker buttons immediately preview and save the exact chosen appearance',()=>{
 const calls=[];
 const node=render({current:themePresets[0].appearance,busy:false,signedIn:true,message:null,edit:a=>calls.push(['edit',a]),save:a=>calls.push(['save',a])},'AppearancePicker');
 const buttons=node.props.children[2].props.children;
 assert.equal(buttons.length,13);
 for(const [i,button] of buttons.entries()){
  button.props.onClick();assert.deepEqual(calls.at(-1),['save',themePresets[i].appearance]);
  assert.deepEqual(calls.at(-2),['edit',themePresets[i].appearance]);
 }
});
test('premium gradient stops preserve readable button and surface text',()=>{
 for(const preset of themePresets){
  const a=preset.appearance,c=colorsFor(a),tokens=themeTokens(a);
  for(const color of [c.button,mix(c.button,textOn(c.button)==='#000000'?'#ffffff':'#000000',.12),...(['gold','silver'].includes(preset.id)?[mix(c.button,'#ffffff',.18)]:[])])assert.ok(contrast(tokens['--dc-button-text'],color)>=4.5,preset.name);
  assert.ok(contrast(tokens['--dc-card-text'],mix(c.secondary,c.background,.28))>=4.5,preset.name);
 }
});

test('metallic references use near-black surfaces and upgrade existing saved selections without writes',()=>{
 const oldGold={mode:'dark',palette:'yellow',custom:{background:'#14110b',primary:'#d9b65f',secondary:'#252015',button:'#d9b65f',navigation:'#14110b',accent:'#f2d691'}};
 const oldSilver={mode:'dark',palette:'neutral',custom:{background:'#10141b',primary:'#b8c5d8',secondary:'#202731',button:'#b8c5d8',navigation:'#10141b',accent:'#e1e8f4'}};
 for(const [old,id] of [[oldGold,'gold'],[oldSilver,'silver']]){
  const snapshot=structuredClone(old),preset=themePresets.find(p=>p.id===id);
  assert.deepEqual(colorsFor(old),colorsFor(preset.appearance));assert.deepEqual(old,snapshot);
  const calls=[],node=render({current:old,busy:false,signedIn:true,message:null,edit:a=>calls.push(a),save:a=>calls.push(a)},'AppearancePicker');
  assert.equal(node.props.children[2].props.children.find(b=>b.props['aria-pressed']).props.children[1],preset.name);
  assert.equal(calls.length,0);
  // Exact matching does not replace an independently edited saved theme.
  const custom={...old,custom:{...old.custom,accent:'#abcdef'}};
  assert.equal(colorsFor(custom).accent,'#abcdef');
 }
 assert.equal(colorsFor(themePresets.find(p=>p.id==='gold').appearance).background,'#08090d');
 assert.equal(colorsFor(themePresets.find(p=>p.id==='silver').appearance).secondary,'#20252d');
});
test('swatches show actual black and white and every rendered gradient stop is readable',()=>{
 assert.equal(themeTokens(themePresets.find(p=>p.id==='dark').appearance)['--dc-swatch'],'#090c12');
 assert.equal(themeTokens(themePresets.find(p=>p.id==='light').appearance)['--dc-swatch'],'#ffffff');
 for(const p of themePresets){const t=themeTokens(p.appearance);assert.ok(contrast(t['--dc-card-line'],colorsFor(p.appearance).secondary)>=3,p.name+' control border');
  for(const color of t['--dc-button-gradient'].match(/#[0-9a-f]{6}/g))assert.ok(contrast(t['--dc-button-text'],color)>=4.5,`${p.name}: ${color}`);
  for(const color of t['--dc-surface-gradient'].match(/#[0-9a-f]{6}/g))assert.ok(contrast(t['--dc-card-text'],color)>=4.5,`${p.name}: ${color}`);
 }
});
