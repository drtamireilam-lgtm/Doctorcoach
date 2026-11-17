import type {PlanItem,TrainingSession} from './training.ts';
import {workoutMuscleSummary,type WorkoutMuscleRow} from './anatomy-workout.ts';
import {workoutSection} from './workout-sections.ts';
import {exerciseAnatomyLinks} from './anatomy-exercises.ts';
import {israelDay} from './workout-context.ts';
const validDay=(day:string)=>/^\d{4}-\d{2}-\d{2}$/.test(day)&&Number.isFinite(Date.parse(day))&&new Date(day).toISOString().slice(0,10)===day;
const validTimestamp=(at:string)=>typeof at==='string'&&validDay(at.slice(0,10))&&Number.isFinite(Date.parse(at));
function performedDay(session:TrainingSession){if(session.retrospective)return validDay(session.retrospective.date)?session.retrospective.date:null;const at=session.finishedAt??session.startedAt;return validTimestamp(at)?israelDay(at):null;}
function latestHistory(history:readonly TrainingSession[]){const latest=new Map<string,TrainingSession>();for(const s of history){const old=latest.get(s.id);if(!old||s.version>old.version)latest.set(s.id,s);}return [...latest.values()].filter(s=>s.status==='completed');}
export function completedMuscleSessions(history:readonly TrainingSession[]){return latestHistory(history).flatMap(session=>{const day=performedDay(session);return day?[{session,day}]:[];}).sort((a,b)=>b.day.localeCompare(a.day)||b.session.startedAt.localeCompare(a.session.startedAt)||a.session.id.localeCompare(b.session.id));}
export function completedMuscleWeek(day:string){if(!validDay(day))return null;const date=new Date(day+'T12:00:00Z');date.setUTCDate(date.getUTCDate()-date.getUTCDay());const start=date.toISOString().slice(0,10);date.setUTCDate(date.getUTCDate()+7);return {start,end:date.toISOString().slice(0,10)};}
const working=(item:PlanItem)=>{const links=exerciseAnatomyLinks(item.exerciseId);return !item.cardio&&workoutSection(item)==='main'&&!(links.length&&links.every(l=>l.role==='stretch'));};
const zero=()=>({primary:0,secondary:0,stabilizer:0});
export type CompletedMuscleComparison=Pick<WorkoutMuscleRow,'key'|'slug'|'part'>&{planned:WorkoutMuscleRow['counts'];actual:WorkoutMuscleRow['counts'];delta:WorkoutMuscleRow['counts']};
/** Read-only projection of authorized history. Counts are documented sets, never physiological load. */
export function completedMuscleSummary(history:readonly TrainingSession[],scope:{sessionId:string}|{weekOf:string}){
 const week='weekOf' in scope?completedMuscleWeek(scope.weekOf):null;
 const sessions=completedMuscleSessions(history).filter(s=>'sessionId'in scope?s.session.id===scope.sessionId:!!week&&s.day>=week.start&&s.day<week.end);
 const actualItems:PlanItem[]=[],plannedItems:PlanItem[]=[];let missingBaselines=0,invalidResults=0,excluded=0;
 for(const {session} of sessions){
  const source=(item:PlanItem)=>({...item,dayId:session.id});
  if(session.retrospective){if(session.retrospective.source==='program'&&Array.isArray(session.retrospective.prescription)&&session.retrospective.prescription.length)plannedItems.push(...session.retrospective.prescription.map(source));else missingBaselines++;}
  else for(const item of session.items){if(item.prescription){if(working(item.prescription))plannedItems.push(source(item.prescription));}else if(working(item))missingBaselines++;}
  for(const item of session.items){if(!working(item)){excluded++;continue;}if(!Array.isArray(item.results)||item.results.length>20||item.results.some(r=>!r||typeof r.done!=='boolean')){invalidResults++;continue;}const sets=item.results.filter(r=>r.done===true).length;if(sets)actualItems.push({...source(item),sets});}
 }
 const actual=workoutMuscleSummary(actualItems),planned=workoutMuscleSummary(plannedItems),comparisonAvailable=sessions.length>0&&missingBaselines===0&&planned.unmapped.length===0&&actual.unmapped.length===0&&invalidResults===0;
 const comparison:CompletedMuscleComparison[]=[];
 if(comparisonAvailable){const rows=new Map<string,CompletedMuscleComparison>();for(const [kind,summary]of [['planned',planned],['actual',actual]]as const)for(const row of summary.muscles){let entry=rows.get(row.key);if(!entry){entry={key:row.key,slug:row.slug,...row.part?{part:row.part}:{},planned:zero(),actual:zero(),delta:zero()};rows.set(row.key,entry);}entry[kind]={...row.counts};}for(const row of rows.values()){for(const role of ['primary','secondary','stabilizer']as const)row.delta[role]=row.actual[role]-row.planned[role];comparison.push(row);}}
 return {sessions,week,actualItems,days:sessions.map(({session,day})=>({id:session.id,label:day+' · '+session.id.slice(0,8)})),actual,planned,comparison,comparisonAvailable,missingBaselines,invalidResults,excluded,invalidDates:latestHistory(history).filter(s=>!performedDay(s)).length};
}

/** Keep malformed records out of legacy charts/details; the map receives the raw feed for disclosure. */
export function completedMuscleDisplayHistory(history:readonly TrainingSession[]){return history.filter(s=>validTimestamp(s.startedAt)&&(!s.finishedAt||validTimestamp(s.finishedAt))&&s.items.every(i=>Array.isArray(i.results)&&i.results.every(r=>r&&typeof r.done==='boolean')&&(!i.warmupResults||i.warmupResults.every(r=>r&&typeof r.done==='boolean'))));}
