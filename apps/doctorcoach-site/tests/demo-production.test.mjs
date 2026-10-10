import test from 'node:test';
import assert from 'node:assert/strict';
import {demoCoverage,filmingBrief} from '../lib/demo-production.ts';
const catalog=[{id:'squat',name:'סקוואט',en:'Squat',group:'רגליים',desc:'תיאור קיים',cues:['דגש ראשון','דגש שני']},{id:'row',name:'חתירה',en:'Row',group:'גב',desc:'תיאור משיכה',cues:['ללא תנופה']},{id:'press',name:'לחיצה',en:'Press',group:'כתף',desc:'תיאור לחיצה',cues:[]}];
const demo=(exerciseId,published,status='ready')=>({exerciseId,published,status,kind:'demo'});
test('coverage distinguishes public demonstrations, ready drafts and exercises without a ready listing',()=>{
 const rows=demoCoverage(catalog,[demo('squat',true),demo('squat',false),demo('row',false),demo('row',false),demo('press',false,'uploading')]);
 assert.deepEqual(rows.map(({state,published,drafts})=>({state,published,drafts})),[{state:'published',published:1,drafts:1},{state:'draft',published:0,drafts:2},{state:'missing',published:0,drafts:0}]);
});
test('review videos and retired exercise identifiers do not fabricate catalog coverage',()=>{
 const rows=demoCoverage(catalog,[{...demo('press',true),kind:'review'},demo('retired',true),demo('row',true,'deleted')]);
 assert.equal(rows.length,catalog.length);
 assert.ok(rows.every(row=>row.state==='missing'));
 assert.deepEqual(rows.map(row=>row.exercise),catalog);
});
test('filming export includes only requested exercises, exact existing cues and stable filenames',()=>{
 const rows=demoCoverage(catalog,[demo('row',false)]);
 const brief=filmingBrief(rows.filter(row=>row.exercise.id==='row'));
 assert.ok(brief.includes('חתירה / Row'));
 assert.ok(brief.includes('ללא תנופה'));
 assert.ok(brief.includes('row-demo.mp4'));
 assert.ok(brief.includes('טיוטה מוכנה'));
 assert.ok(!brief.includes('squat-demo.mp4'));
 assert.ok(brief.includes('מצב הסרטון אינו אישור קליני'));
 assert.ok(brief.includes('עד 25 MB'));
});
test('empty export remains a shooting checklist and does not add fabricated exercises or doses',()=>{
 const brief=filmingBrief([]);
 assert.ok(brief.includes('הנחיות צילום משותפות'));
 assert.ok(!brief.includes('שם קובץ מומלץ:'));
 assert.ok(!brief.includes('2 ×'));
});
