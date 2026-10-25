import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {zipSync,strToU8} from 'fflate';
import {readCsvWorkbook} from '../lib/csv-workbook.ts';
import {readExcelWorkbook} from '../lib/excel-workbook.ts';
import {pdfPageTable} from '../lib/pdf-program-table.ts';
import {detectImportColumns,extractImportRows,extractWorkbookImport,finalizeImport} from '../lib/program-import.ts';
import {coachDraftStore} from '../lib/coach-drafts.ts';
import {platform,client,coach} from './platform-db.mjs';
const parse=s=>{const d=detectImportColumns(s);return extractImportRows(s,d.header,d.mapping);};
const bytes=s=>new TextEncoder().encode(s);

test('CSV title, named days, repeated canonical exercises and pound warmups survive assignment and set reload',async t=>{
 const s=readCsvWorkbook(bytes('Training plan, week 1\nExercise;Sets;Reps;Weight;Weight Unit;Warmup sets;Notes\nDay A - Upper body\nLeg Press;3;18-6;100;lb;10@45;steady, controlled\nWorkout B: Lower body\nHip Thrust;4;8;40;kg;;pause\nLeg Press;2;8;80;lb;5@45;repeat deliberately'))[0];
 const items=finalizeImport(parse(s));assert.equal(items.length,3);assert.deepEqual(items.map(x=>x.dayId),['1','2','2']);assert.equal(items[0].repsMax,18);assert.equal(items[0].warmupSets[0].weight,45*.45359237);
 const f=platform(t);await f.connect();const drafts=coachDraftStore(f.db,f.care);
 await drafts.save(coach,client.userId,{action:'save',requestId:randomUUID(),version:0,title:'Synthetic CSV',items,revisionOf:null});
 const saved=(await coachDraftStore(f.db,f.care).get(coach,client.userId)).draft;assert.deepEqual(saved.items,items);
 await f.care.assign(coach,client.userId,{id:randomUUID(),title:saved.title,items:saved.items});
 const session=await f.training.start(client.userId,{requestId:randomUUID(),dayId:'2',before:0});assert.equal(session.items.length,2);
 const repeated=session.items[1];assert.equal(repeated.exerciseId,items[0].exerciseId);assert.notEqual(repeated.occurrenceId,items[0].occurrenceId);
 await f.training.patch(client.userId,{id:session.id,version:session.version,action:'set',exerciseId:repeated.exerciseId,occurrenceId:repeated.occurrenceId,setIndex:0,done:true,amount:8,weight:41,actualRpe:8});
 const reopened=(await f.training.feed(client.userId)).active;assert.equal(reopened.items[1].results[0].weight,41);assert.equal(reopened.items[1].results[0].done,true);assert.equal(reopened.items[0].results[0].done,false);assert.equal(reopened.items[1].warmupResults[0].weight,45*.45359237);
});

function workbook(sheets){
 const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
 const files={'xl/workbook.xml':strToU8('<workbook><sheets>'+sheets.map((_,i)=>`<sheet name="Day ${i+1}" id="r${i+1}"/>`).join('')+'</sheets></workbook>'),'xl/_rels/workbook.xml.rels':strToU8('<Relationships>'+sheets.map((_,i)=>`<Relationship Id="r${i+1}" Target="worksheets/sheet${i+1}.xml"/>`).join('')+'</Relationships>')};
 sheets.forEach((rows,i)=>{files[`xl/worksheets/sheet${i+1}.xml`]=strToU8('<worksheet><sheetData>'+rows.map((r,y)=>`<row r="${y+1}">`+r.map((v,x)=>`<c r="${String.fromCharCode(65+x)}${y+1}" t="inlineStr"><is><t>${escape(v)}</t></is></c>`).join('')+'</row>').join('')+'</sheetData></worksheet>');});return zipSync(files);
}
test('real XLSX with mixed table widths and multiple sheets keeps all days and every repeated occurrence',()=>{
 const sheets=readExcelWorkbook(workbook([[['Exercise','Sets'],['Day A - Upper body'],['Leg Press','3x18-6'],['Workout B: Lower body'],['Exercise','Sets','Reps'],['Hip Thrust',4,10]],[['Exercise','Sets','Reps'],['Hip Thrust',2,8]]]));
 const items=finalizeImport(extractWorkbookImport(sheets,[1,0]));assert.equal(items.length,3);assert.deepEqual(items.map(x=>x.dayId),['1','2','3']);assert.deepEqual(items.map(x=>x.sets),[3,4,2]);assert.equal(items[0].repsMax,18);assert.equal(new Set(items.map(x=>x.occurrenceId)).size,3);
});

test('PDF text tables can repeat headers in a new column order without losing the first block',()=>{
 const token=(str,x,y,width=30)=>({str:String(str),x,y,width,height:10,dir:'ltr'});
 const s=pdfPageTable([token('Exercise',20,700,50),token('Sets',210,700),token('Reps',270,700),token('Day A - Upper body',20,680,110),token('Leg Press',20,660,60),token(3,210,660,6),token('18-6',270,660),token('Workout B: Lower body',20,640,120),token('Reps',20,620),token('Exercise',210,620,50),token('Sets',270,620),token(10,20,600,12),token('Hip Thrust',210,600,55),token(4,270,600,6)],1);
 const items=finalizeImport(parse(s));assert.equal(items.length,2);assert.deepEqual(items.map(x=>x.dayId),['1','2']);assert.equal(items[0].repsMax,18);assert.equal(items[1].sets,4);assert.equal(items[1].reps,10);
});

test('observed mixed-language aliases retain canonical IDs and repeated occurrences through draft, assignment and reload',async t=>{
 const sheet=readCsvWorkbook(bytes('Exercise,Sets,Reps,Weight\ndumbbell flat press,2,6-18,20\nלחיצת חזה עם משקולות,3,8,22\nHip addaction machine,2,10,30\nleg curls בשכיבה,2,12,25'))[0];
 const items=finalizeImport(parse(sheet));assert.deepEqual(items.map(i=>i.exerciseId),['bench','bench','adduction','lying-curl']);
 assert.equal(items[0].repsMax,18);assert.equal(new Set(items.map(i=>i.occurrenceId)).size,4);
 const f=platform(t);await f.connect();const drafts=coachDraftStore(f.db,f.care);
 await drafts.save(coach,client.userId,{action:'save',requestId:randomUUID(),version:0,title:'Synthetic alias journey',items,revisionOf:null});
 const saved=(await drafts.get(coach,client.userId)).draft;await f.care.assign(coach,client.userId,{id:randomUUID(),title:saved.title,items:saved.items});
 const session=await f.training.start(client.userId,{requestId:randomUUID(),dayId:'1',before:0});
 const item=session.items[1];await f.training.patch(client.userId,{id:session.id,version:session.version,action:'set',exerciseId:item.exerciseId,occurrenceId:item.occurrenceId,setIndex:0,done:true,amount:8,weight:23,actualRpe:8});
 const reopened=(await f.training.feed(client.userId)).active;
 assert.deepEqual(reopened.items.map(i=>i.exerciseId),['bench','bench','adduction','lying-curl']);
 assert.equal(reopened.items[1].results[0].weight,23);assert.equal(reopened.items[1].results[0].done,true);assert.equal(reopened.items[0].results[0].done,false);
});
