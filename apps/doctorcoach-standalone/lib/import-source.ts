import type {PlanItem} from './training.ts';
import type {CustomExercise} from './custom-exercise-types.ts';
import {normalizeImportExerciseName} from './exercise-matching.ts';
import {TrainingError,isRecord,parseRpe} from './training.ts';
export type ImportMatchingState='MATCHED'|'NEEDS_REVIEW'|'CUSTOM_EXERCISE';
export type ImportSource={originalName:string;normalizedName:string;matchingStatus:ImportMatchingState;matchedLibraryId:string|null;workoutSection:string;order:number;sheet:string;row:number;fileName?:string;fileSha256?:string;sourceRow:string[];raw:{sets:string;reps:string;weight:string;rpe:string;notes:string;equipment:string};warnings:string[];repsBySet?:{min:number;max:number}[];rpeRange?:[number,number]};
export const programScopedId=(id:string)=>/^import-[a-f0-9]{16}$/.test(id);
const text=(v:unknown,max=1000)=>{if(typeof v!=='string'||v.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v))throw new TrainingError('פרטי מקור הייבוא אינם תקינים.');return v;};
export function scopedImportId(source:string){let a=2166136261,b=2246822519;for(const c of source){a=Math.imul(a^c.charCodeAt(0),16777619);b=Math.imul(b^c.charCodeAt(0),3266489917);}return 'import-'+[a,b].map(n=>(n>>>0).toString(16).padStart(8,'0')).join('');}
export function programScopedExercise(id:string,raw:unknown):CustomExercise{
 if(!programScopedId(id)||!isRecord(raw)||raw.id!==id)throw new TrainingError('תרגיל מקומי לתוכנית אינו תקין.');
 const name=text(raw.name,200).trim(),equipment=text(raw.equipment??'',120),unit=raw.unit;
 if(!name||!/[\p{L}]/u.test(name)||!['reps','seconds','minutes'].includes(String(unit)))throw new TrainingError('שם או יחידת תרגיל מקומי אינם תקינים.');
 return {id,name,en:name,equipment,unit:unit as CustomExercise['unit'],family:'',aliases:[],videoUrl:'',area:'כללי',group:'כללי',kind:raw.kind==='מתיחה'?'מתיחה':'רגיל',level:'לפי התוכנית',symbol:'＋',dose:'לפי התוכנית האישית',desc:'תרגיל מקומי לתוכנית; יש לפעול לפי הנחיות המאמן.',cues:[],injuries:[],easier:'',harder:'',primary:'',secondary:''};
}
export function parseImportSource(raw:unknown,exerciseId:string,sets:number):ImportSource|undefined{
 if(raw==null)return undefined;if(!isRecord(raw)||!isRecord(raw.raw))throw new TrainingError('פרטי מקור הייבוא אינם תקינים.');
 const originalName=text(raw.originalName,200);if(!originalName.trim())throw new TrainingError('חסר שם תרגיל המקור.');
 if(!['MATCHED','NEEDS_REVIEW','CUSTOM_EXERCISE'].includes(String(raw.matchingStatus))||!Number.isInteger(raw.row)||Number(raw.row)<1||Number(raw.row)>1000000||!Number.isInteger(raw.order)||Number(raw.order)<0||Number(raw.order)>1000000)throw new TrainingError('מיקום או מצב התאמת הייבוא אינם תקינים.');
 if(!Array.isArray(raw.sourceRow)||raw.sourceRow.length>80||!Array.isArray(raw.warnings)||raw.warnings.length>20)throw new TrainingError('פרטי מקור הייבוא גדולים מדי.');
 const source:ImportSource={originalName,normalizedName:normalizeImportExerciseName(originalName),matchingStatus:programScopedId(exerciseId)?raw.matchingStatus==='MATCHED'?'CUSTOM_EXERCISE':raw.matchingStatus as ImportMatchingState:'MATCHED',matchedLibraryId:programScopedId(exerciseId)?null:exerciseId,workoutSection:text(raw.workoutSection,160),order:Number(raw.order),sheet:text(raw.sheet,160),row:Number(raw.row),sourceRow:raw.sourceRow.map(v=>text(v)),raw:{sets:text(raw.raw.sets,80),reps:text(raw.raw.reps,160),weight:text(raw.raw.weight,80),rpe:text(raw.raw.rpe,160),notes:text(raw.raw.notes,1000),equipment:text(raw.raw.equipment,120)},warnings:raw.warnings.map(v=>text(v,300))};
 if(raw.fileName!==undefined)source.fileName=text(raw.fileName,200);
 if(raw.fileSha256!==undefined){if(typeof raw.fileSha256!=='string'||!/^\w{64}$/.test(raw.fileSha256)||!/^[a-f0-9]{64}$/.test(raw.fileSha256))throw new TrainingError('טביעת קובץ הייבוא אינה תקינה.');source.fileSha256=raw.fileSha256;}
 if(raw.repsBySet!==undefined){if(!Array.isArray(raw.repsBySet)||raw.repsBySet.length>20)throw new TrainingError('חזרות המקור לכל סט אינן תקינות.');source.repsBySet=raw.repsBySet.map(r=>{if(!isRecord(r)||!Number.isInteger(r.min)||!Number.isInteger(r.max)||Number(r.min)<1||Number(r.max)<Number(r.min)||Number(r.max)>100)throw new TrainingError('חזרות המקור לכל סט אינן תקינות.');return {min:Number(r.min),max:Number(r.max)};});}
 if(raw.rpeRange!==undefined){if(!Array.isArray(raw.rpeRange)||raw.rpeRange.length!==2)throw new TrainingError('טווח RPE במקור אינו תקין.');const a=parseRpe(raw.rpeRange[0]),b=parseRpe(raw.rpeRange[1]);if(a===null||b===null||a>b)throw new TrainingError('טווח RPE במקור אינו תקין.');source.rpeRange=[a,b];}
 return source;
}
export function importRepetitions(value:string,sets:number){
 const parts=value.trim().replace(/[–—]/g,'-').replace(/\.$/,'').split(/[,;\n]/).map(s=>s.trim());
 const ranges=parts.map(part=>{const m=/^(\d+)\s*(?:-\s*(\d+))?$/.exec(part);if(!m)throw new TrainingError('חזרות: יש להזין מספר, טווח או ערך לכל סט.');const a=Number(m[1]),b=Number(m[2]??m[1]);if(a<1||a>100||b<1||b>100)throw new TrainingError('חזרות: הטווח המותר הוא 1–100.');return {min:Math.min(a,b),max:Math.max(a,b)};});
 if(parts.length>1&&parts.length!==sets)throw new TrainingError('מספר ערכי החזרות אינו תואם למספר הסטים.');
 return {reps:ranges[0].min,repsMax:ranges[0].max>ranges[0].min?ranges[0].max:undefined,...(parts.length>1?{repsBySet:ranges}:{})};
}
export function importRpe(value:string,sets:number):{targetRpe:number|null;targetRpes?:(number|null)[];warnings:string[];rpeRange?:[number,number]}{
 const raw=value.trim();if(!raw)return {targetRpe:null,warnings:[]};
 const range=/^(\d+(?:\.\d+)?)\s*[-–—]\s*(\d+(?:\.\d+)?)$/.exec(raw);
 if(range){const a=parseRpe(Number(range[1]))!,b=parseRpe(Number(range[2]))!;return {targetRpe:null,rpeRange:[Math.min(a,b),Math.max(a,b)],warnings:['טווח RPE נשמר במקור; המאמן יכול לבחור יעד מדויק בהמשך.']};}
 const numeric=(s:string)=>{if(!/^\d+(?:\.\d+)?$/.test(s))throw new TrainingError('RPE אינו מספר תקין.');return parseRpe(Number(s))!;};
 const parts=raw.split(/[,;\n]/).map(s=>s.trim());
 if(parts.length>1){
  // Decimal comma is considered only when it satisfies the existing half-point RPE contract.
  let decimal:number|undefined;try{if(parts.length===2&&raw.includes(','))decimal=numeric(raw.replace(',','.'));}catch{}
  if((sets===1||parts.length!==sets)&&decimal!==undefined)return {targetRpe:decimal,warnings:[]};
  const targets=parts.map(numeric);
  if(decimal!==undefined||targets.length!==sets)return {targetRpe:null,warnings:['RPE עמום נשמר ללא ניחוש; יש לבדוק את ערכי הסטים במקור.']};
  return {targetRpe:targets.every(v=>v===targets[0])?targets[0]:null,targetRpes:targets,warnings:[]};
 }
 return {targetRpe:numeric(raw),warnings:[]};
}

/** Immutable source data never becomes an active dose again after an editor override. */
export function programDosePatch(item:PlanItem,patch:Partial<PlanItem>):Partial<PlanItem>{
 return item.setReps&&(['sets','reps','repsMax','unit'] as const).some(key=>patch[key]!==undefined&&patch[key]!==item[key])?{...patch,setReps:undefined}:patch;
}
export function parseSetReps(raw:unknown,sets:number,unit:unknown):{min:number;max:number}[]|undefined{
 if(raw==null)return undefined;if(unit!=='reps'||!Array.isArray(raw)||raw.length!==sets||raw.length>20)throw new TrainingError('חזרות לכל סט אינן תואמות למינון.');
 return raw.map(r=>{if(!isRecord(r)||!Number.isInteger(r.min)||!Number.isInteger(r.max)||Number(r.min)<1||Number(r.max)<Number(r.min)||Number(r.max)>100)throw new TrainingError('טווח חזרות לכל סט אינו תקין.');return {min:Number(r.min),max:Number(r.max)};});
}
