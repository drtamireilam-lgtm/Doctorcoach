import type {TrainingSession} from './training.ts';
/** Completion units are performed strength sets and explicitly completed cardio activities. */
export function workoutProgress(session:Pick<TrainingSession,'plannedSets'|'completedSets'|'items'>){
 const cardio=session.items.filter(i=>i.cardio),cardioPlanned=cardio.length,cardioCompleted=cardio.filter(i=>i.cardioResult?.status==='completed').length;
 const planned=session.plannedSets+cardioPlanned,completed=session.completedSets+cardioCompleted;
 return {percentage:planned?Math.min(100,Math.round(completed/planned*100)):0,allComplete:planned>0&&completed===planned,cardioPlanned,cardioCompleted};
}
