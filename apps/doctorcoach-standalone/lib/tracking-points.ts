import type {WellnessRecord} from './wellness.ts';
export function trackingPoints(rows:WellnessRecord[],metric:string){
 return rows.filter(r=>typeof r.data[metric]==='number'&&Number.isFinite(r.data[metric]))
  .sort((a,b)=>a.day.localeCompare(b.day)||a.updatedAt.localeCompare(b.updatedAt))
  .slice(-60).map(r=>({date:r.day,value:r.data[metric] as number}));
}
export function trackingDomain(metric:string):[number,number]|['auto','auto']{
 return ['pain','functionScore','adherence','energy','stress'].includes(metric)?[0,10]:metric==='sleep'?[0,24]:['auto','auto'];
}
