import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import * as jsx from 'react/jsx-runtime';
import * as navigation from '../lib/mobile-navigation.ts';
function component(file,language='he',overrides={}){
 const exports={},icons=new Proxy({},{get:(_,key)=>String(key)});
 const modules={'react/jsx-runtime':jsx,'react':{useState:v=>[typeof v==='function'?v():v,()=>{}]},'lucide-react':icons,...overrides,'../lib/mobile-navigation':navigation,'./language-provider':{Localize:'Localize',useLanguage:()=>({language})},'../components/language-provider':{Localize:'Localize',useLanguage:()=>({language})}};
 vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../components/'+file,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require:k=>modules[k]??{}});
 return exports;
}
function nodes(node,predicate){if(!node||typeof node!=='object')return [];return [...(predicate(node)?[node]:[]),...[node.props?.children].flat(Infinity).flatMap(c=>nodes(c,predicate))];}
test('More keeps account settings separate from its compact destinations',()=>{
 for(const language of ['he','en']){
  const destinations=[],tree=component('site-areas.tsx',language).MoreArea({go:s=>destinations.push(s),signedIn:true});
  const nav=nodes(tree,n=>n.type==='nav')[0];assert.equal(nav.props.className,'compact-menu');
  for(const button of nodes(nav,n=>n.type==='button'))button.props.onClick();
  assert.deepEqual(destinations,['library','learn','contact','feedback']);
  assert.equal(nodes(tree,n=>n.type==='a'&&n.props.href?.includes('signout')).length,0);
 }
});
test('returning home has no duplicate navigation gallery; public introduction remains',()=>{
 const {HomeIntroduction}=component('site-areas.tsx');
 assert.equal(HomeIntroduction({go:()=>{},completed:true,returning:true}),null);
 assert.ok(HomeIntroduction({go:()=>{},completed:false,returning:false}));
});
test('settings separate technical/account controls from the personal file',()=>{
 for(const language of ['he','en']){
  const tree=component('account-settings-hub.tsx',language).AccountSettingsHub({go:()=>{},onTour:()=>{}});
  const text=JSON.stringify(tree);
  assert.ok(!text.includes('Profile & questionnaires'));assert.ok(!text.includes('פרופיל ושאלונים'));
  assert.ok(!text.includes('Manage my documents'));assert.ok(!text.includes('ניהול המסמכים שלי'));
  assert.equal(nodes(tree,n=>n.type==='a'&&n.props.href?.includes('signout')).length,1);
 }
});
test('progress belongs to My file; account and staff pages select no unrelated main tab',()=>{
 for(const section of ['history','nutrition','recovery'])assert.equal(navigation.mobileTabFor(section),'care',section);
 for(const section of ['settings','privacy','membership','admin','team','dashboard'])assert.equal(navigation.mobileTabFor(section),undefined,section);
 for(const section of ['library','learn','contact','feedback'])assert.equal(navigation.mobileTabFor(section),'menu',section);
 assert.ok(!navigation.areaLinks.care.some(x=>x.id==='settings'));
 assert.deepEqual(navigation.traineePrimaryNav.map(x=>x.id),['home','plan','care','more']);
});

test('phone navigation keeps four controls without marking More on account pages',()=>{
 const visited=[],tree=component('site-areas.tsx').AreaMobileNav({section:'settings',go:s=>visited.push(s),openMenu:()=>{}});
 const buttons=nodes(tree,n=>n.type==='button');assert.equal(buttons.length,4);
 for(const b of buttons)b.props.onClick();
 assert.deepEqual(visited,['home','plan','care','more']);
 assert.equal(buttons[3].props['aria-current'],undefined);
});

test('persistent account shortcut opens settings and owns account-page selection in both languages',()=>{
 for(const language of ['he','en'])for(const section of ['home','settings','membership','privacy']){
  const visited=[],tree=component('site-areas.tsx',language).AccountShortcut({section,go:s=>visited.push(s)});
  const button=nodes(tree,n=>n.type==='button')[0];
  assert.ok(button.props['aria-label']);
  assert.equal(button.props['aria-current'],section==='home'?undefined:'page');
  button.props.onClick();assert.deepEqual(visited,['settings']);
 }
});

test('nested account pages return to settings instead of More',()=>{
 for(const section of ['membership','privacy']){
  const visited=[],tree=component('site-areas.tsx').AreaNavigation({section,go:s=>visited.push(s)});
  nodes(tree,n=>n.type==='button')[0].props.onClick();
  assert.deepEqual(visited,['settings']);
 }
});


test('rendered personal file exposes progress, rehabilitation and nutrition',()=>{
 const hooks={useCareResource:()=>({data:{profile:{name:'Synthetic trainee'}},loading:false}),useCareAction:()=>({})};
 const tree=component('care-workspace.tsx','he',{'../hooks/use-care':hooks}).CareWorkspace({onPlanChanged:()=>{},onEditProfile:()=>{}});
 const hub=nodes(tree,n=>n.type==='nav'&&n.props['aria-label']==='נושאים בתיק האישי')[0];
 assert.ok(hub);
 const labels=nodes(hub,n=>n.type==='strong').map(n=>n.props.children);
 for(const label of ['התקדמות','שיקום וכאב','תזונה ומדידות','פרטים ושאלונים','מסמכים ותיק רפואי'])assert.ok(labels.includes(label),label);
 assert.ok(!labels.includes('הגדרות'));
});
