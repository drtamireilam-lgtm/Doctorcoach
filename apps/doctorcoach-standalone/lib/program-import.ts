import {exercises,type Exercise} from './content.ts';
import {customId,customPrescription,type CustomExercise} from './custom-exercise-types.ts';
import {parseAssignedItems} from './care.ts';
import {defaultPrescription,parseRpe,type PlanItem} from './training.ts';
import type {ExcelSheet} from './excel-workbook.ts';
import type {WorkoutSection} from './workout-sections.ts';
import {parseSourceSets,type SourceSet} from './import-workout-log.ts';
import {exactExerciseNameMatches,exerciseNames} from './exercise-search.ts';
export const importFields=['exercise','sets','reps','weight','rpe','rir','tempo','notes','day','section','unit'] as const;
export type ImportField=typeof importFields[number];
export type ColumnMapping=Partial<Record<ImportField,number>>;
export type ImportRow={row:number;name:string;sourceDay:string;dayId:string;exerciseId:string;sets:string;reps:string;weight:string;rpe:string;rir:string;tempo:string;notes:string;unit:string;section:WorkoutSection;issues:string[];ignored:boolean;sourceLog?:string;sourceWeek?:string;sourceSets?:SourceSet[];sourceLogError?:string|null};
export type ImportOptions={lastRow?:number;weekColumn?:number;targetRpe?:string;catalog?:Exercise[]};
const normalize=(s:string)=>s.trim().toLowerCase().replace(/[’'".,()]/g,'').replace(/[_-]/g,' ').replace(/\s+/g,' ');
const aliases:Record<ImportField,string[]>={exercise:['exercise','exercise name','תרגיל','שם תרגיל','תרגילים'],sets:['sets','סטים','מספר סטים'],reps:['reps','repetitions','חזרות','מספר חזרות'],weight:['weight','load','משקל','משקל עבודה','משקל פתיחה'],rpe:['rpe','מאמץ'],rir:['rir'],tempo:['tempo','טמפו'],notes:['notes','note','הערות','הנחיות','דגשים'],day:['day','workout','יום','אימון','יום אימון'],section:['section','חלק בתוכנית','קטגוריה'],unit:['unit','units','יחידת מידה']};
export function detectImportColumns(sheet:ExcelSheet){let best={header:0,mapping:{} as ColumnMapping,score:0};
 for(let header=0;header<Math.min(sheet.rows.length,30);header++){
  const mapping:ColumnMapping={};(sheet.rows[header]??[]).forEach((c,index)=>{for(const field of importFields)if(aliases[field].includes(normalize(c?.value??''))&&mapping[field]===undefined)mapping[field]=index;});
  if(mapping.exercise===undefined&&mapping.sets!==undefined&&mapping.sets>0&&mapping.reps!==undefined){
   const candidate=mapping.sets-1;
   const named=sheet.rows.slice(header+1,header+21).filter(row=>/^\d+$/.test(row?.[mapping.sets!]?.value??'')&&row?.[candidate]?.value&&/[a-zא-ת]/i.test(row[candidate].value));
   if(named.length>=3)mapping.exercise=candidate;
  }
  const score=(mapping.exercise!==undefined?4:0)+(mapping.sets!==undefined?2:0)+(mapping.reps!==undefined?2:0);
  if(score>best.score)best={header,mapping,score};
 }return best;
}
export function importTableEnd(sheet:ExcelSheet,header:number,mapping:ColumnMapping){
 let end=header+1,blank=0;
 for(let i=header+1;i<sheet.rows.length;i++){
  const row=sheet.rows[i]??[];
  if(!row.some(c=>c?.value)){if(++blank>=3)break;continue;}
  blank=0;end=i+1;
 }return end;
}
export function importWeeks(sheet:ExcelSheet,header:number){
 return (sheet.rows[header]??[]).map((c,column)=>({label:c?.value??'',column})).filter(w=>/\bweek\s*\d+|שבוע\s*\d+/i.test(w.label));
}
export function weekTarget(label:string){const m=/\(?\s*\*\s*(\d+(?:\.\d+)?)\s*\)?/.exec(label);if(!m)return '';try{parseRpe(Number(m[1]));return m[1];}catch{return '';}}
export function matchImportExercise(name:string,catalog:Exercise[]=exercises){const exact=exactExerciseNameMatches(catalog,name);return exact.length===1?exact[0].id:'';}
export function suggestImportExercises(name:string,catalog:Exercise[]=exercises){
 const words=(s:string)=>normalize(s).split(' ').filter(w=>w.length>2).map(w=>w.replace(/s$/,''));const terms=words(name);
 const exact=new Set(exactExerciseNameMatches(catalog,name).map(e=>e.id));
 return catalog.map(e=>({e,score:(exact.has(e.id)?100:0)+Math.max(...exerciseNames(e).map(n=>words(n).filter(w=>terms.includes(w)).length))})).filter(v=>v.score>0).sort((a,b)=>b.score-a.score).slice(0,3).map(v=>v.e);
}
export function extractImportRows(sheet:ExcelSheet,header:number,mapping:ColumnMapping,options:ImportOptions={}):ImportRow[]{
 if(mapping.exercise===undefined||mapping.sets===undefined||mapping.reps===undefined)throw new Error('יש לבחור עמודות תרגיל, סטים וחזרות.');
 const chosen=Object.values(mapping).filter(v=>v!==undefined);if(new Set(chosen).size!==chosen.length)throw new Error('כל עמודה צריכה לייצג שדה אחד בלבד.');
 if(options.weekColumn!==undefined&&chosen.includes(options.weekColumn))throw new Error('עמודת שבוע היא מידע מקור, ויש לבחור עבורה עמודה נפרדת.');
 const rows:ImportRow[]=[];const days=new Map<string,string>();let sourceDay=sheet.name;
 const dayId=(name:string)=>{if(!days.has(name)){const letter=/^[A-G]$/i.test(name)?String(name.toUpperCase().charCodeAt(0)-64):undefined;const used=new Set(days.values());const slot=letter&&!used.has(letter)?letter:Array.from({length:7},(_,i)=>String(i+1)).find(id=>!used.has(id));if(!slot)throw new Error('הייבוא תומך בעד 7 ימי אימון.');days.set(name,slot);}return days.get(name)!;};
 const end=options.lastRow??sheet.rows.length;if(!Number.isInteger(end)||end<=header+1||end>sheet.rows.length)throw new Error('בחרו שורת סיום אחרי הכותרת ובתוך הגיליון.');
 if(options.targetRpe)parseRpe(numeric(options.targetRpe));
 for(let index=header+1;index<end;index++){
  const cells=sheet.rows[index]??[];const value=(f:ImportField)=>mapping[f]===undefined?'':(cells[mapping[f]!]?.value??'').trim();const name=value('exercise');
  if(!name&&!cells.some(c=>c?.value))continue;
  if(name&&!value('sets')&&!value('reps')&&cells.filter(c=>c?.value).length===1){sourceDay=name;continue;}
  if(normalize(name)==='exercise'||normalize(name)==='תרגיל')continue;
  const day=value('day')||sourceDay;const issues:string[]=[];
  if(importFields.some(f=>mapping[f]!==undefined&&cells[mapping[f]!]?.formula))issues.push('השורה מכילה נוסחה. יש להזין ערכים ידנית לפני הייבוא.');
  // In the repetitions column, d-m source notation is the coach's rep range,
  // even when Excel stored it as a date. Other fields must not become ranges.
  if(importFields.some(f=>f!=='reps'&&mapping[f]!==undefined&&cells[mapping[f]!]?.dateConverted))issues.push('Excel שמר תא כתאריך בעמודה שאינה חזרות. יש לבדוק ולהזין את הערך ידנית.');
  const part=value('section');let section:WorkoutSection='main';if(part){if(['warmup','חימום'].includes(normalize(part)))section='warmup';else if(['stretch','stretching','מתיחות'].includes(normalize(part)))section='stretch';else if(!['main','אימון','תרגילי אימון','תרגילי האימון'].includes(normalize(part)))issues.push('חלק בתוכנית אינו מוכר. יש לבחור בעורך.');}
  const rawUnit=value('unit');const unit=({'חזרות':'reps','שניות':'seconds','דקות':'minutes'} as Record<string,string>)[rawUnit]??rawUnit;
  const matched=(options.catalog??exercises).find(e=>e.id===matchImportExercise(name,options.catalog));if(!part&&matched?.kind==='מתיחה')section='stretch';
  const log=options.weekColumn===undefined?undefined:cells[options.weekColumn];const parsed=log?.formula?{sets:[],error:'דיווח השבוע הוא נוסחה. יש לבדוק את הערך ידנית.'}:parseSourceSets(log?.value??'');
  rows.push({row:index+1,name,sourceDay:day,dayId:dayId(day),exerciseId:matchImportExercise(name,options.catalog),sets:value('sets'),reps:value('reps'),weight:value('weight'),rpe:options.targetRpe||value('rpe'),rir:options.targetRpe?'':value('rir'),tempo:value('tempo'),notes:value('notes'),unit,section,issues,ignored:false,...(options.weekColumn===undefined?{}:{sourceLog:log?.value??'',sourceWeek:sheet.rows[header]?.[options.weekColumn]?.value??'',sourceSets:parsed.sets,sourceLogError:parsed.error})});
 }
 if(!rows.length)throw new Error('לא נמצאו שורות תרגילים. בדקו את שורת הכותרות והעמודות.');
 if(rows.length>60||days.size>7)throw new Error('בחרו גיליון עם עד 60 שורות תרגילים ועד 7 ימי אימון.');
 return rows;
}
const numeric=(s:string)=>{const clean=s.trim().replace(',','.');if(!/^\d+(?:\.\d+)?$/.test(clean))throw new Error('יש להזין מספר תקין.');return Number(clean);};
export function importRowItem(row:ImportRow,catalog:Exercise[]=exercises):PlanItem{
 const customs=catalog.filter(e=>customId(e.id)) as CustomExercise[];const custom=customs.find(e=>e.id===row.exerciseId);
 if(row.issues.length)throw new Error(row.issues.join(' '));
 if(!row.exerciseId)throw new Error('יש לבחור תרגיל מהספרייה.');
 const reps=row.reps.trim().replace(/[–—]/g,'-').replace(/\.$/,'');const range=/^(\d+)\s*-\s*(\d+)$/.exec(reps);
 const amount=range?Math.min(Number(range[1]),Number(range[2])):numeric(reps);const upper=range?Math.max(Number(range[1]),Number(range[2])):undefined;
 if(row.rpe&&row.rir)throw new Error('יש לבחור RPE או RIR, ולא את שניהם.');
 const effort=row.rir?10-numeric(row.rir):row.rpe?numeric(row.rpe):null;parseRpe(effort);
 let tempo=null;if(row.tempo){const parts=row.tempo.replace(/[–—]/g,'-').split('-').map(numeric);if(parts.length!==4)throw new Error('טמפו צריך לכלול ארבעה שלבים, למשל 3-0-2-0.');tempo={eccentric:parts[0],bottom:parts[1],concentric:parts[2],top:parts[3]};}
 return parseAssignedItems([{exerciseId:row.exerciseId,sets:numeric(row.sets),reps:amount,...(upper===undefined?{}:{repsMax:upper}),unit:row.unit||(custom?custom.unit:defaultPrescription(row.exerciseId).unit),weight:row.weight?numeric(row.weight):0,weightUnspecified:!row.weight,targetRpe:effort,effortScale:row.rir?'rir':'rpe',tempo,notes:row.notes,dayId:row.dayId,workoutSection:row.section}],customs)[0];
}
export function finalizeImport(rows:ImportRow[],catalog:Exercise[]=exercises){return parseAssignedItems(rows.filter(r=>!r.ignored).map(r=>importRowItem(r,catalog)),catalog.filter(e=>customId(e.id)) as CustomExercise[]);}
