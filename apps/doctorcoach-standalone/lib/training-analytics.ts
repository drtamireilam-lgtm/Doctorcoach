import type {TrainingSession,SessionExercise} from './training.ts';
import {targetRpeForSet} from './training.ts';
import {hasTotalLoad} from './load-units.ts';
import {workoutSection} from './workout-sections.ts';
import {israelDay} from './workout-context.ts';
import {setEstimated1RM} from './set-load.ts';
import {exerciseAnatomyLinks} from './anatomy-exercises.ts';
import {exerciseAliases} from './rehab-exercises.ts';

export type AnalyticsPeriod={start:string;end:string};
export type TrainingObservation={kind:'plateau'|'effort'|'incomplete'|'substitution'|'load-change';sourceIds:string[];exerciseId?:string;value:number};
const finite=(n:unknown):n is number=>typeof n==='number'&&Number.isFinite(n);
const mean=(ns:number[])=>ns.length?Math.round(ns.reduce((a,b)=>a+b,0)/ns.length*100)/100:null;
const date=(s:string)=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
const dayOf=(s:TrainingSession)=>s.retrospective?.date??israelDay(s.finishedAt??s.startedAt);
// Date-only retrospective records never borrow their later upload timestamp.
const performedTime=(s:TrainingSession)=>{const at=s.retrospective?s.retrospective.performedAt:s.finishedAt??s.startedAt;return at&&Number.isFinite(Date.parse(at))?Date.parse(at):null;};
const sessionOrder=(a:TrainingSession,b:TrainingSession)=>{const day=dayOf(a).localeCompare(dayOf(b));if(day)return day;const left=performedTime(a),right=performedTime(b);return left!==null&&right!==null?left-right||a.id.localeCompare(b.id):left===null&&right===null?a.id.localeCompare(b.id):left===null?1:-1;};
const keyOf=(i:SessionExercise)=>JSON.stringify([exerciseAliases[i.exerciseId]??i.exerciseId,i.side??'both',i.unit,i.load?.basis??'total',i.tempo??null]);

/** Read-only statistics from the already authorized feed; never infer activation or hypertrophy. */
export function trainingAnalytics(history:TrainingSession[],period:AnalyticsPeriod,options:{volumeChangePercent?:number}={}){
 if(!date(period.start)||!date(period.end)||period.end<=period.start||(Date.parse(period.end)-Date.parse(period.start))/86400000>366)throw new Error('Choose a valid analysis period of up to366 days.');
 const volumeThreshold=options.volumeChangePercent??30;if(!finite(volumeThreshold)||volumeThreshold<=0||volumeThreshold>1000)throw new Error('Invalid observation threshold.');
 const latest=new Map<string,TrainingSession>();for(const s of history){const old=latest.get(s.id);if(!old||s.version>old.version)latest.set(s.id,s);}
 const sessions=[...latest.values()].filter(s=>s.status==='completed'&&date(dayOf(s))&&dayOf(s)>=period.start&&dayOf(s)<period.end).sort(sessionOrder);
 const muscles=new Map<string,{slug:string;part?:string;primary:number;secondary:number;stabilizer:number}>();
 const exercises=new Map<string,{key:string;id:string;name:string;side:string;points:{sessionId:string;day:string;sets:number;volumeKg:number|null;weight:number|null;reps:number|null;e1rm:number|null;effortDelta:number|null}[]}>();
 const daily=new Map<string,{day:string;sessions:number;sets:number;volumeKg:number|null}>();
 const observations:TrainingObservation[]=[];let sets=0,plannedSets=0,volume=0,quantified=0,unquantifiedSets=0,missing=0,above=0,below=0,onTarget=0,unmappedSets=0;
 const differences:number[]=[];const missedSources=new Set<string>();const substitutions=new Map<string,string[]>();
 for(const session of sessions){
  const day=dayOf(session),dailyRow=daily.get(day)??{day,sessions:0,sets:0,volumeKg:null};dailyRow.sessions++;
  let sessionDone=0,sessionPlanned=0;
  for(const item of session.items){
   if(item.cardio||workoutSection(item)!=='main')continue;
   const done=item.results.filter(r=>r.done);plannedSets+=item.sets;sessionPlanned+=item.sets;sets+=done.length;sessionDone+=done.length;dailyRow.sets+=done.length;
   if(!done.length)continue;
   const key=keyOf(item),row=exercises.get(key)??{key,id:exerciseAliases[item.exerciseId]??item.exerciseId,name:item.name,side:item.side??'both',points:[]};
   const loads:number[]=[],repetitions:number[]=[],estimates:number[]=[],deltas:number[]=[];let itemVolume=0,itemQuantified=0;
   for(const set of done){
    const validReps=item.unit==='reps'&&finite(set.amount)&&Number.isInteger(set.amount)&&set.amount>=1&&set.amount<=100;
    if(validReps)repetitions.push(set.amount!);
    const validLoad=item.exerciseId!=='assisted-pull-up'&&item.unit==='reps'&&hasTotalLoad(item)&&finite(set.weight)&&set.weight>=0&&set.weight<=1000&&finite(set.amount)&&Number.isInteger(set.amount)&&set.amount>=1&&set.amount<=100;
    if(validLoad){const amount=set.amount!,weight=set.weight!;itemVolume+=weight*amount;itemQuantified++;loads.push(weight);}
    else unquantifiedSets++;
    const estimate=item.exerciseId!=='assisted-pull-up'&&hasTotalLoad(item)&&(set.painDuring??0)===0?setEstimated1RM(set,item.unit):null;if(estimate!==null)estimates.push(estimate);
    const index=item.results.indexOf(set),target=targetRpeForSet(item,index),actual=set.actualRpe;
    if(finite(target)&&target>=1&&target<=10&&finite(actual)&&actual>=1&&actual<=10){const delta=actual-target;differences.push(delta);deltas.push(delta);if(delta>.5){above++;missedSources.add(session.id);}else if(delta<-.5){below++;missedSources.add(session.id);}else onTarget++;}else missing++;
   }
   quantified+=itemQuantified;volume+=itemVolume;if(itemQuantified)dailyRow.volumeKg=(dailyRow.volumeKg??0)+itemVolume;
   row.points.push({sessionId:session.id,day,sets:done.length,volumeKg:itemQuantified?Math.round(itemVolume*100)/100:null,weight:loads.length?Math.max(...loads):null,reps:repetitions.length?Math.max(...repetitions):null,e1rm:estimates.length?Math.max(...estimates):null,effortDelta:mean(deltas)});exercises.set(key,row);
   const links=exerciseAnatomyLinks(item.exerciseId).filter(l=>l.role!=='stretch');if(!links.length)unmappedSets+=done.length;
   for(const link of links){const k=link.slug+':'+(link.part??''),m=muscles.get(k)??{slug:link.slug,...link.part?{part:link.part}:{},primary:0,secondary:0,stabilizer:0};if(link.role!=='stretch')m[link.role]+=done.length;muscles.set(k,m);}
   if(item.swappedFrom){const ids=substitutions.get(item.swappedFrom)??[];ids.push(session.id);substitutions.set(item.swappedFrom,ids);}
  }
  if(sessionDone<sessionPlanned)observations.push({kind:'incomplete',sourceIds:[session.id],value:sessionPlanned-sessionDone});
  daily.set(day,dailyRow);
 }
 for(const row of exercises.values()){
  // One estimate per session, even when an exercise occurs twice in that workout.
  const perSession=new Map<string,number>();for(const p of row.points)if(p.e1rm!==null)perSession.set(p.sessionId,Math.max(perSession.get(p.sessionId)??0,p.e1rm));
  const entries=[...perSession.entries()].slice(-3),values=entries.map(([,n])=>n);
  if(values.length===3&&Math.max(...values)>0&&(Math.max(...values)-Math.min(...values))/Math.max(...values)<=.01)observations.push({kind:'plateau',exerciseId:row.id,sourceIds:entries.map(([id])=>id),value:3});
 }
 if(above+below>=3)observations.push({kind:'effort',sourceIds:[...missedSources],value:above+below});
 for(const [exerciseId,ids] of substitutions)if(new Set(ids).size>=2)observations.push({kind:'substitution',exerciseId,sourceIds:[...new Set(ids)],value:new Set(ids).size});
 const previousStart=new Date(Date.parse(period.start)-(Date.parse(period.end)-Date.parse(period.start))).toISOString().slice(0,10);
 const previous=[...latest.values()].filter(s=>s.status==='completed'&&date(dayOf(s))&&dayOf(s)>=previousStart&&dayOf(s)<period.start);
 const priorLoads=previous.flatMap(s=>s.items.filter(i=>!i.cardio&&workoutSection(i)==='main'&&i.exerciseId!=='assisted-pull-up'&&i.unit==='reps'&&hasTotalLoad(i)).flatMap(i=>i.results.filter(r=>r.done&&finite(r.weight)&&r.weight>=0&&r.weight<=1000&&finite(r.amount)&&Number.isInteger(r.amount)&&r.amount>=1&&r.amount<=100).map(r=>r.weight!*r.amount!)));
 const previousKg=priorLoads.length?Math.round(priorLoads.reduce((a,b)=>a+b,0)*100)/100:null,currentKg=quantified?Math.round(volume*100)/100:null;
 const changePercent=previousKg!==null&&previousKg>0&&currentKg!==null?Math.round((currentKg/previousKg-1)*1000)/10:null;
 if(sessions.length>=2&&previous.length>=2&&changePercent!==null&&Math.abs(changePercent)>=volumeThreshold)observations.push({kind:'load-change',sourceIds:[...previous,...sessions].map(s=>s.id),value:changePercent});
 return {period,sessions:sessions.length,sets,plannedSets,completion:plannedSets?Math.round(sets/plannedSets*100):null,volumeKg:currentKg,volumeComparison:{previousStart,previousEnd:period.start,previousKg,currentKg,changePercent},unquantifiedSets,unmappedSets,effort:{reported:differences.length,missing,above,below,onTarget,averageDelta:mean(differences)},muscles:[...muscles.values()].sort((a,b)=>b.primary-a.primary||b.secondary-a.secondary||a.slug.localeCompare(b.slug)),exercises:[...exercises.values()],daily:[...daily.values()],observations};
}
