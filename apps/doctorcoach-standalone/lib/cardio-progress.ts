import type {TrainingSession} from './training.ts';
import type {CardioActivityId} from './cardio.ts';
const mean=(values:(number|undefined)[])=>{const known=values.filter((n):n is number=>typeof n==='number'&&Number.isFinite(n));return known.length?Math.round(known.reduce((n,v)=>n+v,0)/known.length*10)/10:null;};
export function cardioProgressSummary(sessions:TrainingSession[]){
 const rows=sessions.filter(s=>s.status==='completed').flatMap(session=>session.items.filter(i=>i.cardio&&i.cardioResult?.status==='completed').map(item=>({session,item,p:item.cardio!,r:item.cardioResult!})));
 const activities=[...new Set(rows.map(row=>row.p.activityId))].map(activityId=>{const selected=rows.filter(row=>row.p.activityId===activityId),measured=selected.filter(row=>row.r.metrics.distanceMeters!==undefined);return {activityId,sessions:new Set(selected.map(row=>row.session.id)).size,minutes:selected.reduce((n,row)=>n+row.r.elapsedSeconds/60,0),distanceMeters:measured.length?measured.reduce((n,row)=>n+row.r.metrics.distanceMeters!,0):null,distanceObservations:measured.length,averageRpe:mean(selected.map(row=>row.r.metrics.rpe)),averageHeartRate:mean(selected.map(row=>row.r.metrics.heartRate))};});
 const comparable=new Map<string,{activityId:CardioActivityId;distanceMeters:number;paceSeconds:number;poolLengthMeters?:number}[]>();
 for(const row of rows){const m=row.r.metrics;if(m.distanceMeters===undefined||m.paceSeconds===undefined)continue;const key=JSON.stringify([row.p.activityId,m.distanceMeters,m.poolLengthMeters??null]);const group=comparable.get(key)??[];group.push({activityId:row.p.activityId,distanceMeters:m.distanceMeters,paceSeconds:m.paceSeconds,...(m.poolLengthMeters===undefined?{}:{poolLengthMeters:m.poolLengthMeters})});comparable.set(key,group);}
 const records=[...comparable.values()].filter(group=>group.length>=2).map(group=>({...group[0],paceSeconds:Math.min(...group.map(m=>m.paceSeconds)),observations:group.length}));
 return {sessions:new Set(rows.map(row=>row.session.id)).size,minutes:rows.reduce((n,row)=>n+row.r.elapsedSeconds/60,0),activities,records,rows};
}
