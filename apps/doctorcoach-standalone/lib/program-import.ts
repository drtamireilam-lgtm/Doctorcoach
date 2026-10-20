import {parseImportLoad} from './import-load.ts';
import {exercises,type Exercise} from './content.ts';
import {customId,type CustomExercise} from './custom-exercise-types.ts';
import {parseAssignedItems} from './care.ts';
import {defaultPrescription,parseRpe,type PlanItem} from './training.ts';
import type {ExcelSheet} from './excel-workbook.ts';
import type {WorkoutSection} from './workout-sections.ts';
import {parseSourceSets,type SourceSet} from './import-workout-log.ts';
import {matchExerciseForImport} from './exercise-matching.ts';
export const importFields=['exercise','sets','reps','weight','rpe','rir','tempo','notes','day','section','unit','warmupSets','side','weightUnit','loadBasis'] as const;
export type ImportField=typeof importFields[number];
export type ColumnMapping=Partial<Record<ImportField,number>>;
export type ImportRow={row:number;name:string;sourceDay:string;dayId:string;exerciseId:string;sets:string;reps:string;weight:string;weightUnit?:string;loadBasis?:string;rpe:string;rir:string;tempo:string;notes:string;unit:string;section:WorkoutSection;issues:string[];ignored:boolean;matchStatus?:ReturnType<typeof matchExerciseForImport>['status'];matchConfidence?:number;matchConfirmed?:boolean;warmupSets?:{amount:number;weight:number}[];side?:'left'|'right'|'both';sourcePrescription?:{sets:string;reps:string;unit:string;side:string;warmupSets:string};sourceLog?:string;sourceWeek?:string;sourceSets?:SourceSet[];sourceLogError?:string|null};
export type ImportOptions={lastRow?:number;weekColumn?:number;targetRpe?:string;catalog?:Exercise[]};
const normalize=(s:string)=>s.trim().toLowerCase().replace(/[’'".,()]/g,'').replace(/[_-]/g,' ').replace(/\s+/g,' ');
const aliases:Record<ImportField,string[]>={warmupSets:['warmup sets','warm up sets','warmup weight x reps','warmup weight/reps','חימום משקל חזרות','סטי חימום','סטים לחימום'],weightUnit:['weight unit','load unit','mass unit','יחידת משקל'],loadBasis:['load basis','weight basis','basis','אופן מדידת המשקל'],side:['side','צד'],exercise:['exercise','exercise name','movement','תרגיל','שם תרגיל','שם התנועה','תרגילים'],sets:['sets','סטים','מספר סטים'],reps:['reps','repetitions','חזרות','מספר חזרות'],weight:['weight','load','משקל','משקל עבודה','משקל פתיחה'],rpe:['rpe','target rpe','מאמץ'],rir:['rir','target rir'],tempo:['tempo','טמפו'],notes:['notes','note','הערות','הנחיות','דגשים'],day:['day','workout','יום','אימון','יום אימון'],section:['section','חלק בתוכנית','קטגוריה'],unit:['unit','units','יחידת מידה']};
export const massUnit=(raw:string):'kg'|'lb'|undefined=>/^(kg|kgs|kilograms?|ק[״"']?ג|קילוגרם)$/i.test(raw.trim())?'kg':/^(lb|lbs|pounds?|פאונד|ליברות)$/i.test(raw.trim())?'lb':undefined;
export function detectImportColumns(sheet:ExcelSheet,headerLimit=30){let best={header:0,mapping:{} as ColumnMapping,score:0,issues:[] as string[]};const nameCache=new Map<string,boolean>();const recognized=(v:string)=>{if(!/[a-zא-ת]/i.test(v))return false;if(!nameCache.has(v))nameCache.set(v,!!matchImportExercise(v));return nameCache.get(v)!;};
 for(let header=0;header<Math.min(sheet.rows.length,headerLimit);header++){
  const mapping:ColumnMapping={},issues:string[]=[],candidates=new Map<ImportField,number[]>();
  const data=sheet.rows.slice(header+1,header+21).filter(row=>row.filter(c=>c?.value).length>=2);
  (sheet.rows[header]??[]).forEach((c,index)=>{const text=normalize(c?.value??'');for(const field of importFields)if(aliases[field].includes(text)||(field==='weight'&&/^(weight|load|משקל)(?: עבודה)? (kg|lb|lbs|קג|פאונד)$/.test(text))){const a=candidates.get(field)??[];a.push(index);candidates.set(field,a);}});
  for(const [field,positions] of candidates){if(positions.length===1)mapping[field]=positions[0];else issues.push('כותרת כפולה או עמומה: '+field+'. בחרו עמודה ידנית.');}
  if(mapping.unit!==undefined){const column=mapping.unit,values=data.map(r=>r[column]?.value?.trim()).filter((v):v is string=>!!v);const content=values.filter(v=>!aliases.unit.includes(normalize(v))&&!aliases.weightUnit.includes(normalize(v)));if(content.length&&content.every(v=>massUnit(v))){if(mapping.weightUnit===undefined)mapping.weightUnit=column;else issues.push('עמודות יחידת משקל כפולות. בחרו מיפוי ידני.');delete mapping.unit;}}
  // Header meaning and actual cell meaning must agree; never feed a name into a numeric field.
  for(const field of ['sets','reps','weight','rpe','rir'] as const){const column=mapping[field];if(column===undefined)continue;const values=data.map(r=>r[column]?.value?.trim()).filter((v):v is string=>!!v);const names=values.filter(v=>recognized(v));if(names.length&&names.length>=values.length/2){delete mapping[field];issues.push('עמודת '+field+' מכילה שמות תרגילים. בדקו את המיפוי.');}}
  if(mapping.exercise===undefined&&!candidates.has('exercise')){
   const used=new Set(Object.values(mapping));const possible=(sheet.rows[header]??[]).flatMap((_,column)=>{if(used.has(column))return [];const values=data.map(r=>r[column]?.value?.trim()).filter((v):v is string=>!!v);return values.filter(v=>recognized(v)).length>=2&&values.every(v=>/[a-zא-ת]/i.test(v))?[column]:[];});
   if(possible.length===1)mapping.exercise=possible[0];else if(possible.length>1)issues.push('יותר מעמודה אחת עשויה להכיל תרגילים. בחרו ידנית.');
  }
  if(mapping.exercise!==undefined){const values=data.map(r=>r[mapping.exercise!]?.value?.trim()).filter((v):v is string=>!!v);if(values.length&&values.every(v=>/^\d+(?:[.,]\d+)?$/.test(v))){delete mapping.exercise;issues.push('עמודת התרגיל מכילה מספרים. בחרו את עמודת השם.');}}
  const score=(mapping.exercise!==undefined?4:0)+(mapping.sets!==undefined?2:0)+(mapping.reps!==undefined?2:0);
  if(score>best.score||(score===best.score&&issues.length&&best.issues.length===0))best={header,mapping,score,issues};
 }return best;
}
export function importTableEnd(sheet:ExcelSheet,header:number,mapping:ColumnMapping){
 let end=header+1,blank=0;
 for(let i=header+1;i<sheet.rows.length;i++){
  const row=sheet.rows[i]??[];
  const populated=row.filter(c=>c?.value||c?.formula);
  if(!populated.length){blank++;continue;}
  if(blank>=3&&populated.length===1&&!populated[0].formula&&/^(historical comparison|history|השוואה היסטורית|היסטוריה)$/i.test(populated[0].value.trim()))break;
  // Empty spacer rows can separate whole training days. Keep later blocks in
  // the review rather than silently truncating at the first large gap.
  if(row.some(c=>c?.value||c?.formula))end=i+1;
  blank=0;
 }return end;
}
export function importWeeks(sheet:ExcelSheet,header:number){
 return (sheet.rows[header]??[]).map((c,column)=>({label:c?.value??'',column})).filter(w=>/\bweek\s*\d+|שבוע\s*\d+/i.test(w.label));
}
export function weekTarget(label:string){const m=/\(?\s*\*\s*(\d+(?:\.\d+)?)\s*\)?/.exec(label);if(!m)return '';try{parseRpe(Number(m[1]));return m[1];}catch{return '';}}
export function matchImportExercise(name:string,catalog:Exercise[]=exercises){return matchExerciseForImport(name,catalog).exerciseId;}
export function suggestImportExercises(name:string,catalog:Exercise[]=exercises){return matchExerciseForImport(name,catalog).candidates.slice(0,3).map(c=>catalog.find(e=>e.id===c.exerciseId)).filter((e):e is Exercise=>!!e);}
const sectionOf=(text:string):WorkoutSection|undefined=>{
 const n=normalize(text);
 if(/^(warm ?up|preparation|mobility|חימום|הכנה|מוביליטי|ניידות)$/.test(n))return 'warmup';
 if(/^(stretch|stretching|מתיחות)$/.test(n))return 'stretch';
 if(/^(main|work sets|strength|אימון|תרגילי אימון|תרגילי האימון|עבודה|כוח)$/.test(n))return 'main';
};
function parseDose(rawSets:string,rawReps:string,rawUnit:string,rawSide:string,issues:string[]){
 let sets=rawSets,reps=rawReps,unit=rawUnit,side:'left'|'right'|'both'|undefined;
 const combined=/^(\d+)\s*[x×*]\s*(.+)$/i.exec(!reps?sets:reps);
 if(combined){if(reps&&sets&&sets!==combined[1])issues.push('סתירה בין מספר הסטים למינון המשולב.');else{sets=combined[1];reps=combined[2];}}
 const sideText=(rawSide||reps.match(/(?:each side|per side|both sides|left|right|לכל צד|שני הצדדים|שמאל|ימין)\s*$/i)?.[0]||'').trim().toLowerCase();
 const embeddedSide=reps.match(/(?:each side|per side|both sides|left|right|לכל צד|שני הצדדים|שמאל|ימין)\s*$/i)?.[0]?.trim().toLowerCase();
 const sideKey=(s:string)=>/^(left|שמאל)$/.test(s)?'left':/^(right|ימין)$/.test(s)?'right':/^(both|each side|per side|both sides|לכל צד|שני הצדדים)$/.test(s)?'both':undefined;
 if(rawSide&&embeddedSide&&sideKey(rawSide.trim().toLowerCase())!==sideKey(embeddedSide))issues.push('סתירה בין הצד בתא החזרות לעמודת הצד.');
 if(sideText){side=/^(left|שמאל)$/.test(sideText)?'left':/^(right|ימין)$/.test(sideText)?'right':/^(both|each side|per side|both sides|לכל צד|שני הצדדים)$/.test(sideText)?'both':undefined;if(!side)issues.push('הצד אינו מוכר.');else reps=reps.replace(/\s*(each side|per side|both sides|left|right|לכל צד|שני הצדדים|שמאל|ימין)\s*$/i,'').trim();}
 const timed=/^(\d+(?:[.,]\d+)?)\s*(seconds?|secs?|s|minutes?|mins?|שניות|שנייה|דקות|דקה)$/i.exec(reps);
 if(timed){const inferred=/^(minutes?|mins?|דקות|דקה)$/i.test(timed[2])?'minutes':'seconds';if(unit&&unit!==inferred)issues.push('יחידת הזמן בתא אינה תואמת לעמודת היחידות.');else unit=inferred;reps=timed[1];}
 if(!/^\d+(?:[.,]\d+)?(?:\s*[-–—]\s*\d+)?\.?$/.test(reps))issues.push('מינון החזרות אינו חד משמעי. יש לבדוק את ערך המקור.');
 return {sets,reps,unit,side};
}
export const importWarmupHelp='סטי חימום: חזרות@משקל (10@20) או משקל×חזרות (20×10), מופרדים בנקודה פסיק.';
function parseWarmups(raw:string,issues:string[]){
 if(!raw)return undefined;
 const parts=raw.split(/;|\n/).map(s=>s.trim());
 if(parts.length>20||parts.some(s=>!/^\d+(?:\.\d+)?\s*[@×x]\s*\d+(?:\.\d+)?$/.test(s))){issues.push(importWarmupHelp);return undefined;}
 return parts.map(s=>{const [first,second]=s.split(/[@×x]/).map(Number);return s.includes('@')?{amount:first,weight:second}:{amount:second,weight:first};});
}
export function extractImportRows(sheet:ExcelSheet,header:number,mapping:ColumnMapping,options:ImportOptions={}):ImportRow[]{
 if(mapping.exercise===undefined||mapping.sets===undefined||mapping.reps===undefined)throw new Error('יש לבחור עמודות תרגיל, סטים וחזרות.');
 const chosen=Object.values(mapping).filter(v=>v!==undefined);if(new Set(chosen).size!==chosen.length)throw new Error('כל עמודה צריכה לייצג שדה אחד בלבד.');
 if(options.weekColumn!==undefined&&chosen.includes(options.weekColumn))throw new Error('עמודת שבוע היא מידע מקור, ויש לבחור עבורה עמודה נפרדת.');
 const rows:ImportRow[]=[];const days=new Map<string,string>();let sourceDay=sheet.name;let activeMapping=mapping;let activeHeader=sheet.rows[header]??[];let activeWeekColumn=options.weekColumn;let mappingIssues:string[]=[];const initialHeader=sheet.rows[header]??[];const weekLabel=options.weekColumn===undefined?'':initialHeader[options.weekColumn]?.value??'';let activeSection:WorkoutSection='main';
 const dayId=(name:string)=>{if(!days.has(name)){const letter=/^[A-G]$/i.test(name)?String(name.toUpperCase().charCodeAt(0)-64):undefined;const used=new Set(days.values());const slot=letter&&!used.has(letter)?letter:Array.from({length:7},(_,i)=>String(i+1)).find(id=>!used.has(id));if(!slot)throw new Error('הייבוא תומך בעד 7 ימי אימון.');days.set(name,slot);}return days.get(name)!;};
 const end=options.lastRow??sheet.rows.length;if(!Number.isInteger(end)||end<=header+1||end>sheet.rows.length)throw new Error('בחרו שורת סיום אחרי הכותרת ובתוך הגיליון.');
 if(options.targetRpe)parseRpe(numeric(options.targetRpe));
 for(let index=header+1;index<end;index++){
  const cells=sheet.rows[index]??[];const repeated=detectImportColumns({name:sheet.name,rows:sheet.rows.slice(index,index+21)},1);
  if(repeated.mapping.exercise!==undefined&&repeated.score>=6&&!cells.some(c=>c?.formula)){
   const remapped:ColumnMapping={...repeated.mapping};mappingIssues=[];
   const identical=cells.length===initialHeader.length&&cells.every((c,i)=>normalize(c?.value??'')===normalize(initialHeader[i]?.value??''));
   const locate=(label:string)=>{const positions=cells.flatMap((c,i)=>normalize(c?.value??'')===normalize(label)&&normalize(label)?[i]:[]);return positions.length===1?positions[0]:undefined;};
   for(const field of importFields){const original=mapping[field];if(original===undefined)continue;const column=identical?original:locate(initialHeader[original]?.value??'');if(column!==undefined)remapped[field]=column;else if(remapped[field]===undefined)mappingIssues.push(`לא ניתן לזהות מחדש את עמודת ${field}. יש לבדוק את מיפוי הבלוק.`);}
   const columns=Object.values(remapped);if(new Set(columns).size!==columns.length)mappingIssues.push('מיפוי הבלוק החוזר מכיל עמודות חופפות.');
   if(options.weekColumn!==undefined){activeWeekColumn=identical?options.weekColumn:locate(weekLabel);if(activeWeekColumn===undefined||columns.includes(activeWeekColumn)){activeWeekColumn=undefined;mappingIssues.push('לא ניתן לזהות בבטחה את עמודת השבוע בבלוק החוזר.');}}
   activeMapping=remapped;activeHeader=cells;continue;
  }
  const value=(f:ImportField)=>activeMapping[f]===undefined?'':(cells[activeMapping[f]!]?.value??'').trim();const name=value('exercise');
  if(!name&&!cells.some(c=>c?.value||c?.formula))continue;
  if(name&&!value('sets')&&!value('reps')&&cells.filter(c=>c?.value).length===1&&!cells.some(c=>c?.formula)){const heading=sectionOf(name);if(heading){activeSection=heading;continue;}if(/^(?:[A-G]|(?:day|workout|יום|אימון)\s*[A-Gא-ת1-7])$/i.test(name)){sourceDay=name;activeSection='main';continue;}}
  const explicitDay=value('day');if(explicitDay&&explicitDay!==sourceDay){sourceDay=explicitDay;activeSection='main';}
  const day=explicitDay||sourceDay;const issues:string[]=[...mappingIssues];
  if(importFields.some(f=>activeMapping[f]!==undefined&&cells[activeMapping[f]!]?.formula))issues.push('השורה מכילה נוסחה. יש להזין ערכים ידנית לפני הייבוא.');
  // In the repetitions column, d-m source notation is the coach's rep range,
  // even when Excel stored it as a date. Other fields must not become ranges.
  if(importFields.some(f=>f!=='reps'&&activeMapping[f]!==undefined&&cells[activeMapping[f]!]?.dateConverted))issues.push('Excel שמר תא כתאריך בעמודה שאינה חזרות. יש לבדוק ולהזין את הערך ידנית.');
  const part=value('section');let section:WorkoutSection=activeSection;if(part){const parsedSection=sectionOf(part);if(parsedSection)section=parsedSection;else issues.push('חלק בתוכנית אינו מוכר. יש לבחור בעורך.');}
  const rawUnit=value('unit');const sourceUnit=({'חזרות':'reps','שניות':'seconds','דקות':'minutes'} as Record<string,string>)[rawUnit]??rawUnit;
  const match=matchExerciseForImport(name,options.catalog);const matched=(options.catalog??exercises).find(e=>e.id===match.exerciseId);if(!part&&activeSection==='main'&&matched?.kind==='מתיחה')section='stretch';
  const dose=parseDose(value('sets'),value('reps'),sourceUnit,value('side'),issues);const warmupSets=parseWarmups(value('warmupSets'),issues);
  const log=activeWeekColumn===undefined?undefined:cells[activeWeekColumn];const parsed=log?.formula?{sets:[],error:'דיווח השבוע הוא נוסחה. יש לבדוק את הערך ידנית.'}:parseSourceSets(log?.value??'');
  rows.push({row:index+1,sourcePrescription:{sets:value('sets'),reps:value('reps'),unit:rawUnit,side:value('side'),warmupSets:value('warmupSets')},name,sourceDay:day,dayId:dayId(day),exerciseId:match.exerciseId,matchStatus:match.status,matchConfidence:match.confidence,sets:dose.sets,reps:dose.reps,weight:value('weight'),weightUnit:massUnit(value('weightUnit')||((activeHeader[activeMapping.weight??-1]?.value??'').match(/(?:kg|lbs?|ק[״"']?ג|פאונד)/i)?.[0]??''))||value('weightUnit'),loadBasis:value('loadBasis')||(/per side|לכל צד/i.test(value('notes')+' '+value('weight'))?'per-side':'total'),rpe:options.targetRpe||value('rpe'),rir:options.targetRpe?'':value('rir'),tempo:value('tempo'),notes:value('notes'),unit:dose.unit,...(dose.side?{side:dose.side}:{}),...(warmupSets?{warmupSets}:{}),section,issues,ignored:false,...(options.weekColumn===undefined?{}:{sourceLog:log?.value??'',sourceWeek:weekLabel,sourceSets:parsed.sets,sourceLogError:parsed.error})});
 }
 if(!rows.length)throw new Error('לא נמצאו שורות תרגילים. בדקו את שורת הכותרות והעמודות.');
 if(rows.length>60||days.size>7)throw new Error('בחרו גיליון עם עד 60 שורות תרגילים ועד 7 ימי אימון.');
 return rows;
}
const numeric=(s:string,field='מספר')=>{const clean=s.trim().replace(',','.');if(!/^\d+(?:\.\d+)?$/.test(clean))throw new Error(field+': יש להזין מספר תקין.');return Number(clean);};
export function importRowItem(row:ImportRow,catalog:Exercise[]=exercises):PlanItem{try{return rowToItem(row,catalog);}catch(e){throw new Error('שורה '+row.row+': '+(e as Error).message);}}
function rowToItem(row:ImportRow,catalog:Exercise[]=exercises):PlanItem{
 const customs=catalog.filter(e=>customId(e.id)) as CustomExercise[];const custom=customs.find(e=>e.id===row.exerciseId);
 if(row.issues.length)throw new Error(row.issues.join(' '));
 if(!row.exerciseId)throw new Error('יש לבחור תרגיל מהספרייה.');
 if(!row.name.trim()||!/[a-zא-ת]/i.test(row.name))throw new Error('תרגיל: נדרש שם טקסטואלי לא ריק.');
 const importedLoad=parseImportLoad(row.weight,row.weightUnit,row.loadBasis,row.notes);
 const reps=row.reps.trim().replace(/[–—]/g,'-').replace(/\.$/,'');const range=/^(\d+)\s*-\s*(\d+)$/.exec(reps);
 const amount=range?Math.min(Number(range[1]),Number(range[2])):numeric(reps,'חזרות');const upper=range?Math.max(Number(range[1]),Number(range[2])):undefined;
 if(row.rpe&&row.rir)throw new Error('יש לבחור RPE או RIR, ולא את שניהם.');
 const effort=row.rir?10-numeric(row.rir,'RIR'):row.rpe?numeric(row.rpe,'RPE'):null;if(row.rir&&(effort!<1||effort!>10||!Number.isInteger(effort!*2)))throw new Error('RIR: הטווח המותר הוא 0–9 בקפיצות של חצי.');parseRpe(effort);
 let tempo=null;if(row.tempo){const parts=row.tempo.replace(/[–—]/g,'-').split('-').map(value=>numeric(value,'טמפו'));if(parts.length!==4)throw new Error('טמפו צריך לכלול ארבעה שלבים, למשל 3-0-2-0.');tempo={eccentric:parts[0],bottom:parts[1],concentric:parts[2],top:parts[3]};}
 return parseAssignedItems([{exerciseId:row.exerciseId,sets:numeric(row.sets,'סטים'),reps:amount,...(upper===undefined?{}:{repsMax:upper}),unit:row.unit||(custom?custom.unit:defaultPrescription(row.exerciseId).unit),...importedLoad,targetRpe:effort,effortScale:row.rir?'rir':'rpe',tempo,notes:row.notes,dayId:row.dayId,workoutSection:row.section,...(row.side?{side:row.side}:{}),...(row.warmupSets?{warmupSets:row.warmupSets}:{})}],customs)[0];
}
export function finalizeImport(rows:ImportRow[],catalog:Exercise[]=exercises){return parseAssignedItems(rows.filter(r=>!r.ignored).map(r=>({...importRowItem(r,catalog),occurrenceId:`import:${r.row}`})),catalog.filter(e=>customId(e.id)) as CustomExercise[]);}

export function matchExerciseForRow(name:string,catalog:Exercise[]=exercises){const match=matchExerciseForImport(name,catalog);return {exerciseId:match.exerciseId,matchStatus:match.status,matchConfidence:match.confidence,matchConfirmed:false};}
export function duplicateImportRowNumbers(rows:ImportRow[]){const seen=new Map<string,number>(),duplicates=new Set<number>();for(const row of rows.filter(r=>!r.ignored)){const key=JSON.stringify([row.dayId,row.exerciseId||normalize(row.name),row.sets,row.reps,row.weight,row.weightUnit??'',row.loadBasis??'',row.rpe,row.rir,row.section,row.tempo,row.notes]);const old=seen.get(key);if(old!==undefined){duplicates.add(old);duplicates.add(row.row);}else seen.set(key,row.row);}return [...duplicates];}
