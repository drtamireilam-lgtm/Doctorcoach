import {activityStore} from './activity-store.ts';
import {TrainingError} from './training.ts';
import type {StaffIdentity} from './staff.ts';
export async function activityPrivacy(db:D1Database,user:StaffIdentity,owner:string){
 const store=activityStore(db),scopes=await store.sharedScopes(user,owner);
 function clean(value:unknown):unknown{
  if(Array.isArray(value))return value.filter(v=>{if(!v||typeof v!=='object'||scopes.cardio)return true;if('exerciseId' in v&&String(v.exerciseId).startsWith('cardio:'))return false;if('items' in v&&'status' in v&&Array.isArray(v.items)&&v.items.length&&v.items.every(i=>i&&typeof i==='object'&&'exerciseId' in i&&String(i.exerciseId).startsWith('cardio:')))return false;return true;}).map(clean);
  if(!value||typeof value!=='object')return value;
  const result:Record<string,unknown>={};for(const [key,v] of Object.entries(value)){if(user.userId!==owner&&['actionPayloads','actionIds'].includes(key))continue;if(!scopes.heartRate&&/heart.?rate/i.test(key))continue;if(!scopes.cardio&&key==='finishFeedback'&&'items' in value&&Array.isArray(value.items)&&value.items.some(i=>i?.exerciseId?.startsWith('cardio:')))continue;result[key]=clean(v);}
  if(!scopes.cardio&&Array.isArray(result.history)&&result.stats&&typeof result.stats==='object'){
   const history=result.history as {status:string;finishedAt?:string;startedAt:string;completedSets:number}[];const completed=history.filter(s=>s.status==='completed');result.stats={total:completed.length,week:completed.filter(s=>(s.finishedAt??s.startedAt)>=new Date(Date.now()-7*86400000).toISOString()).length,sets:completed.reduce((n,s)=>n+s.completedSets,0)};
  }
  if(result.active&&typeof result.active==='object'&&'items' in result.active&&Array.isArray(result.active.items)&&!result.active.items.length)result.active=null;
  return result;
 }
 return {scopes,sanitize<T>(value:T):T{return clean(value) as T;},async recheck(){const latest=await store.sharedScopes(user,owner);if((scopes.cardio&&!latest.cardio)||(scopes.heartRate&&!latest.heartRate)||(scopes.steps&&!latest.steps))throw new TrainingError('Activity sharing changed during read',403);}};
}
/** Caller must separately retain its current roster/relationship guard at final return. */
export async function activityGrantSnapshot(db:D1Database,user:StaffIdentity,owners:string[]){
 const rows=await db.prepare("SELECT owner_id,version FROM activity_shares WHERE coach_email=? AND cardio=1 AND owner_id IN (SELECT value FROM json_each(?))").bind(user.email.toLowerCase(),JSON.stringify(owners)).all<{owner_id:string;version:number}>();
 const captured=rows.results,cardioOwners=[...new Set([...captured.map(r=>r.owner_id),...owners.filter(id=>id===user.userId)])];
 return {cardioOwners,async recheck(){const row=await db.prepare("SELECT COUNT(*) AS n FROM json_each(?) captured JOIN activity_shares s ON s.owner_id=json_extract(captured.value,'$.owner_id') AND s.version=json_extract(captured.value,'$.version') WHERE s.coach_email=? AND s.cardio=1").bind(JSON.stringify(captured),user.email.toLowerCase()).first<{n:number}>();if(row?.n!==captured.length)throw new TrainingError('Activity sharing changed during summary read',403);}};
}
export const strengthItemSql=(alias:string)=>`(json_array_length(${alias}.items_json)=0 OR EXISTS(SELECT 1 FROM json_each(${alias}.items_json) visible_item WHERE COALESCE(json_extract(visible_item.value,'$.exerciseId'),'') NOT LIKE 'cardio:%' AND json_type(visible_item.value,'$.cardio') IS NULL))`;
