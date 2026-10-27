import {hasTotalLoad,toKg} from './load-units.ts';
import {exerciseOccurrenceKey,targetRpeForSet,nextLoad} from './training.ts';
import type {SessionExercise,SetResult,TrainingSession} from './training.ts';
import {duringPain} from './workout-context.ts';
import {workoutSection} from './workout-sections.ts';
export const loadSteps=[0.25,0.5,1,1.25,2.5,5];
/** Recalculate the unperformed set from its saved predecessor, never from its own target as actual effort. */
export function automaticSetDraft(item:SessionExercise,index:number,session:Pick<TrainingSession,'before'|'after'>&Partial<Pick<TrainingSession,'items'>>,draft:SetResult&{targetRpe:number|null},enabled=true,step=2.5){
 if(!enabled||draft.weightSource==='manual'||index<1||draft.done||draft.actualRpe!=null||(draft.painDuring??0)>0)return draft;
 const adjusted={...item,targetRpes:Array.from({length:item.results.length},(_,n)=>n===index?draft.targetRpe:targetRpeForSet(item,n)),results:item.results.map((r,n)=>n===index?draft:r)};
 const items=(session.items??[item]).map(i=>exerciseOccurrenceKey(i)===exerciseOccurrenceKey(item)?adjusted:i);
 const weight=nextSetLoad(adjusted,index-1,{...session,items},step).weight;
 return weight!==null&&weight>0&&weight<=1000?{...draft,weight,weightSource:'automatic' as const}:draft;
}
const effort=(n:unknown):n is number=>typeof n==='number'&&Number.isFinite(n)&&n>=6&&n<=10&&Number.isInteger(n*2);
const factor=(reps:number,rpe:number)=>{const effective=reps+10-rpe;return effective===1?1:1+effective/30;};
/** RIR-adjusted Epley heuristic, not a validated individual 1RM measurement. */
export function setEstimated1RM(set:SetResult,unit:string):number|null{
 if(unit!=='reps'||!Number.isFinite(set.weight)||set.weight<=0||set.weight>1000||!Number.isInteger(set.amount)||set.amount<1||set.amount>10||!effort(set.actualRpe))return null;
 return Math.round(set.weight*factor(set.amount,set.actualRpe)*10)/10;
}
/** Read-only preview: never marks a set done or changes a stored load. */
export function previewNextSetLoad(item:SessionExercise,index:number,session:Pick<TrainingSession,'before'|'after'>&Partial<Pick<TrainingSession,'items'>>,draft:SetResult&{targetRpe?:number|null},step=2.5){
 const preview:SessionExercise={...item,results:item.results.map((result,n)=>n===index?{...draft,done:true}:result)};
 // Match the existing first-target behavior of independent sessions.
 if(!item.targetRpes&&item.targetRpe==null&&draft.targetRpe!=null)preview.targetRpe=draft.targetRpe;
 const items=(session.items??[item]).map(existing=>exerciseOccurrenceKey(existing)===exerciseOccurrenceKey(item)?preview:existing);
 return nextSetLoad(preview,index,{...session,items},step);
}
export function nextSetLoad(item:SessionExercise,index:number,session:Pick<TrainingSession,'before'|'after'>&Partial<Pick<TrainingSession,'items'>>,step=2.5):{weight:number|null;calculatedWeight:number|null;relativePercent:number|null;text:string;estimate:number|null}{
 const target=targetRpeForSet(item,index+1);
 const source=item.results[index],next=item.results[index+1];const estimate=source&&hasTotalLoad(item)&&workoutSection(item)==='main'?setEstimated1RM(source,item.unit):null;
 const none=(text:string)=>({weight:null,calculatedWeight:null,relativePercent:null,text,estimate});
 if(!hasTotalLoad(item))return none('המשקל נמדד לכל צד; נדרש עומס כולל מפורש לחישובי כוח.');
 if(workoutSection(item)!=='main')return none('הצעת משקל זמינה לתרגילי האימון בלבד, לא לחימום או למתיחות.');
 if(!source?.done)return none('סמנו את הסט כבוצע כדי לחשב את המשקל לסט הבא.');
 if(!next)return none('זה הסט האחרון בתרגיל.');
 if(next.done||item.results.slice(index+1).some(s=>s.done))return none('כבר נשמר ביצוע בסט מאוחר יותר.');
 if(session.before>0||(session.after??0)>0||(duringPain(session.items??[item])??0)>0)return none('דווח כאב — התאמת העומס תיעשה עם הצוות.');
 if(estimate===null)return none(item.effortScale==='rir'?'לחישוב נדרשים משקל חיצוני, 1–10 חזרות ו־RIR בין 0 ל־4.':'לחישוב נדרשים משקל חיצוני, 1–10 חזרות ו־RPE בין 6 ל־10.');
 if(!effort(target))return none(item.effortScale==='rir'?'להתאמת משקל נדרש RIR יעד בין 0 ל־4.':'להתאמת משקל נדרש RPE יעד בין 6 ל־10.');
 if(!Number.isInteger(next.amount)||next.amount<1||next.amount>10)return none('בדקו את מספר החזרות בסט הבא.');
 const weight=source.weight;const raw=weight*factor(source.amount,source.actualRpe!)/factor(next.amount,target!);
 const calculatedWeight=Math.round(raw*10)/10;
 const relativePercent=Math.round((raw/weight-1)*1000)/10;
 const text=relativePercent>0?`עלייה מחושבת של ${relativePercent}% מהסט הקודם.`:relativePercent<0?`ירידה מחושבת של ${Math.abs(relativePercent)}% מהסט הקודם.`:'המשקל המחושב נשאר כמו בסט הקודם.';
 if(!Number.isFinite(raw)||raw<=0)return none('לא ניתן לחשב משקל.');
 if(!loadSteps.some(n=>Math.abs(n-step)<1e-8||Math.abs(toKg(n,'lb')-step)<1e-8))return {weight:null,calculatedWeight,relativePercent,text,estimate};
 // Product guardrail, not a clinical threshold: at most 5% per set, rounded toward the current load.
 const bounded=Math.max(weight*.95,Math.min(weight*1.05,raw));
 const rounded=bounded>weight?Math.floor((bounded+1e-8)/step)*step:bounded<weight?Math.ceil((bounded-1e-8)/step)*step:weight;
 const result=Math.round((bounded>weight?Math.max(weight,rounded):Math.min(weight,rounded))*100)/100;
 if(result<=0||result>1000)return {weight:null,calculatedWeight,relativePercent,estimate,text};
 return {weight:result,calculatedWeight,relativePercent,estimate,text};
}

/** A read-only opening suggestion from the latest matching workout, never a plan edit. */
export function openingSetLoad(item:SessionExercise,history:TrainingSession[],active?:TrainingSession):{weight:number|null;text:string}{
 const none={weight:null,text:''};
 if(active&&(active.before>0||(active.after??0)>0||(duringPain(active.items)??0)>0))return none;
 for(const session of history){
  if(session.status!=='completed'||active&&(session.planMode!==active.planMode||session.programId!==active.programId))continue;
  const previous=session.items.find(i=>exerciseOccurrenceKey(i)===exerciseOccurrenceKey(item)&&i.exerciseId===item.exerciseId);
  if(!previous)continue;
  if(previous.reps!==item.reps||previous.repsMax!==item.repsMax||previous.sets!==item.sets||previous.unit!==item.unit||previous.effortScale!==item.effortScale||previous.load?.basis!==item.load?.basis||JSON.stringify(previous.targetRpes??previous.targetRpe)!==JSON.stringify(item.targetRpes??item.targetRpe))return none;
  return nextLoad(previous,session);
 }
 return none;
}

/** Merge server acknowledgement without losing locally edited fields. */
export function mergeSetDraft(old:SetResult&{targetRpe:number|null},fresh:SetResult&{targetRpe:number|null},draft:SetResult&{targetRpe:number|null}){
 const editedWeight=draft.weight!==old.weight||draft.weightSource!==old.weightSource;
 return {...fresh,amount:draft.amount!==old.amount?draft.amount:fresh.amount,weight:editedWeight?draft.weight:fresh.weight,weightSource:editedWeight?draft.weightSource:fresh.weightSource,actualRpe:draft.actualRpe!==old.actualRpe?draft.actualRpe:fresh.actualRpe,painDuring:draft.painDuring!==old.painDuring?draft.painDuring:fresh.painDuring,targetRpe:draft.targetRpe!==old.targetRpe?draft.targetRpe:fresh.targetRpe};
}
