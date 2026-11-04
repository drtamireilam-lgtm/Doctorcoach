import type {ActivityFeed} from './activity';
import type {WellnessBundle} from './wellness';
export function homeWorkoutActionAllowed(input:{auth:string;status:number;loading:boolean;error:unknown;completed:boolean;blocked:boolean}){
 return input.auth==='ready'&&input.status===200&&!input.loading&&!input.error&&input.completed&&!input.blocked;
}
/** Energy is a dated self-report, not a recovery percentage or clinical score. */
export function homeSummary(activity:ActivityFeed|null,wellness:WellnessBundle|null){
 const readiness=wellness?.records.filter(r=>r.kind==='readiness').sort((a,b)=>b.day.localeCompare(a.day))[0];
 const energy=readiness?.data.energy;
 const rehab=wellness?.records.filter(r=>r.kind==='rehab').sort((a,b)=>b.day.localeCompare(a.day))[0];
 const pain=rehab?.data.pain;
 const recoveryPain=typeof pain==='number'&&Number.isFinite(pain)&&pain>=0&&pain<=10?pain:null;
 return {steps:activity?.summary.today??null,stepGoal:activity?.goal?.dailyTarget??null,energy:typeof energy==='number'&&Number.isFinite(energy)?energy:null,energyDay:readiness?.day??null,recoveryPain,recoveryDay:recoveryPain===null?null:rehab!.day};
}
