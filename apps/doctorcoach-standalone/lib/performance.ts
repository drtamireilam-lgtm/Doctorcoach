import {workoutSection} from './workout-sections.ts';
import {estimated1RM} from './training.ts';
import type {TrainingSession} from './training.ts';
import {setEstimated1RM} from './set-load.ts';

export type EstimateMethod='effort'|'reps';
export function performancePoints(history:TrainingSession[],exerciseId:string,method:EstimateMethod='effort'){
 return history.filter(s=>s.status==='completed').slice().sort((a,b)=>(a.finishedAt??a.startedAt).localeCompare(b.finishedAt??b.startedAt)).flatMap(session=>{
  const items=session.items.filter(item=>item.exerciseId===exerciseId&&item.unit==='reps'&&workoutSection(item)==='main');
  if(!items.length)return [];
  const sets=items.flatMap(item=>item.results).filter(set=>set.done);
  const estimates=sets.map(set=>method==='effort'?setEstimated1RM(set,'reps'):estimated1RM(set.weight,set.amount)).filter((value):value is number=>value!==null);
  const weights=sets.map(set=>set.weight).filter(weight=>Number.isFinite(weight)&&weight>0&&weight<=1000);
  // Keep missing estimates as gaps; never substitute a different formula silently.
  return [{id:session.id,at:session.finishedAt??session.startedAt,e1rm:estimates.length?Math.max(...estimates):null,weight:weights.length?Math.max(...weights):null}];
 });
}
export function performanceSummary(points:ReturnType<typeof performancePoints>){
 const estimates=points.map(p=>p.e1rm).filter((n):n is number=>n!==null);
 const last=points.at(-1)?.e1rm??null;
 const previous=points.slice(0,-1).map(p=>p.e1rm).filter((n):n is number=>n!==null);
 return {best:estimates.length?Math.max(...estimates):null,last,isPr:last!==null&&previous.length>0&&last>Math.max(...previous)};
}
