import {israelDay} from './workout-context.ts';
import {hasTotalLoad} from './load-units.ts';
import {nextLoad} from './training.ts';
import type {PlanItem,TrainingFeed,TrainingSession} from './training.ts';
import {planItemKey,workoutDayId} from './workout-days.ts';
import {workoutSection} from './workout-sections.ts';

const performedDay=(session:TrainingSession)=>session.retrospective?.date??israelDay(session.finishedAt??session.startedAt);
const performedTime=(session:TrainingSession)=>{const at=session.retrospective?session.retrospective.performedAt:session.finishedAt??session.startedAt;return at&&Number.isFinite(Date.parse(at))?Date.parse(at):null;};
/** Proposals edit only a coach's draft; publication remains the existing revision flow. */
export function progressionProposal(item:PlanItem,programId:string,feed:TrainingFeed){
 const none=(reason:string)=>({weight:null as number|null,reason,sourceId:null as string|null,finishedAt:null as string|null});
 if(item.exerciseId==='assisted-pull-up')return none('משקל סיוע אינו עומס חיצוני; נדרשת התאמה מפורשת של המאמן.');
 if(item.weightUnspecified||!hasTotalLoad(item))return none('נדרש משקל כולל מפורש לפני הצעת התקדמות.');
 if(workoutSection(item)!=='main')return none('הצעת משקל זמינה לתרגילי האימון בלבד, לא לחימום או למתיחות.');
 if(feed.active)return none('יש אימון פעיל. יש לסיים או לבטל אותו ולרענן את התיק לפני הצעה להמשך.');
 const history=feed.history.filter(s=>s.status==='completed'&&s.programId===programId&&s.items.some(i=>workoutDayId(i)===workoutDayId(item))).slice().sort((a,b)=>{const day=performedDay(b).localeCompare(performedDay(a));if(day)return day;const left=performedTime(a),right=performedTime(b);return left!==null&&right!==null?right-left||a.id.localeCompare(b.id):left===null&&right===null?a.id.localeCompare(b.id):left===null?1:-1;});
 const session=history[0];
 if(!session)return none('אין אימון שהושלם ליום הזה בגרסת התוכנית הפעילה.');
 const sameDay=history.filter(s=>performedDay(s)===performedDay(session));
 if(sameDay.length>1&&sameDay.some(s=>performedTime(s)===null))return none('סדר הביצוע באותו יום אינו ידוע; נדרשת בדיקת מאמן לפני בחירת אימון המקור.');
 const source=session.items.find(i=>planItemKey(i)===planItemKey(item));
 if(!source||source.exerciseId!==item.exerciseId||source.swappedFrom)return none('באימון האחרון לא בוצע התרגיל המקורי. העומס דורש התאמה של המאמן.');
 if((source.side??'both')!==(item.side??'both')||(source.load?.sourceUnit??'kg')!==(item.load?.sourceUnit??'kg')||source.load?.basis!==item.load?.basis||JSON.stringify(source.customExercise??null)!==JSON.stringify(item.customExercise??null)||source.unit!==item.unit||source.sets!==item.sets||source.reps!==item.reps||(source.repsMax??null)!==(item.repsMax??null)||source.targetRpe!==item.targetRpe||JSON.stringify(source.targetRpes??null)!==JSON.stringify(item.targetRpes??null)||JSON.stringify(source.setReps??null)!==JSON.stringify(item.setReps??null))return none('המינון או יעד המאמץ בטיוטה שונים מהאימון. יש לקבוע עומס מחדש.');
 if(JSON.stringify(source.tempo??null)!==JSON.stringify(item.tempo??null))return none('הטמפו בטיוטה השתנה. יש לקבוע עומס מחדש.');
 if(!item.targetRpe||item.targetRpe<6||source.results.some(s=>s.done&&(s.actualRpe==null||s.actualRpe<6)))return none('נדרשים יעד ודיווח מאמץ בטווח RPE ‏6–10 או RIR ‏0–4.');
 const proposal=nextLoad(source,session);
 return {weight:proposal.weight,reason:proposal.text,sourceId:session.id,finishedAt:session.retrospective?(session.retrospective.performedAt??session.retrospective.date):session.finishedAt??session.startedAt};
}
