import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {platform} from './platform-db.mjs';
import {appearanceStore} from '../lib/appearance-store.ts';
import {defaultAppearance,isAppearance,isHexColor,isCustomColors,canonicalAppearance,parseOwnedAppearanceResponse} from '../lib/appearance.ts';
import {themeTokens,colorsFor,fromPrimary,contrast,themePresets,resetAppearance,themeEditReducer,textOn,swatchFamilies,appearanceWithMode} from '../lib/advanced-theme.ts';
const custom={background:'#000000',primary:'#FFFFFF',secondary:'#FFFFFF',button:'#FDE047',navigation:'#DC2626',accent:'#DDDDDD'};
const appearance={mode:'dark',palette:'red',custom};

test('only complete bounded hex colors are accepted, normalized and persisted',()=>{
 assert.ok(isAppearance(appearance));assert.ok(isCustomColors(custom));
 assert.equal(canonicalAppearance(appearance).custom.primary,'#ffffff');
 for(const color of ['#fff','#00000000','red','transparent','url(x)','#000000;display:none',{},null,123])assert.equal(isHexColor(color),false);
 for(const custom of [{},{...appearance.custom,background:'red'},{...appearance.custom,evil:'#000000'},null,[],{background:'#fff'}])assert.equal(isAppearance({...appearance,custom}),false);
 assert.ok(isAppearance({mode:'light',palette:'blue'}),'legacy preference still valid');
 assert.equal(canonicalAppearance({...appearance,userId:'forged',role:'admin'}).userId,undefined);
});
test('text and accent contrast adapt to extreme independent surface choices',()=>{
 for(let i=0;i<256;i++){const gray='#'+i.toString(16).padStart(2,'0').repeat(3);assert.ok(contrast(textOn(gray),gray)>=4.5,gray);}
 const colors=['#000000','#ffffff','#808080','#fde047','#dc2626','#2563eb','#9333ea','#14b8a6'];
 for(const background of colors)for(const secondary of colors){
  const a={...appearance,custom:{...custom,background,secondary,navigation:secondary,button:background,accent:secondary}};
  const t=themeTokens(a);
  for(const [fg,bg] of [['--text',background],['--muted',background],['--accent-red',background],['--dc-card-text',secondary],['--dc-card-muted',secondary],['--dc-card-accent',secondary],['--dc-nav-text',secondary],['--dc-nav-accent',secondary],['--dc-button-text',background]])assert.ok(contrast(t[fg],bg)>=4.5,`${fg} on ${bg}: ${contrast(t[fg],bg)}`);
 }
 for(const p of themePresets){const t=themeTokens(p.appearance),c=colorsFor(p.appearance);assert.ok(contrast(t['--text'],c.background)>=4.5);}
 assert.equal(themePresets.length,18);
 for(const name of ['Dark','Light','Dark Blue','Purple','Wine Red','Yellow','Forest Green'])assert.ok(themePresets.some(p=>p.name===name),name);assert.equal(swatchFamilies.length,10);assert.ok(swatchFamilies.every(f=>f.slice(2).every(isHexColor)));
 for(const mode of ['dark','light'])for(const c of colors){const t=themeTokens({mode,palette:'blue',custom:fromPrimary(c,mode)});assert.ok(contrast(t['--dc-button-text'],c)>=4.5);}
});
test('instant preview and Cancel restore saved state; Reset remains unsaved until Apply succeeds',()=>{
 const original={mode:'light',palette:'blue'};
 let s={saved:original,draft:null,preview:false};
 s=themeEditReducer(s,{type:'edit',appearance});assert.deepEqual(s.saved,original);assert.deepEqual(s.draft,appearance);assert.equal(s.preview,true);
 s=themeEditReducer(s,{type:'preview'});assert.deepEqual(s.saved,original);
 s=themeEditReducer(s,{type:'cancel'});assert.deepEqual(s,{saved:original,draft:null,preview:false});
 s=themeEditReducer(s,{type:'edit',appearance:resetAppearance});assert.deepEqual(s.saved,original);
 s=themeEditReducer(s,{type:'commit',appearance:resetAppearance});assert.deepEqual(s.saved,resetAppearance);assert.equal(s.draft,null);
 s=themeEditReducer(s,{type:'edit',appearance});s=themeEditReducer(s,{type:'load',appearance:original});assert.equal(s.draft,null);assert.deepEqual(s.saved,original);
});
test('custom preferences survive store recreation/relogin, remain owner-only and respect concurrency',async t=>{
 const f=platform(t),a=appearanceStore(f.db);
 await a.save('owner-A',{appearance,version:0,expectedOwnerId:'owner-A',userId:'owner-B'});
 const saved=await appearanceStore(f.db).get('owner-A');assert.deepEqual(saved.appearance,canonicalAppearance(appearance));assert.equal(saved.version,1);
 assert.deepEqual(await a.get('owner-B'),{appearance:null,version:0});
 await assert.rejects(()=>a.save('owner-B',{appearance,version:0,expectedOwnerId:'owner-A'}),e=>e.status===409);
 assert.deepEqual(await a.get('owner-B'),{appearance:null,version:0});
 await a.save('owner-A',{appearance:{...appearance,custom:{...custom,button:'#000000'}},version:1,expectedOwnerId:'owner-A'});
 await assert.rejects(()=>a.save('owner-A',{appearance,version:1,expectedOwnerId:'owner-A'}),e=>e.status===409);
 assert.equal((await a.get('owner-A')).appearance.custom.button,'#000000');
 await a.save('owner-B',{appearance:{mode:'light',palette:'neutral'},version:0,expectedOwnerId:'owner-B'});
 assert.equal((await a.get('owner-A')).appearance.custom.button,'#000000');assert.equal((await a.get('owner-B')).appearance.custom,undefined);
});
test('invalid custom payloads cannot overwrite saved colors; deletion and malformed storage fail closed',async t=>{
 const f=platform(t),store=appearanceStore(f.db);await store.save('a',{appearance,version:0});
 for(const custom of [{...appearance.custom,button:'url(https://example.invalid)'},null,{...appearance.custom,extra:'#123456'}])await assert.rejects(()=>store.save('a',{appearance:{...appearance,custom},version:1}));
 assert.equal((await store.get('a')).version,1);
 f.sql.prepare("INSERT INTO account_deletions(user_id,request_id,state,reviewer_id,started_at) VALUES('a','delete-a','deleting','admin','2026-10-18')").run();
 await assert.rejects(()=>store.save('a',{appearance,version:1}));
 await store.save('corrupt',{appearance,version:0});f.sql.prepare("UPDATE appearance_preferences SET custom_json='not-json' WHERE user_id='corrupt'").run();
 await assert.rejects(()=>store.get('corrupt'),e=>e.status===500);
});
test('additive migration preserves existing preferences, versions and deletion guard triggers',()=>{
 const sql=new DatabaseSync(':memory:');try{
 const dir=new URL('../drizzle/',import.meta.url);for(const f of readdirSync(dir).filter(f=>/^\d+.*\.sql$/.test(f)&&parseInt(f,10)<51).sort())sql.exec(readFileSync(new URL(f,dir),'utf8'));
 sql.prepare("INSERT INTO appearance_preferences(user_id,mode,palette,version,updated_at) VALUES('old','dark','purple',12,'before')").run();
 sql.exec(readFileSync(new URL('0051_advanced_appearance.sql',dir),'utf8'));
 assert.deepEqual({...sql.prepare("SELECT * FROM appearance_preferences WHERE user_id='old'").get()},{user_id:'old',mode:'dark',palette:'purple',version:12,updated_at:'before',custom_json:null});
 assert.equal(sql.prepare("SELECT count(*) AS n FROM sqlite_master WHERE type='trigger' AND name LIKE 'deletion_guard_appearance_%'").get().n,2);
 }finally{sql.close();}
});
test('API responses need a verified owner, and preview code never caches custom colors globally',()=>{
 assert.equal(parseOwnedAppearanceResponse({ownerId:'a',appearance,version:2}).ownerId,'a');
 for(const ownerId of [null,'',undefined,123,'x'.repeat(513)])assert.throws(()=>parseOwnedAppearanceResponse({ownerId,appearance,version:2}));
 const component=readFileSync(new URL('../components/theme-provider.tsx',import.meta.url),'utf8');
 assert.match(component,/expectedOwnerId/);assert.match(component,/data.ownerId!==expectedOwnerId/);assert.match(component,/request!==sequence.current/);
 assert.doesNotMatch(component,/localStorage\.getItem/);assert.match(component,/same-origin/);
 const route=readFileSync(new URL('../app/api/preferences/appearance/route.ts',import.meta.url),'utf8');assert.match(route,/getChatGPTUser/);assert.match(route,/user\.userId/);
});

test('light/dark changes update surfaces while retaining primary, button and accent choices',()=>{
 assert.equal(appearanceWithMode(appearance,'dark'),appearance);
 const next=appearanceWithMode(appearance,'light');
 assert.equal(next.mode,'light');assert.notEqual(next.custom.background,custom.background);
 for(const key of ['primary','button','accent'])assert.equal(next.custom[key],custom[key]);
 assert.deepEqual(appearanceWithMode({mode:'dark',palette:'blue'},'light'),{mode:'light',palette:'blue'});
});

test('every required preset persists independently with readable surface and control tokens',async t=>{
 const f=platform(t),store=appearanceStore(f.db);
 for(const preset of themePresets){
  const owner=`preset-${preset.id}`;
  await store.save(owner,{appearance:preset.appearance,version:0,expectedOwnerId:owner});
  const saved=await appearanceStore(f.db).get(owner);
  assert.deepEqual(saved.appearance,canonicalAppearance(preset.appearance));
  const c=colorsFor(saved.appearance),v=themeTokens(saved.appearance);
  for(const [fg,bg] of [['--text',c.background],['--dc-card-text',c.secondary],['--dc-nav-text',c.navigation],['--dc-button-text',c.button]])assert.ok(contrast(v[fg],bg)>=4.5,`${preset.name}: ${fg}`);
 }
});


test('premium UI keeps shared surface tokens and preserves reduced-motion/mobile support',()=>{
 const css=readFileSync(new URL('../app/advanced-themes.css',import.meta.url),'utf8')+readFileSync(new URL('../app/apple-premium.css',import.meta.url),'utf8');
 for(const token of ['--dc-premium-radius','--dc-premium-elevation','--dc-surface-gradient','--dc-nav-active','--dc-focus'])assert.ok(css.includes(token),token);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/@media\s*\(max-width:600px\)/);
 assert.match(css,/\.mobile-bottom-nav button\.active/);
 const wine=themePresets.find(p=>p.id==='wine');
 assert.ok(wine,'Wine Red preset exists');
 assert.equal(wine.appearance.custom.background,'#130b13');
 assert.equal(wine.appearance.custom.secondary,'#211521');
 assert.equal(wine.appearance.custom.button,'#e83f70');
 const tokens=themeTokens(wine.appearance);
 assert.ok(contrast(tokens['--dc-card-text'],wine.appearance.custom.secondary)>=4.5);
 assert.ok(contrast(tokens['--dc-button-text'],wine.appearance.custom.button)>=4.5);
});

test('curated clinical palettes retain the navy teal champagne reference and distinct accessible choices',()=>{
 const ids=['medical-premium','ocean-slate','sage-stone','ivory-champagne','midnight-lavender'];
 for(const id of ids){const p=themePresets.find(p=>p.id===id);assert.ok(p,id);assert.ok(isAppearance(p.appearance));for(const mode of ['dark','light']){const a=appearanceWithMode(p.appearance,mode),c=colorsFor(a),tokens=themeTokens(a);assert.ok(contrast(tokens['--dc-home-action'],c.background)>=4.5,id+' action contrast');assert.ok(contrast(tokens['--dc-card-text'],c.secondary)>=4.5,id+' card contrast');}}
 const reference=colorsFor(themePresets.find(p=>p.id==='medical-premium').appearance);assert.equal(reference.background,'#0c1523');assert.equal(reference.secondary,'#1a2a3a');assert.equal(reference.button,'#edce97');assert.equal(reference.accent,'#8dcac8');
 assert.equal(new Set(themePresets.map(p=>p.id)).size,themePresets.length);
 assert.equal(resetAppearance,defaultAppearance);
});
