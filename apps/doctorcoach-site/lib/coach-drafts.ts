import {inputRecord,integerField,parseAssignedItems,textField,validId} from './care.ts';
import type {PlanItem} from './training.ts';
import {TrainingError} from './training.ts';
import type {StaffIdentity} from './staff.ts';
import type {careStore} from './care-store.ts';

export type CoachDraft={requestId:string;title:string;items:PlanItem[];revisionOf:string|null};
export type CoachDraftState={draft:CoachDraft|null;version:number;updatedAt:string|null};
export function coachDraftStore(db:D1Database,care:ReturnType<typeof careStore>){
 async function authorize(user:StaffIdentity,clientId:string){const a=await care.authorize(user,clientId);if(a.self||a.staff?.role!=='coach')throw new TrainingError('טיוטות זמינות למאמן המשויך בלבד.',403);return a.staff;}
 async function get(user:StaffIdentity,clientId:string):Promise<CoachDraftState>{
  await authorize(user,clientId);
  const row=await db.prepare('SELECT payload_json,version,updated_at FROM coach_program_drafts WHERE coach_id=? AND client_id=?').bind(user.userId,clientId).first<{payload_json:string|null;version:number;updated_at:string}>();
  return {draft:row?.payload_json?JSON.parse(row.payload_json):null,version:row?.version??0,updatedAt:row?.updated_at??null};
 }
 return {get,async save(user:StaffIdentity,clientId:string,payload:unknown):Promise<CoachDraftState>{
  const staff=await authorize(user,clientId),p=inputRecord(payload),version=integerField(p.version,'גרסת טיוטה',0,1000000);
  let draft:CoachDraft|null=null;
  if(p.action==='save'){
   if(!Array.isArray(p.items))throw new TrainingError('רשימת התרגילים אינה תקינה.');
   draft={requestId:validId(p.requestId),title:textField(p.title,'שם תוכנית',100),items:p.items.length?parseAssignedItems(p.items):[],revisionOf:p.revisionOf==null?null:validId(p.revisionOf)};
  }else if(p.action!=='discard')throw new TrainingError('פעולת טיוטה לא מוכרת.');
  const data=draft?JSON.stringify(draft):null,at=new Date().toISOString();
  const gate=`EXISTS(SELECT 1 FROM care_connections c JOIN care_staff s ON s.email=c.staff_email WHERE c.client_id=? AND c.staff_email=? AND c.active=1 AND c.scope='care' AND s.active=1 AND s.role='coach')`;
  const row=version===0?await db.prepare(`INSERT INTO coach_program_drafts(coach_id,client_id,payload_json,version,updated_at) SELECT ?,?,?,1,? WHERE ${gate} ON CONFLICT(coach_id,client_id) DO NOTHING RETURNING version`).bind(user.userId,clientId,data,at,clientId,staff.email).first():await db.prepare(`UPDATE coach_program_drafts SET payload_json=?,version=version+1,updated_at=? WHERE coach_id=? AND client_id=? AND version=? AND ${gate} RETURNING version`).bind(data,at,user.userId,clientId,version,clientId,staff.email).first();
  if(!row)throw new TrainingError('הטיוטה השתנתה בחלון אחר או שההרשאה השתנתה. טענו את הטיוטה השמורה לפני שמירה נוספת.',409);
  return {draft,version:version+1,updatedAt:at};
 }};
}
