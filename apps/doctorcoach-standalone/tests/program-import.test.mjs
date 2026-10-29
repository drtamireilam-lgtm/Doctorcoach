import test from 'node:test';
import assert from 'node:assert/strict';
import {zipSync,strToU8} from 'fflate';
import {randomUUID} from 'node:crypto';
import {readExcelWorkbook} from '../lib/excel-workbook.ts';
import {detectImportColumns,extractImportRows,finalizeImport,importRowItem,matchImportExercise} from '../lib/program-import.ts';
import {parsePlanItem,repetitionLabel} from '../lib/training.ts';
import {platform,client,coach} from './platform-db.mjs';
import {coachDraftStore} from '../lib/coach-drafts.ts';
const cell=(value,formula=false)=>({value:String(value),formula});
const sheet=()=>({name:'Block',rows:[['exercise','sets','reps','RPE','weight','tempo','notes'].map(v=>cell(v)),['A'].map(v=>cell(v)),['Leg Press',3,'6-8.',7,'','3-0-2-0','Keep control'].map(v=>cell(v)),['D'].map(v=>cell(v)),['Hip Thrust',4,'10-12.',7,30,'',''].map(v=>cell(v))]});
const rows=()=>{const s=sheet(),d=detectImportColumns(s);return extractImportRows(s,d.header,d.mapping);};
const zip=(xml,strings='')=>zipSync({'xl/workbook.xml':strToU8('<workbook xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Training" sheetId="1" r:id="rId1"/></sheets></workbook>'),'xl/_rels/workbook.xml.rels':strToU8('<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>'),'xl/worksheets/sheet1.xml':strToU8(xml),...(strings?{'xl/sharedStrings.xml':strToU8(strings)}:{})});

test('OOXML reads shared, inline, rich strings and formula markers without evaluating content',()=>{
 const data=zip('<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="inlineStr"><is><t>sets</t></is></c></row><row r="2"><c r="A2" t="inlineStr"><is><r><t>Hip </t></r><r><t>Thrust</t></r></is></c><c r="B2"><f>1+2</f><v>3</v></c></row></sheetData></worksheet>','<sst><si><t>exercise &amp; name</t></si></sst>');
 const s=readExcelWorkbook(data)[0];assert.equal(s.rows[0][0].value,'exercise & name');assert.equal(s.rows[1][0].value,'Hip Thrust');assert.equal(s.rows[1][1].formula,true);assert.equal(s.rows[1][1].value,'3');
});
test('oversized, invalid XML entities and large sparse sheets are rejected',()=>{
 assert.throws(()=>readExcelWorkbook(new Uint8Array(5*1024*1024+1)));
 assert.throws(()=>readExcelWorkbook(zip('<!DOCTYPE x [<!ENTITY y "boom">]><worksheet/>')));
 assert.throws(()=>readExcelWorkbook(zip('<worksheet><sheetData><row r="9999"><c r="A9999"><v>1</v></c></row></sheetData></worksheet>')));
 assert.throws(()=>readExcelWorkbook(zip('<worksheet>'+ ' '.repeat(4*1024*1024)+'</worksheet>')));
});
test('headers, days, ranges, effort, tempo, notes and blank weights preserve source meaning',()=>{
 const r=rows();assert.equal(r.length,2);assert.deepEqual(r.map(i=>i.dayId),['1','2']);
 const items=finalizeImport(r);assert.equal(items[0].reps,6);assert.equal(items[0].repsMax,8);assert.equal(repetitionLabel(items[0]),'6–8');assert.equal(items[0].weightUnspecified,true);assert.equal(items[0].targetRpe,7);assert.equal(items[1].weight,30);assert.deepEqual(items[0].tempo,{eccentric:3,bottom:0,concentric:2,top:0});assert.equal(items[0].notes,'Keep control');
});
test('ambiguous names, formulas, duplicate rows and invalid values cannot silently publish',()=>{
 assert.equal(matchImportExercise('squats'),'movement-squat');assert.equal(matchImportExercise('overheard press'),'movement-overhead-press');
 const r=rows();assert.ok(finalizeImport([{...r[0],exerciseId:''}])[0].customExercise);
 assert.throws(()=>finalizeImport([{...r[0],issues:['Formula requires manual values']}]));
 assert.throws(()=>finalizeImport([r[0],r[0]]));
 for(const patch of [{reps:'8-101'},{reps:'six'},{sets:'0'},{rpe:'7',rir:'2'},{weight:'=1+1'},{tempo:'3-0-2'}])assert.throws(()=>importRowItem({...r[0],...patch}));
 const s=sheet();s.rows[2][1].formula=true;const d=detectImportColumns(s);assert.ok(extractImportRows(s,d.header,d.mapping)[0].issues.length);
 r[1].ignored=true;assert.equal(finalizeImport(r).length,1);
});
test('RIR zero, explicit weight zero, Hebrew columns and timed units are read distinctly',()=>{
 const s={name:'Plan',rows:[['תרגיל','סטים','חזרות','RIR','משקל','יחידת מידה'].map(v=>cell(v)),['Leg Press',3,8,0,0,'חזרות'].map(v=>cell(v))]};
 const d=detectImportColumns(s);const r=extractImportRows(s,d.header,d.mapping);const item=finalizeImport(r)[0];assert.equal(item.targetRpe,10);assert.equal(item.effortScale,'rir');assert.equal(item.weightUnspecified,false);
 assert.equal(importRowItem({...r[0],exerciseId:'balance',reps:'30',unit:'seconds',rir:''}).unit,'seconds');
});
test('rep range validation rejects invalid units and preserves optional legacy prescriptions',()=>{
 assert.throws(()=>parsePlanItem({exerciseId:'leg-press',reps:8,repsMax:6}));
 assert.throws(()=>parsePlanItem({exerciseId:'leg-press',reps:8,repsMax:10,unit:'seconds'}));
 assert.equal(parsePlanItem({exerciseId:'leg-press',reps:8}).repsMax,undefined);
});
test('import draft stays unpublished until coach assignment; range persists into workout snapshots',async t=>{
 const f=platform(t);await f.connect();const items=finalizeImport(rows());const draft={action:'save',version:0,requestId:randomUUID(),title:'Imported test',items,revisionOf:null};
 const drafts=coachDraftStore(f.db,f.care);await drafts.save(coach,client.userId,draft);
 assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM care_programs').get().n,0);
 const stored=await drafts.get(coach,client.userId);assert.deepEqual(stored.draft.items,items);
 await assert.rejects(()=>drafts.save(client,client.userId,draft),e=>e.status===403);
 await f.care.assign(coach,client.userId,{id:draft.requestId,title:draft.title,items});
 const session=await f.training.start(client.userId,{requestId:randomUUID(),dayId:'1',before:0});
 assert.equal(session.items[0].repsMax,8);assert.equal(session.items[0].weightUnspecified,true);assert.equal(session.items[0].results[0].amount,6);
});
test('independent range and unset weight survive storage and can be cleared explicitly',async t=>{
 const f=platform(t);await f.connect();const item=finalizeImport(rows())[0];await f.training.savePlan(client.userId,item);
 let saved=(await f.training.getPlan(client.userId))[0];assert.equal(saved.repsMax,8);assert.equal(saved.weightUnspecified,true);
 await f.training.savePlan(client.userId,{exerciseId:item.exerciseId,repsMax:null,weight:20});saved=(await f.training.getPlan(client.userId))[0];assert.equal(saved.repsMax,undefined);assert.equal(saved.weightUnspecified,undefined);assert.equal(saved.weight,20);
});

test('imported pound warmups persist through coach draft, assignment and trainee workout reopening',async t=>{
 const f=platform(t);await f.connect();
 const s={name:'Day A',rows:[['Exercise','Sets','Reps','Weight','Weight Unit','Warmup sets'],['Leg Press',3,'18-6',100,'lb','10@45;65x5']].map(r=>r.map(v=>cell(v)))};
 const d=detectImportColumns(s),items=finalizeImport(extractImportRows(s,d.header,d.mapping));
 const drafts=coachDraftStore(f.db,f.care);
 await drafts.save(coach,client.userId,{action:'save',version:0,requestId:randomUUID(),title:'Pound source',items,revisionOf:null});
 const saved=(await coachDraftStore(f.db,f.care).get(coach,client.userId)).draft;
 assert.equal(saved.items[0].warmupSets[0].weight,45*.45359237);
 await f.care.assign(coach,client.userId,{id:randomUUID(),title:saved.title,items:saved.items});
 const session=await f.training.start(client.userId,{requestId:randomUUID(),dayId:'1',before:0});
 const item=session.items[0];assert.equal(item.weight,100*.45359237);assert.equal(item.reps,6);assert.equal(item.repsMax,18);
 assert.equal(item.warmupResults[0].weight,45*.45359237);assert.equal(item.warmupResults[1].weight,65*.45359237);
 const reopened=await f.training.feed(client.userId);assert.equal(reopened.active.id,session.id);
 assert.deepEqual(reopened.active.items[0].warmupResults,item.warmupResults);
});
