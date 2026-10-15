import {targetRpeForSet} from './training.ts';
import type {SessionExercise,SetResult,TrainingSession} from './training.ts';
import {duringPain} from './workout-context.ts';
import {workoutSection} from './workout-sections.ts';
export const loadSteps=[0.25,0.5,1,1.25,2.5,5];
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
 const items=(session.items??[item]).map(existing=>existing.exerciseId===item.exerciseId?preview:existing);
 return nextSetLoad(preview,index,{...session,items},step);
}
export function nextSetLoad(item:SessionExercise,index:number,session:Pick<TrainingSession,'before'|'after'>&Partial<Pick<TrainingSession,'items'>>,step=2.5):{weight:number|null;calculatedWeight:number|null;relativePercent:number|null;text:string;estimate:number|null}{
 const target=targetRpeForSet(item,index+1);
 const source=item.results[index],next=item.results[index+1];const estimate=source?setEstimated1RM(source,item.unit):null;
 const none=(text:string)=>({weight:null,calculatedWeight:null,relativePercent:null,text,estimate});
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
 if(!loadSteps.includes(step))return {weight:null,calculatedWeight,relativePercent,text,estimate};
 // Product guardrail, not a clinical threshold: at most 5% per set, rounded toward the current load.
 const bounded=Math.max(weight*.95,Math.min(weight*1.05,raw));
 const rounded=bounded>weight?Math.floor((bounded+1e-8)/step)*step:bounded<weight?Math.ceil((bounded-1e-8)/step)*step:weight;
 const result=Math.round((bounded>weight?Math.max(weight,rounded):Math.min(weight,rounded))*100)/100;
 if(result<=0||result>1000)return {weight:null,calculatedWeight,relativePercent,estimate,text};
 return {weight:result,calculatedWeight,relativePercent,estimate,text};
}
