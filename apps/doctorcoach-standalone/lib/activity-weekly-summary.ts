import {localDate,type ActivityDay} from './activity.ts';
export type EffectiveActivityGoal={dailyTarget:number|null;weeklyTarget?:number|null;effectiveAt:string;version:number};
export function weeklyStepSummary(feed:{days:ActivityDay[];goals?:EffectiveActivityGoal[]},week:string){
 const end=new Date(Date.parse(week+'T12:00:00Z')+7*86400000).toISOString().slice(0,10),observed:ActivityDay[]=[];
 for(const day of feed.days.filter(d=>d.date>=week&&d.date<end&&d.steps!==null).sort((a,b)=>b.date.localeCompare(a.date))){if(!observed.some(d=>day.startAt<d.endAt&&day.endAt>d.startAt))observed.push(day);}
 let targetDays=0,met=0;
 for(const day of observed){const goal=feed.goals?.filter(g=>localDate(Date.parse(g.effectiveAt),day.timezone)<=day.date&&g.effectiveAt<=day.observedAt).sort((a,b)=>b.effectiveAt.localeCompare(a.effectiveAt)||b.version-a.version)[0];if(goal?.dailyTarget!=null){targetDays++;if(day.steps!>=goal.dailyTarget)met++;}}
 return {average:observed.length?observed.reduce((n,d)=>n+d.steps!,0)/observed.length:null,observedDays:observed.length,targetDays,adherence:targetDays?met/targetDays*100:null,partialDays:observed.filter(d=>d.partial).length};
}
