import {exerciseOccurrenceKey,type SessionExercise,type TrainingSession} from './training.ts';
import {workoutDayId} from './workout-days.ts';
import {workoutSection} from './workout-sections.ts';
export function previousSetPerformance(item:SessionExercise,index:number,active:TrainingSession,history:TrainingSession[]){
 const candidates=history.filter(s=>s.id!==active.id&&s.status==='completed'&&s.planMode===active.planMode&&s.programId===active.programId&&s.finishedAt&&s.finishedAt<=active.startedAt).sort((a,b)=>b.finishedAt!.localeCompare(a.finishedAt!));
 for(const session of candidates){
  const match=session.items.find(i=>i.exerciseId===item.exerciseId&&exerciseOccurrenceKey(i)===exerciseOccurrenceKey(item)&&i.unit===item.unit&&workoutDayId(i)===workoutDayId(item)&&i.load?.basis===item.load?.basis&&workoutSection(i)===workoutSection(item));
  if(match)return match.results[index]?.done?match.results[index]:null;
 }
 return null;
}
