import {nextLoad} from './training.ts';
import type {PlanItem,TrainingFeed} from './training.ts';
import {planItemKey,workoutDayId} from './workout-days.ts';

/** Proposals edit only a coach's draft; publication remains the existing revision flow. */
export function progressionProposal(item:PlanItem,programId:string,feed:TrainingFeed){
 const none=(reason:string)=>({weight:null as number|null,reason,sourceId:null as string|null,finishedAt:null as string|null});
 if(feed.active)return none('יש אימון פעיל. יש לסיים או לבטל אותו ולרענן את התיק לפני הצעה להמשך.');
 const session=feed.history.filter(s=>s.status==='completed'&&s.programId===programId&&s.items.some(i=>workoutDayId(i)===workoutDayId(item))).slice().sort((a,b)=>(b.finishedAt??b.startedAt).localeCompare(a.finishedAt??a.startedAt))[0];
 if(!session)return none('אין אימון שהושלם ליום הזה בגרסת התוכנית הפעילה.');
 const source=session.items.find(i=>planItemKey(i)===planItemKey(item));
 if(!source||source.swappedFrom)return none('באימון האחרון לא בוצע התרגיל המקורי. העומס דורש התאמה של המאמן.');
 if(source.unit!==item.unit||source.sets!==item.sets||source.reps!==item.reps||source.targetRpe!==item.targetRpe)return none('המינון או יעד המאמץ בטיוטה שונים מהאימון. יש לקבוע עומס מחדש.');
 if(!item.targetRpe||item.targetRpe<6||source.results.some(s=>s.done&&(s.actualRpe==null||s.actualRpe<6)))return none('נדרשים יעד ודיווח מאמץ בטווח RPE ‏6–10 או RIR ‏0–4.');
 const proposal=nextLoad(source,session);
 return {weight:proposal.weight,reason:proposal.text,sourceId:session.id,finishedAt:session.finishedAt??session.startedAt};
}
