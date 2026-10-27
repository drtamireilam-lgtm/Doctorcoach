import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as theme from '../lib/advanced-theme.ts';

test('raised controls, navigation and chart labels stay readable for every preset and independent custom surface',()=>{
 const appearances=[...theme.themePresets.map(p=>p.appearance),...['#000000','#ffffff','#808080','#ff0000','#00ff00'].map(c=>({mode:'dark',palette:'red',custom:{background:c,secondary:c,navigation:c,button:c,primary:c,accent:c}}))];
 for(const a of appearances){
  const t=theme.themeTokens(a),c=theme.colorsFor(a);
  assert.notEqual(t['--dc-raised'],c.secondary,'nested controls need a separate surface');
  for(const [fg,bg] of [['--dc-raised-text','--dc-raised'],['--dc-raised-muted','--dc-raised'],['--dc-nav-text','--dc-nav-surface'],['--dc-chart-1','--card'],['--dc-chart-2','--card']]){
   assert.ok(t[bg]&&t[fg],`${fg}/${bg} is defined`);
   assert.ok(theme.contrast(t[fg],t[bg])>=4.5,`${fg} on ${bg}`);
  }
  assert.ok(t['--dc-hairline']);assert.ok(t['--dc-shadow-card']);
 }
});

function picker(current,{busy=false,signedIn=true,language='en'}={}){
 const exports={},calls=[];
 const context={current,busy,signedIn,message:null,edit:a=>calls.push(['edit',a]),save:a=>calls.push(['save',a])};
 const modules={'react':{createContext:()=>({}),useContext:()=>context},'react/jsx-runtime':{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})},'lucide-react':{},'./language-provider':{useLanguage:()=>({language})},'../lib/advanced-theme':theme};
 vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../components/theme-provider.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require:k=>modules[k]??{}});
 return {tree:exports.AppearancePicker({active:true}),calls};
}
function nodes(n,predicate){return !n||typeof n!=='object'?[]:[...(predicate(n)?[n]:[]),...[n.props?.children].flat(Infinity).flatMap(c=>nodes(c,predicate))];}
test('each theme choice exposes a named miniature app and saves the exact preset on one tap',()=>{
 for(const language of ['he','en']){
  const {tree,calls}=picker(theme.themePresets[7].appearance,{language});
  const buttons=nodes(tree,n=>n.type==='button');assert.equal(buttons.length,theme.themePresets.length);
  for(const [i,b] of buttons.entries()){
   assert.equal(b.props['aria-label'],language==='en'?theme.themePresets[i].name:theme.themePresets[i].he);
   const preview=nodes(b,n=>n.props.className==='theme-miniature')[0];
   assert.ok(preview);assert.equal(String(preview.props['aria-hidden']),'true');
   for(const cls of ['theme-mini-nav','theme-mini-card','theme-mini-button','theme-mini-text'])assert.ok(nodes(preview,n=>n.props.className===cls).length,cls);
   b.props.onClick();assert.deepEqual(calls.at(-1),['save',theme.themePresets[i].appearance]);
   assert.equal(b.props['aria-pressed'],i===7);
  }
 }
});
test('unavailable account or pending synchronization disables all theme choices; custom appearance is retained',()=>{
 const custom={mode:'dark',palette:'blue',custom:theme.fromPrimary('#123456','dark')};
 for(const options of [{busy:true},{signedIn:false}]){
  const {tree}=picker(custom,options),buttons=nodes(tree,n=>n.type==='button');
  assert.equal(buttons.length,theme.themePresets.length);assert.ok(buttons.every(b=>b.props.disabled));
  assert.ok(buttons.every(b=>!b.props['aria-pressed']));
 }
 assert.deepEqual(theme.colorsFor(custom),custom.custom);
});

// A custom accent matching the default second series must still be distinguishable.
test('custom chart accents cannot collapse two series to the same color',()=>{
 for(const background of ['#000000','#ffffff','#808080','#211521']){
  const t=theme.themeTokens({mode:'dark',palette:'blue',custom:{background,secondary:background,navigation:background,button:'#75b9d4',primary:'#75b9d4',accent:'#75b9d4'}});
  assert.notEqual(t['--dc-chart-1'],t['--dc-chart-2']);
 }
});

test('performance legend describes stroke styles instead of hardcoded theme colors',()=>{
 const exports={};
 const modules={'react':{useMemo:f=>f(),useState:v=>[v,()=>{}]},'react/jsx-runtime':{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})},'../lib/performance':{performancePoints:()=>[],performanceSummary:()=>({best:null,last:null,isPr:false})}};
 vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../components/performance-workspace.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require:k=>modules[k]??{}});
 const legend=nodes(exports.PerformancePanel({history:[]}),n=>n.props.className==='chart-legend')[0];
 const text=JSON.stringify(legend);
 assert.ok(text.includes('קו רציף: e1RM'));assert.ok(text.includes('קו מקווקו: משקל עבודה'));
 assert.ok(!text.includes('אדום:'));assert.ok(!text.includes('אפור:'));
});
