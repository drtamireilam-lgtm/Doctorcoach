import {parseLoadMetadata,fromKg,hasTotalLoad,type LoadMetadata} from './load-units.ts';
import type {EffortScale} from './effort.ts';
import type {CustomExercise} from './custom-exercise-types.ts';
import {defaultWorkoutSection,workoutSection,type WorkoutSection} from './workout-sections.ts';
import {duringPain} from './workout-context.ts';
export type Unit = 'reps' | 'seconds' | 'minutes';
export type ExerciseTempo={eccentric:number;bottom:number;concentric:number;top:number};
export type WarmupSetPrescription = {amount:number;weight:number};
export type PlanItem = { load?:LoadMetadata; warmupSets?:WarmupSetPrescription[]; side?:'left'|'right'|'both'; exerciseId: string; occurrenceId?:string; customExercise?:CustomExercise;sets: number; reps: number; repsMax?:number|null; unit: Unit; weight: number; weightUnspecified?:boolean; notes: string; tempo?:ExerciseTempo|null; targetRpe?: number|null; targetRpes?:(number|null)[]; effortScale?:EffortScale; approvedSubstitutions?:string[]; dayId?:string; workoutSection?:WorkoutSection };
export type SetResult = { weightSource?:'manual'|'automatic'; done: boolean; amount: number; weight: number; actualRpe?: number|null; painDuring?:number|null };
export type ReadinessSnapshot={id:string;day:string;version:number;capturedAt:string;data:{sleep:number;energy:number;stress:number;note:string}};
export type WorkoutFollowup={day:string;pain:number;recordedAt:string};
export type SessionExercise = PlanItem & { name: string; results: SetResult[]; warmupResults?:SetResult[]; swappedFrom?:string };
export type TrainingSession = {
  id: string; planMode?:'legacy'|'self'|'coached'; programId?:string|null; status: 'active' | 'completed' | 'cancelled'; items: SessionExercise[];
  startedAt: string; finishedAt: string | null; before: number; after: number | null;
  plannedSets: number; completedSets: number; version: number;
  readiness?:ReadinessSnapshot|null; followup?:WorkoutFollowup|null;
  finishFeedback?:{effort:number|null;note:string}|null;
};
export type TrainingStats = { total: number; week: number; sets: number };
export type TrainingFeed = { active: TrainingSession | null; history: TrainingSession[]; stats: TrainingStats };
export type LegacyLog = { id: number; exerciseCount: number; before: number; after: number; createdAt: string };
export const unitLabels: Record<Unit, string> = { reps: 'חזרות', seconds: 'שניות', minutes: 'דקות' };
export const unitMax: Record<Unit, number> = { reps: 100, seconds: 3600, minutes: 180 };

export class TrainingError extends Error {
  status: number;
  session?: TrainingSession;
  constructor(message: string, status = 400, session?: TrainingSession) {
    super(message); this.status = status; this.session = session;
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
export function isScore(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 10;
}
export function defaultPrescription(exerciseId: string): PlanItem {
  if(exerciseId==='suitcase-carry')return {exerciseId,sets:2,reps:25,unit:'seconds',weight:0,notes:'זמן לכל צד; יש להחליף יד.',workoutSection:'main'};
  if(exerciseId==='assisted-pull-up')return {exerciseId,sets:2,reps:10,unit:'reps',weight:0,notes:'ציינו כאן את משקל הסיוע במכונה. שדה המשקל מיועד לעומס חיצוני, ולא למשקל הסיוע.',workoutSection:'main'};
  return { exerciseId, sets: exerciseId === 'walk' ? 1 : 2, reps: exerciseId === 'walk' ? 10 : exerciseId === 'balance' ? 25 : 10,
    unit: exerciseId === 'walk' ? 'minutes' : exerciseId === 'balance'||exerciseId.startsWith('stretch-') ? 'seconds' : 'reps', weight: 0, notes: '',workoutSection:defaultWorkoutSection(exerciseId) };
}

export function parsePlanItem(value: unknown, fallback?: PlanItem): PlanItem {
  if (!isRecord(value) || typeof value.exerciseId !== 'string') throw new TrainingError('פרטי התרגיל אינם תקינים.');
  const defaults = fallback ?? defaultPrescription(value.exerciseId);
  const unit = value.unit ?? defaults.unit;
  const sets = value.sets ?? defaults.sets;
  const reps = value.reps ?? defaults.reps;
  const weight = value.weight ?? defaults.weight;
  let load:LoadMetadata|undefined;
  try{load=parseLoadMetadata(value.load===undefined&&defaults.load?{...defaults.load,sourceValue:weight===defaults.weight?defaults.load.sourceValue:fromKg(weight as number,defaults.load.sourceUnit)}:value.load,weight as number);}catch{throw new TrainingError('פרטי יחידת המשקל אינם תקינים.');}
  const notes = value.notes ?? defaults.notes;
  const workoutSection=value.workoutSection??defaults.workoutSection??'main';
  if(!['warmup','main','stretch'].includes(workoutSection as string))throw new TrainingError('בחרו חימום, תרגילי אימון או מתיחות.');
  const effortScale=value.effortScale??defaults.effortScale??'rpe';if(effortScale!=='rpe'&&effortScale!=='rir')throw new TrainingError('שיטת מאמץ לא תקינה.');
  const targetRpe = value.targetRpe === undefined ? (defaults.targetRpe ?? null) : parseRpe(value.targetRpe);
  if (!['reps','seconds','minutes'].includes(unit as string)) throw new TrainingError('בחרו יחידת מידה תקינה.');
  if (typeof sets !== 'number' || !Number.isInteger(sets) || sets < 1 || sets > 20) throw new TrainingError('מספר הסטים צריך להיות בין 1 ל־20.');
  if (typeof reps !== 'number' || !Number.isInteger(reps) || reps < 1 || reps > unitMax[unit as Unit]) throw new TrainingError('הכמות לתרגיל אינה בטווח המותר.');
  const repsMax=value.repsMax===undefined?defaults.repsMax:value.repsMax;
  if(repsMax!=null&&(unit!=='reps'||typeof repsMax!=='number'||!Number.isInteger(repsMax)||repsMax<reps||repsMax>100))throw new TrainingError('טווח החזרות צריך להיות בין 1 ל־100, והגבול העליון לא קטן מהתחתון.');
  const weightUnspecified=value.weightUnspecified===undefined?(value.weight===undefined?defaults.weightUnspecified:false):value.weightUnspecified;
  if(weightUnspecified!==undefined&&(typeof weightUnspecified!=='boolean'||weightUnspecified&&weight!==0))throw new TrainingError('משקל שלא הוגדר אינו יכול לכלול ערך מספרי.');
  if (typeof weight !== 'number' || !Number.isFinite(weight) || weight < 0 || weight > 1000) throw new TrainingError('המשקל צריך להיות בין 0 ל־1,000 ק״ג.');
  if (typeof notes !== 'string' || notes.length > 500) throw new TrainingError('אפשר לכתוב עד 500 תווים בהערה.');
  const rawTempo=value.tempo===undefined?defaults.tempo:value.tempo;
  let tempo:ExerciseTempo|null|undefined;
  if(rawTempo===null)tempo=null;
  else if(rawTempo!==undefined){
   if(unit!=='reps'||!isRecord(rawTempo))throw new TrainingError('טמפו זמין לתרגילים הנמדדים בחזרות.');
   const keys=['eccentric','bottom','concentric','top'] as const;
   if(keys.some(k=>typeof rawTempo[k]!=='number'||!Number.isFinite(rawTempo[k])||Number(rawTempo[k])<0||Number(rawTempo[k])>60||!Number.isInteger(Number(rawTempo[k])*10))||keys.every(k=>rawTempo[k]===0))throw new TrainingError('יש להגדיר זמן לכל שלב בטמפו, בין 0 ל־60 שניות, ולפחות שלב אחד מעל אפס.');
   tempo=Object.fromEntries(keys.map(k=>[k,rawTempo[k]])) as ExerciseTempo;
  }
  const rawTargets=value.targetRpes===undefined?defaults.targetRpes:value.targetRpes;
  let targetRpes:(number|null)[]|undefined;
  if(rawTargets!==undefined&&rawTargets!==null){
   if(!Array.isArray(rawTargets)||rawTargets.length>20||(value.targetRpes!==undefined&&rawTargets.length!==sets))throw new TrainingError('יש להגדיר יעד מאמץ לכל סט בתרגיל.');
   targetRpes=Array.from({length:sets},(_,i)=>i<rawTargets.length?parseRpe(rawTargets[i]):targetRpe);
  }
  const rawWarmups=value.warmupSets===undefined?defaults.warmupSets:value.warmupSets;
  let warmupSets:WarmupSetPrescription[]|undefined;
  if(rawWarmups!==undefined){
   if(!Array.isArray(rawWarmups)||rawWarmups.length>20)throw new TrainingError('אפשר להגדיר עד 20 סטים לחימום.');
   warmupSets=rawWarmups.map(set=>{
    if(!isRecord(set)||typeof set.amount!=='number'||!Number.isInteger(set.amount)||set.amount<1||set.amount>unitMax[unit as Unit]||typeof set.weight!=='number'||!Number.isFinite(set.weight)||set.weight<0||set.weight>1000)throw new TrainingError('פרטי סט החימום אינם תקינים.');
    return {amount:set.amount,weight:set.weight};
   });
  }
  const side=value.side===undefined?defaults.side:value.side===null?undefined:value.side;
  if(side!==undefined&&!['left','right','both'].includes(String(side)))throw new TrainingError('יש לבחור צד שמאל, ימין או שני הצדדים.');
  const occurrenceId=value.occurrenceId??defaults.occurrenceId;
  if(occurrenceId!==undefined&&(typeof occurrenceId!=='string'||!/^[a-zA-Z0-9:_-]{1,160}$/.test(occurrenceId)))throw new TrainingError('מזהה הופעת התרגיל אינו תקין.');
  return { exerciseId: value.exerciseId,...(load?{load}:{}),...(warmupSets===undefined?{}:{warmupSets}),...(side===undefined?{}:{side:side as PlanItem['side']}),...(occurrenceId===undefined?{}:{occurrenceId}),...(defaults.customExercise?{customExercise:defaults.customExercise}:{}),sets, reps, unit: unit as Unit, weight, notes: notes.trim(), targetRpe, effortScale,workoutSection:workoutSection as WorkoutSection,...(targetRpes?{targetRpes}:{}),...(tempo===undefined?{}:{tempo}),...(repsMax===undefined?{}:{repsMax:repsMax as number|null}),...(weightUnspecified===undefined?{}:{weightUnspecified:weightUnspecified as boolean}) };
}

export const repetitionLabel=(item:Pick<PlanItem,'reps'|'repsMax'>)=>item.repsMax!=null&&item.repsMax!==item.reps?`${item.reps}–${item.repsMax}`:String(item.reps);

export function completion(items: SessionExercise[]) {
  return items.reduce((sum, item) => sum + item.results.filter(set => set.done).length, 0);
}

/** Patch exactly one saved set, never accept arbitrary snapshots from the browser. */
export function updateSet(items: SessionExercise[], value: Record<string, unknown>): SessionExercise[] {
  const selected=resolveSessionExercise(items,value);
  const index = items.indexOf(selected);
  if (index < 0 || !Number.isInteger(value.setIndex) || Number(value.setIndex) < 0 || Number(value.setIndex) >= items[index].results.length) throw new TrainingError('הסט לא נמצא באימון.');
  if (typeof value.done !== 'boolean') throw new TrainingError('יש לציין אם הסט בוצע.');
  const amount = value.amount; const weight = value.weight;
  if (typeof amount !== 'number' || !Number.isInteger(amount) || amount < 1 || amount > unitMax[items[index].unit]) throw new TrainingError('כמות הביצוע אינה תקינה.');
  if (typeof weight !== 'number' || !Number.isFinite(weight) || weight < 0 || weight > 1000) throw new TrainingError('משקל הביצוע אינו תקין.');
  const actualRpe = value.actualRpe === undefined ? (items[index].results[Number(value.setIndex)].actualRpe ?? null) : parseRpe(value.actualRpe);
  const painDuring=value.painDuring===undefined?items[index].results[Number(value.setIndex)].painDuring:value.painDuring;
  if(painDuring!==undefined&&painDuring!==null&&!isScore(painDuring))throw new TrainingError('כאב במהלך הסט צריך להיות בין 0 ל־10.');
  return items.map((item, i) => i !== index ? item : { ...item, results: item.results.map((set, j) => j !== value.setIndex ? set : { done: value.done as boolean, amount, weight, actualRpe,weightSource:set.weightSource==='manual'||value.weightSource==='manual'||weight!==set.weight&&value.weightSource!=='automatic'?'manual':value.weightSource==='automatic'?'automatic':set.weightSource,...(painDuring===undefined?{}:{painDuring:painDuring as number|null}) }) });
}

export function formatDate(value: string): string {
  const date = new Date(value.includes('T') ? value : value.replace(' ', 'T') + 'Z');
  return Number.isNaN(date.getTime()) ? 'תאריך לא זמין' : new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}
export function durationLabel(start: string, end: string): string {
  const minutes = Math.max(0, Math.round((Date.parse(end) - Date.parse(start)) / 60000));
  if (minutes < 1) return 'פחות מדקה';
  if (minutes < 60) return `${minutes} דקות`;
  return `${Math.floor(minutes / 60)} שעות${minutes % 60 ? ` ו־${minutes % 60} דקות` : ''}`;
}

export function parseRpe(value: unknown): number|null {
  if(value === null || value === '') return null;
  if(typeof value !== 'number' || !Number.isFinite(value) || value < 1 || value > 10 || !Number.isInteger(value*2)) throw new TrainingError('RPE צריך להיות בין 1 ל־10, בקפיצות של חצי נקודה.');
  return value;
}
/** Epley estimate for loaded sets of 1–10 reps only; not a measured maximum. */
export function estimated1RM(weight:number,reps:number):number|null {
  if(!Number.isFinite(weight)||weight<=0||!Number.isInteger(reps)||reps<1||reps>10)return null;
  return Math.round((reps===1?weight:weight*(1+reps/30))*10)/10;
}
export function nextLoad(item:SessionExercise,session:TrainingSession):{weight:number|null;text:string} {
  if(!hasTotalLoad(item))return {weight:null,text:'יש להזין עומס כולל במפורש לפני חישוב עומס.'};
  if(workoutSection(item)!=='main')return {weight:null,text:'הצעת משקל זמינה לתרגילי האימון בלבד, לא לחימום או למתיחות.'};
  const sets=item.results.filter(s=>s.done);
  if(session.before>0||(session.after??0)>0||(duringPain(session.items??[item])??0)>0||(session.followup?.pain??0)>0)return {weight:null,text:'דווח כאב. יש להתייעץ עם הצוות לפני שינוי עומס.'};
  if(item.unit!=='reps'||item.results.some((_,i)=>targetRpeForSet(item,i)==null)||sets.length!==item.sets||sets.some(s=>!s.actualRpe||s.weight<=0))return {weight:null,text:'הצעה תוצג לאחר השלמת כל הסטים עם משקל ויעד מאמץ ודיווח מאמץ בפועל.'};
  if(new Set(sets.map(s=>s.weight)).size!==1)return {weight:null,text:'נרשמו משקלים שונים. בחרו עומס להמשך יחד עם המאמן.'};
  const weight=sets[0].weight;
  const factor=sets.some((s,i)=>s.amount<item.reps||s.actualRpe!>targetRpeForSet(item,i)!+0.5)?0.975:sets.every((s,i)=>s.actualRpe!<targetRpeForSet(item,i)!-0.5)?1.025:1;
  return {weight:Math.round(weight*factor*4)/4,text:factor>1?'הצעה לדיון עם המאמן: עלייה של כ־2.5%':factor<1?'הצעה לדיון עם המאמן: הפחתה של כ־2.5%':'הצעה לדיון עם המאמן: אותו עומס'};
}

export function targetRpeForSet(item:Pick<PlanItem,'targetRpe'|'targetRpes'>,index:number):number|null{return item.targetRpes&&index<item.targetRpes.length?item.targetRpes[index]:item.targetRpe??null;}

export function resizedSetTargets(item:PlanItem,sets:number):(number|null)[]|undefined{return item.targetRpes?Array.from({length:Math.max(0,Math.min(20,sets))},(_,i)=>targetRpeForSet(item,i)):undefined;}

/** Stable occurrence identity; old stored plans/sessions keep their original exercise links. */
export const exerciseOccurrenceKey=(item:PlanItem)=>item.occurrenceId??`${item.dayId??'1'}:${item.exerciseId}`;
export function withOccurrenceIds<T extends PlanItem>(items:T[]):T[]{
 const used=new Set(items.flatMap(i=>i.occurrenceId?[i.occurrenceId]:[]));
 return items.map(item=>{if(item.occurrenceId)return item;const base=`${item.dayId??'1'}:${item.exerciseId}`;let id=base,n=1;while(used.has(id))id=`${base}:${++n}`;used.add(id);return {...item,occurrenceId:id};});
}
/** Legacy exercise-only requests remain valid only when they address exactly one occurrence. */
export function resolveSessionExercise<T extends PlanItem>(items:T[],value:Record<string,unknown>):T{
 const found=items.filter(item=>value.occurrenceId!==undefined?exerciseOccurrenceKey(item)===value.occurrenceId&&item.exerciseId===value.exerciseId:item.exerciseId===value.exerciseId);
 if(found.length!==1)throw new TrainingError('יש לבחור הופעת תרגיל אחת מהאימון.');
 return found[0];
}

/** Warmup results use a separate array and the same strict occurrence/set validation. */
export function updateWarmupSet(items:SessionExercise[],value:Record<string,unknown>):SessionExercise[]{
 const selected=resolveSessionExercise(items,value);
 if(!selected.warmupSets||selected.warmupResults?.length!==selected.warmupSets.length)throw new TrainingError('סט החימום לא נמצא באימון.');
 const updated=updateSet([{...selected,results:selected.warmupResults}],value)[0];
 return items.map(item=>item!==selected?item:{...item,warmupResults:updated.results});
}

/** Strength statistics count work results only; workout task completion remains section-inclusive. */
export const workCompletion=(items:SessionExercise[])=>completion(items.filter(item=>workoutSection(item)==='main'));
