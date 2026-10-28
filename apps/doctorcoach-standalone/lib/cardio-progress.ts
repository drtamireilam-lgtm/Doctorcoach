import type {TrainingSession} from './training.ts';
import {cardioActivity,performedCardioSeconds,type CardioActivityId} from './cardio.ts';
const known=(value:unknown):value is number=>typeof value==='number'&&Number.isFinite(value)&&value>=0;
const mean=(values:(number|undefined)[])=>{const observed=values.filter(known);return observed.length?Math.round(observed.reduce((n,v)=>n+v,0)/observed.length*10)/10:null;};
const sum=(values:(number|undefined)[])=>{const observed=values.filter(known);return observed.length?observed.reduce((n,v)=>n+v,0):null;};
/** Already-authorized history only. No permission or sharing expansion occurs here. */
export function cardioProgressSummary(sessions:TrainingSession[],options:{timezone?:string}={}){
 const timezone=options.timezone??'UTC',formatter=new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'});
 function localDay(timestamp:string|undefined){if(typeof timestamp!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(timestamp)||!Number.isFinite(Date.parse(timestamp)))return null;const rawDay=timestamp.slice(0,10);if(new Date(rawDay+'T12:00:00Z').toISOString().slice(0,10)!==rawDay)return null;const parts=formatter.formatToParts(new Date(timestamp));const get=(type:string)=>parts.find(p=>p.type===type)!.value;return `${get('year')}-${get('month')}-${get('day')}`;}
 function weekOf(day:string){const date=new Date(day+'T12:00:00Z');date.setUTCDate(date.getUTCDate()-date.getUTCDay());return date.toISOString().slice(0,10);}
 const rows=sessions.filter(s=>s.status==='completed').flatMap(session=>{const day=localDay(session.finishedAt??undefined);if(!day)return [];return session.items.filter(i=>i.cardio&&cardioActivity(i.cardio.activityId)&&i.cardioResult?.status==='completed').map(item=>({session,item,p:item.cardio!,r:item.cardioResult!,day,week:weekOf(day)}));});
 type Row=typeof rows[number];
 function aggregate(selected:Row[]){const minutes=sum(selected.map(row=>known(performedCardioSeconds(row.r))?performedCardioSeconds(row.r)/60:undefined));return {sessions:new Set(selected.map(row=>row.session.id)).size,minutes,durationObservations:selected.filter(row=>known(performedCardioSeconds(row.r))).length};}
 function activitiesFor(selected:Row[]){return [...new Set(selected.map(row=>row.p.activityId))].map(activityId=>{const activityRows=selected.filter(row=>row.p.activityId===activityId);return {activityId,...aggregate(activityRows),distanceMeters:sum(activityRows.map(row=>row.r.metrics.distanceMeters)),distanceObservations:activityRows.filter(row=>known(row.r.metrics.distanceMeters)).length,observations:activityRows.length,averageRpe:mean(activityRows.map(row=>row.r.metrics.rpe)),averageHeartRate:mean(activityRows.map(row=>row.r.metrics.heartRate))};});}
 const activities=activitiesFor(rows),weeks=[...new Set(rows.map(row=>row.week))].sort().map(week=>({week,...aggregate(rows.filter(row=>row.week===week)),activities:activitiesFor(rows.filter(row=>row.week===week))}));
 // Context never incorporates hidden prescription HR or provenance. Actual metrics only.
 function context(row:Row,metric:'paceSeconds'|'heartRate',requireEffort=true){
  const m=row.r.metrics;if(!known(m.distanceMeters)||m.distanceMeters<=0||requireEffort&&!known(m.rpe))return null;
  if(['treadmill_running','incline_walking'].includes(row.p.activityId)&&!known(m.inclinePercent))return null;
  if(['stationary_bike','elliptical','rowing_machine','skierg','stair_climber'].includes(row.p.activityId)&&(!known(m.resistance)||!m.resistanceLabel))return null;
  if(row.p.activityId==='swimming'&&!known(m.poolLengthMeters))return null;
  if(metric==='heartRate'&&!known(m.paceSeconds)&&!known(m.speedKph))return null;
  if(row.p.mode==='intervals'&&!row.p.intervals?.length)return null;
  const intervals=row.p.mode==='intervals'?row.p.intervals!.map(interval=>[interval.phase,interval.durationSeconds,interval.repeat??1,...(['distanceMeters','paceSeconds','speedKph','inclinePercent','resistance','resistanceLabel','cadence','rpe','poolLengthMeters'] as const).map(key=>interval.targets?.[key]??null)]):null;
  return JSON.stringify([row.p.activityId,row.p.customLabel??null,row.p.mode,row.p.rounds??1,intervals,m.distanceMeters,m.rpe??null,m.heartRateZone??null,m.inclinePercent??null,m.resistance??null,m.resistanceLabel??null,m.poolLengthMeters??null,m.cadence??null,metric==='heartRate'?m.paceSeconds??null:null,metric==='heartRate'?m.speedKph??null:null]);
 }
 const comparisons:{activityId:CardioActivityId;metric:'paceSeconds'|'heartRate';previousWeek:string;week:string;previous:number;current:number;change:number;previousObservations:number;currentObservations:number;distanceMeters:number;rpe:number;paceUnit:string;contextKey:string}[]=[];
 for(const metric of ['paceSeconds','heartRate'] as const){
  const groups=new Map<string,Row[]>();for(const row of rows){if(!known(row.r.metrics[metric]))continue;const key=context(row,metric);if(!key)continue;groups.set(key,[...(groups.get(key)??[]),row]);}
  for(const [contextKey,group] of groups){const byWeek=new Map<string,Row[]>();for(const row of group)byWeek.set(row.week,[...(byWeek.get(row.week)??[]),row]);for(const [week,currentRows] of byWeek){const previousWeek=new Date(Date.parse(week+'T12:00:00Z')-7*86400000).toISOString().slice(0,10),previousRows=byWeek.get(previousWeek)??[];
    // Distinct sessions prevent duplicate occurrences in one workout inflating evidence.
    if(new Set(currentRows.map(r=>r.session.id)).size<2||new Set(previousRows.map(r=>r.session.id)).size<2)continue;
    const previous=mean(previousRows.map(r=>r.r.metrics[metric]))!,current=mean(currentRows.map(r=>r.r.metrics[metric]))!,first=currentRows[0];comparisons.push({activityId:first.p.activityId,metric,previousWeek,week,previous,current,change:Math.round((current-previous)*10)/10,previousObservations:previousRows.length,currentObservations:currentRows.length,distanceMeters:first.r.metrics.distanceMeters!,rpe:first.r.metrics.rpe!,paceUnit:cardioActivity(first.p.activityId)!.paceUnit,contextKey});
   }}
 }
 const comparable=new Map<string,Row[]>();for(const row of rows){if(!known(row.r.metrics.paceSeconds))continue;const key=context(row,'paceSeconds',false);if(key)comparable.set(key,[...(comparable.get(key)??[]),row]);}
 const records=[...comparable.values()].filter(group=>new Set(group.map(row=>row.session.id)).size>=2).map(group=>({activityId:group[0].p.activityId,distanceMeters:group[0].r.metrics.distanceMeters!,paceSeconds:Math.min(...group.map(row=>row.r.metrics.paceSeconds!)),observations:group.length,...(group[0].r.metrics.poolLengthMeters===undefined?{}:{poolLengthMeters:group[0].r.metrics.poolLengthMeters})}));
 return {...aggregate(rows),timezone,activities,weeks,comparisons,records,rows};
}
