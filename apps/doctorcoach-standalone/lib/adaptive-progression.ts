import {israelDay} from './workout-context.ts';
import {hasTotalLoad} from './load-units.ts';
import {planItemKey,workoutDayId} from './workout-days.ts';
import {workoutSection} from './workout-sections.ts';
import type {PlanItem,TrainingFeed,TrainingSession} from './training.ts';
export type ProgressionPolicy={strategy:'double'|'reps'|'load'|'rpe';requiredSessions:number;loadStep:number};
export type ProgressionDraft={patch:Pick<Partial<PlanItem>,'weight'|'reps'|'targetRpe'>|null;reason:string;sourceIds:string[];strategy:ProgressionPolicy['strategy'];draftOnly:true};
const performedDay=(session:TrainingSession)=>session.retrospective?.date??israelDay(session.finishedAt??session.startedAt);
const performedTime=(session:TrainingSession)=>{const at=session.retrospective?session.retrospective.performedAt:session.finishedAt??session.startedAt;return at&&Number.isFinite(Date.parse(at))?Date.parse(at):null;};
/** Coach-selected deterministic policy; no stored prescription or history is mutated. */
export function adaptiveProgression(item:PlanItem,programId:string,feed:TrainingFeed,policy:ProgressionPolicy):ProgressionDraft {
 const sourceIds:string[]=[];
 const result=(patch:ProgressionDraft['patch'],reason:string):ProgressionDraft=>({patch,reason,sourceIds,strategy:policy.strategy,draftOnly:true});
 if(!['double','reps','load','rpe'].includes(policy.strategy)||!Number.isInteger(policy.requiredSessions)||policy.requiredSessions<1||policy.requiredSessions>10||!Number.isFinite(policy.loadStep)||policy.loadStep<=0||policy.loadStep>50)return result(null,'בדקו את מדיניות ההתקדמות של המאמן.');
 if(feed.active)return result(null,'יש לסיים את האימון הפעיל לפני הצעת התקדמות.');
 if(item.exerciseId==='assisted-pull-up'||item.unit!=='reps'||item.weightUnspecified||!hasTotalLoad(item)||!Number.isFinite(item.weight)||item.weight<=0||workoutSection(item)!=='main')return result(null,'נדרשים חזרות ועומס חיצוני כולל מפורש בתרגיל אימון.');
 if(!Number.isInteger(item.reps)||item.reps<1||!Number.isInteger(item.repsMax??item.reps)||(item.repsMax??item.reps)<item.reps||!item.targetRpe||item.targetRpe<6||item.targetRpe>10)return result(null,'נדרש טווח חזרות ויעד מאמץ תקין.');
 const eligible=feed.history.filter(s=>s.status==='completed'&&s.programId===programId&&s.items.some(i=>workoutDayId(i)===workoutDayId(item))).slice().sort((a,b)=>{const day=performedDay(b).localeCompare(performedDay(a));if(day)return day;const left=performedTime(a),right=performedTime(b);return left!==null&&right!==null?right-left||a.id.localeCompare(b.id):left===null&&right===null?a.id.localeCompare(b.id):left===null?1:-1;});
 const history=eligible.slice(0,policy.requiredSessions);
 const boundary=history.at(-1);
 if(boundary){const boundaryDay=performedDay(boundary),sameDay=eligible.filter(s=>performedDay(s)===boundaryDay);if(sameDay.some(s=>performedTime(s)===null)&&sameDay.some(s=>!history.includes(s)))return result(null,'סדר הביצוע באותו יום אינו ידוע; נדרשת בדיקת מאמן לפני בחירת אימוני המקור.');}
 if(history.length<policy.requiredSessions)return result(null,`נדרשים ${policy.requiredSessions} אימונים תואמים שהושלמו.`);
 let allTop=true,allEasy=true;
 for(const session of history){
  sourceIds.push(session.id);
  if(session.before!==0||session.after!==0||(session.followup?.pain??0)>0||session.items.some(i=>i.results.some(r=>(r.painDuring??0)>0)))return result(null,'דווח כאב או חסר דיווח — יש לבדוק עם הצוות.');
  const source=session.items.find(i=>planItemKey(i)===planItemKey(item));
  if(!source||source.swappedFrom||source.exerciseId!==item.exerciseId||(source.side??'both')!==(item.side??'both')||(source.load?.sourceUnit??'kg')!==(item.load?.sourceUnit??'kg')||JSON.stringify(source.customExercise??null)!==JSON.stringify(item.customExercise??null)||source.unit!==item.unit||source.sets!==item.sets||source.reps!==item.reps||(source.repsMax??null)!==(item.repsMax??null)||source.weight!==item.weight||source.load?.basis!==item.load?.basis||JSON.stringify(source.targetRpes??source.targetRpe)!==JSON.stringify(item.targetRpes??item.targetRpe)||JSON.stringify(source.setReps??null)!==JSON.stringify(item.setReps??null)||JSON.stringify(source.tempo??null)!==JSON.stringify(item.tempo??null))return result(null,'התרגיל או המינון באימון האחרון שונים מהטיוטה.');
  if(source.results.length!==item.sets||source.results.some((r,n)=>!r.done||r.weight!==item.weight||r.amount===null||!Number.isInteger(r.amount)||r.amount<(item.setReps?.[n]?.min??item.reps)||r.actualRpe==null||!Number.isFinite(r.actualRpe)||r.actualRpe<6||r.actualRpe>10||r.actualRpe>(item.targetRpes?.[n]??item.targetRpe!)))return result(null,'נדרש ביצוע מלא בטווח החזרות וביעד המאמץ בכל אימון תומך.');
  allTop&&=source.results.every((r,n)=>r.amount!>=(item.setReps?.[n]?.max??item.repsMax??item.reps));
  allEasy&&=source.results.every((r,n)=>r.actualRpe!<=(item.targetRpes?.[n]??item.targetRpe!)-1);
 }
 if(item.setReps)return result(null,'טווחים שונים לכל סט דורשים התאמה מפורשת של המאמן.');
 if(policy.strategy==='rpe')return allEasy&&!item.targetRpes&&item.targetRpe<10?result({targetRpe:Math.min(10,item.targetRpe+.5)},'טיוטה: העלאת יעד RPE בחצי נקודה לפי מדיניות המאמן.'):result(null,'אין תנאים לשינוי יעד המאמץ.');
 if(policy.strategy==='reps'||policy.strategy==='double'&&!allTop)return item.reps<(item.repsMax??item.reps)?result({reps:item.reps+1},'טיוטה: תוספת חזרה בתוך הטווח שהגדיר המאמן.'):result(null,'הגעתם לקצה טווח החזרות.');
 if(!allTop||!allEasy)return result(null,'העלאת עומס דורשת הגעה לקצה הטווח עם מרווח מאמץ בכל האימונים התומכים.');
 const weight=Math.round((item.weight+policy.loadStep)*10000)/10000;
 if(weight>1000||weight>item.weight*1.05)return result(null,'מדרגת הציוד חורגת ממגבלת המוצר של 5%; נדרשת החלטת מאמן.');
 return result(policy.strategy==='double'?{weight,reps:item.reps}:{weight},'טיוטה בלבד: מדרגת עומס שהגדיר המאמן לאחר ביצועים חוזרים.');
}
