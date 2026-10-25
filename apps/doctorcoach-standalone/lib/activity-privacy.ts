import {activityStore} from './activity-store.ts';
import {TrainingError} from './training.ts';
import type {StaffIdentity} from './staff.ts';
export async function activityPrivacy(db:D1Database,user:StaffIdentity,owner:string){
 const store=activityStore(db),scopes=await store.sharedScopes(user,owner);
 function clean(value:unknown):unknown{
  if(Array.isArray(value))return value.filter(v=>!(v&&typeof v==='object'&&'exerciseId' in v&&String(v.exerciseId).startsWith('cardio:')&&!scopes.cardio)).map(clean).filter(v=>{if(!v||typeof v!=='object'||!('items' in v)||!('status' in v))return true;return !Array.isArray(v.items)||v.items.length>0;});
  if(!value||typeof value!=='object')return value;
  const result:Record<string,unknown>={};for(const [key,v] of Object.entries(value)){if(!scopes.heartRate&&/heart.?rate/i.test(key))continue;result[key]=clean(v);}
  if(!scopes.cardio&&Array.isArray(result.history)&&result.stats&&typeof result.stats==='object'){
   const history=result.history as {status:string;finishedAt?:string;startedAt:string;completedSets:number}[];const completed=history.filter(s=>s.status==='completed');result.stats={total:completed.length,week:completed.filter(s=>(s.finishedAt??s.startedAt)>=new Date(Date.now()-7*86400000).toISOString()).length,sets:completed.reduce((n,s)=>n+s.completedSets,0)};
  }
  if(result.active&&typeof result.active==='object'&&'items' in result.active&&Array.isArray(result.active.items)&&!result.active.items.length)result.active=null;
  return result;
 }
 return {scopes,sanitize<T>(value:T):T{return clean(value) as T;},async recheck(){const latest=await store.sharedScopes(user,owner);if((scopes.cardio&&!latest.cardio)||(scopes.heartRate&&!latest.heartRate)||(scopes.steps&&!latest.steps))throw new TrainingError('Activity sharing changed during read',403);}};
}
