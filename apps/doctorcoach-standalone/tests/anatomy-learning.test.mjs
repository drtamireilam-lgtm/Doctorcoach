import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {learningCards,exerciseMuscles,anatomyHash,readAnatomyHash,anatomyMatches,anatomyLabels,regionNames} from '../lib/anatomy-learning.ts';
import {exercises} from '../lib/content.ts';
import {platform,doctor,client} from './platform-db.mjs';
import {communityStore} from '../lib/community-store.ts';
const json=name=>JSON.parse(readFileSync(new URL('../lib/prepared/'+name+'.json',import.meta.url)));
const raw=json('muscles'),extra=json('additional-muscles');
const canonical=new Map([...raw.map(m=>[m.slug,m]),...extra.map(m=>[m.muscle_id,m])]);
// Load the same catalog module without requiring a browser or a TSX runner.
let catalogSource=readFileSync(new URL('../lib/anatomy.ts',import.meta.url),'utf8');
for(const [binding,file] of [['raw','muscles'],['extra','additional-muscles'],['regionSeed','regions'],['injurySeed','injuries'],['matrix','injury-matrix'],['movements','movements']])catalogSource=catalogSource.replace(new RegExp(`import ${binding} from '[^']+';`),`const ${binding}=${JSON.stringify(json(file))};`);
catalogSource=catalogSource.replace("import {exercises} from './content';",`const exercises=${JSON.stringify(exercises)};`).replace("import {exerciseAliases} from './rehab-exercises';",'const exerciseAliases={};');
const catalog=await import('data:text/javascript;base64,'+Buffer.from(ts.transpileModule(catalogSource,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64'));
test('all retained muscles remain searchable and have a reachable region',()=>{
 assert.equal(catalog.muscles.length,canonical.size);
 for(const m of catalog.muscles){assert.ok(canonical.has(m.slug));assert.ok(catalog.regions.some(r=>catalog.regionMuscles(r.id).some(x=>x.slug===m.slug)),m.slug);assert.ok(anatomyMatches(m,m.en));assert.ok(anatomyMatches(m,m.name));}
});
test('main muscle cards contain original bilingual attachment and training summaries',()=>{
 assert.ok(learningCards.length>=42);assert.equal(new Set(learningCards.map(c=>c.slug)).size,learningCards.length);
 for(const c of learningCards){assert.ok(canonical.has(c.slug),c.slug);assert.ok(regionNames[c.region]);for(const key of ['location','origin','insertion','action','joints','training']){assert.ok(c[key].he.trim(),c.slug+key);assert.ok(/[\u0590-\u05ff]/.test(c[key].he));assert.ok(c[key].en.trim());assert.ok(!/[\u0590-\u05ff]/.test(c[key].en),c.slug+key);}assert.ok(['medicine.uams.edu','openstax.org','rad.uw.edu','www.elsevier.com','www.lumen.luc.edu'].includes(new URL(c.source).hostname));}
 for(const region of ['shoulder','chest','upper_back_scapula','elbow','forearm','core_abdomen','hip_glute','thigh','lower_leg','cervical_neck','lower_back_spine','groin'])assert.ok(learningCards.some(c=>c.region===region),region);
});
test('bidirectional exercise links resolve canonical exercise IDs and never duplicate an exercise per muscle',()=>{
 const ids=new Set(exercises.map(e=>e.id));
 for(const c of learningCards){assert.equal(new Set(c.links.map(l=>l.id)).size,c.links.length,c.slug);for(const l of c.links){assert.ok(ids.has(l.id),c.slug+':'+l.id);assert.ok(['primary','secondary','stabilizer'].includes(l.role));assert.ok(exerciseMuscles(l.id).some(x=>x.slug===c.slug&&x.role===l.role));}}
 assert.ok(exerciseMuscles('barbell-bench').some(m=>m.slug==='pectoralis-major'&&m.role==='primary'));
 assert.ok(!learningCards.find(c=>c.slug==='biceps-femoris-short-head').links.some(l=>l.id==='rdl'));
 assert.deepEqual(exerciseMuscles('missing-exercise'),[]);
});
test('deep links preserve side, view, selection and bilingual search through reload and history',()=>{
 const expected={region:'thigh',muscle:'rectus-femoris',side:'left',view:'front',search:'ירך / femoris'};
 assert.deepEqual(readAnatomyHash(anatomyHash(expected),Object.keys(regionNames),[...canonical.keys()]),expected);
 const invalid=readAnatomyHash('#learn?region=missing&muscle=%E0%A4%A&side=invalid&view=side',Object.keys(regionNames),[...canonical.keys()]);
 assert.equal(invalid.region,'shoulder');assert.equal(invalid.muscle,undefined);assert.equal(invalid.side,'both');assert.equal(invalid.view,'front');
 assert.equal(readAnatomyHash('#learn?q='+('x'.repeat(500)),[],[]).search.length,120);
 assert.ok(anatomyMatches({name:'דו־ראשי',en:'Biceps Brachii',slug:'biceps-brachii'},' BICEPS '));
 assert.ok(anatomyMatches({name:'דו־ראשי',en:'Biceps Brachii',slug:'biceps-brachii'},'דו ראשי'));
 assert.ok(!anatomyMatches({name:'דו־ראשי',en:'Biceps Brachii',slug:'biceps-brachii'},'quadriceps'));
});
test('English and Hebrew atlas controls have identical keys and no untranslated English labels',()=>{
 assert.deepEqual(Object.keys(anatomyLabels.he),Object.keys(anatomyLabels.en));
 assert.ok(Object.values(anatomyLabels.en).every(s=>s.trim()&&!/[\u0590-\u05ff]/.test(s)));
});
test('anatomy content and illustration reports keep stable page/language context and stay owner-private',async t=>{
 const f=platform(t),store=communityStore(f.db,doctor.email),other={userId:'other',email:'other@example.test'};
 for(const [i,category] of ['טעות בתוכן','תקלה בהמחשה'].entries())await store.saveFeedback(client,{id:crypto.randomUUID(),context:'anatomy:rectus-femoris | lang:en | side:left',category,content:'Synthetic anatomy feedback',section:'anatomy',bodyRegion:'thigh'});
 assert.equal((await store.feedback(client)).items.length,2);assert.equal((await store.feedback(other)).items.length,0);await assert.rejects(()=>store.feedback(client,true),e=>e.status===403);
 const reviewed=(await store.feedback(doctor,true,{section:'anatomy'})).items;assert.equal(reviewed.length,2);assert.ok(reviewed.every(x=>x.context.includes('lang:en')&&x.bodyRegion==='thigh'));
});
