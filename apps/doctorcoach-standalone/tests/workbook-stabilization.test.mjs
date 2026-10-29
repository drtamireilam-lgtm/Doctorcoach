import test from 'node:test';
import assert from 'node:assert/strict';
import {readCsvWorkbook} from '../lib/csv-workbook.ts';
import {detectImportColumns,extractImportRows,finalizeImport} from '../lib/program-import.ts';
import {matchExerciseForImport} from '../lib/exercise-matching.ts';
const names=[
 ['bench','לחיצת חזה כנגד משקולות יד בשכיבה'],
 ['incline-machine-chest-press','לחיצת חזה עליון כנגד מכונה ייעודית'],
 ['machine-chest-press','לחיצת חזה כנגד מכונה ייעודית'],
 ['incline-db-curl','כפיפות מרפקים בישיבה כנגד משקולות יד ב45 מעלות'],
 ['hammer-curl','פטישים בעמידה'],
 ['wide-grip-cable-pulldown','משיכה באמצעות פולי עליון באחיזה רחבה במנח יד פרונציה'],
 ['triceps-pushdown','פשיטת מרפקים כנגד פולי עליון בעמידה'],
 ['back-squat','סקוואט חופשי כנגד מוט'],
 ['seated-curl','כפיפת רגליים בישיבה כנגד מכונה ייעודית'],
 ['lying-curl','כפיפת רגליים בשכיבה כנגד מכונה ייעודית'],
 ['hip-abduction-machine','הרחקת ירך כנגד מכונה ייעודית'],
 ['adduction','קירוב ירך כנגד מכונה ייעודית'],
 ['overhead-press','לחיצת כתפיים כנגד מוט באחיזה ברוחב הכתפיים'],
 ['seated-db-shoulder-press','לחיצת כתפיים כנגד משקולות יד בישיבה'],
 ['lateral-raise','הרחקת כתפיים בעמידה כנגד משקולות יד'],
 ['machine-lateral-raise','הרחקת כתפיים כנגד מכונה ייעודית'],
 ['reverse-pec-deck','הרחקת כתף אופקית כנגד מכונה ייעודית'],
];
test('detailed literal workbook names preserve existing equipment variants',()=>{
 for(const [id,name] of names)assert.equal(matchExerciseForImport(name,undefined,{allowGeneralMovement:true}).exerciseId,id,name);
 for(const name of ['האמר במנח יד פרונציה','האמר במנח יד סופינציה','high bar smith machine squat'])assert.equal(matchExerciseForImport(name).exerciseId,'',name);
});
test('standalone numbered workout heading is a block, while prescribed coded rows still need review',()=>{
 const sheet=readCsvWorkbook(new TextEncoder().encode('Exercise,Sets,Reps,Weight,Notes\nC,,,,\nLeg Curl,2,8,30,first\nC 2,,,,\nLeg Curl,3,10,40,second\nD,,,,\nLeg Curl,4,12,50,third'))[0];
 const d=detectImportColumns(sheet);const rows=extractImportRows(sheet,d.header,d.mapping);assert.equal(rows.length,3);assert.deepEqual(rows.map(r=>r.sourceDay),['C','C 2','D']);
 const items=finalizeImport(rows);assert.equal(new Set(items.map(i=>i.dayId)).size,3);assert.deepEqual(items.map(i=>i.weight),[30,40,50]);assert.deepEqual(items.map(i=>i.notes),['first','second','third']);
 const coded=readCsvWorkbook(new TextEncoder().encode('Exercise,Sets,Reps\nC 2,3,8'))[0];const h=detectImportColumns(coded);const unknown=extractImportRows(coded,h.header,h.mapping);assert.equal(unknown.length,1);assert.throws(()=>finalizeImport(unknown));
});
test('grip width and hand orientation coexist, while competing widths/orientations remain blocked',async()=>{
 const {parseExerciseQualifiers}=await import('../lib/exercise-qualifiers.ts');
 for(const s of ['wide grip pronated','narrow grip neutral','אחיזה רחבה במנח יד פרונציה'])assert.equal(parseExerciseQualifiers(s).conflict,false,s);
 for(const s of ['wide grip narrow grip','pronated supinated','neutral pronated','אחיזה רחבה אחיזה צרה'])assert.equal(parseExerciseQualifiers(s).conflict,true,s);
 assert.equal(matchExerciseForImport('unverified wide grip pronated machine exercise').exerciseId,'');
});
test('reviewed detailed names persist through draft, assignment, workouts and reopened stores',async t=>{
 const {verifyImportedWorkoutPersistence}=await import('./import-journey-helper.mjs');
 const csv='Exercise,Sets,Reps,Weight,Notes\nA,,,,\n'+names.slice(0,8).map(([,n])=>n+',2,8,20,synthetic').join('\n')+'\nC 2,,,,\n'+names.slice(8).map(([,n])=>n+',3,10,30,synthetic').join('\n');
 const sheet=readCsvWorkbook(new TextEncoder().encode(csv))[0],d=detectImportColumns(sheet);const items=finalizeImport(extractImportRows(sheet,d.header,d.mapping));assert.equal(items.length,names.length);await verifyImportedWorkoutPersistence(t,items);
});
test('compact numbered headings work but annotations and formulas cannot disappear as headings',()=>{
 const s=readCsvWorkbook(new TextEncoder().encode('Exercise,Sets,Reps,Notes\nC2,,,\nLeg Curl,2,8,\nC2,,,check this row'))[0],d=detectImportColumns(s);const r=extractImportRows(s,d.header,d.mapping);assert.equal(r.length,2);assert.equal(r[0].sourceDay,'C2');assert.equal(r[1].name,'C2');assert.equal(r[1].notes,'check this row');
 const f={name:'Sheet',rows:[[{value:'Exercise'},{value:'Sets'},{value:'Reps'}],[{value:'C2',formula:true}],[{value:'Leg Curl'},{value:'2'},{value:'8'}]]};const h=detectImportColumns(f);const rows=extractImportRows(f,h.header,h.mapping);assert.equal(rows.length,2);assert.equal(rows[0].name,'C2');assert.ok(rows[0].issues.length);
});
test('actual effort lists are preserved as source notes rather than silently used as target RPE',()=>{
 const s=readCsvWorkbook(new TextEncoder().encode('Exercise,Sets,Reps,RPE בפועל,Notes\nLeg Curl,2,8,"7,7",source note'))[0],d=detectImportColumns(s),rows=extractImportRows(s,d.header,d.mapping);assert.equal(rows[0].rpe,'');assert.equal(rows[0].notes,'source note\nRPE בפועל: 7,7');const item=finalizeImport(rows)[0];assert.equal(item.targetRpe,null);assert.equal(item.notes,rows[0].notes);
});
