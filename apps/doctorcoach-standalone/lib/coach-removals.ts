import {billingMonth} from './coach-billing.ts';
import {israelMidnight} from './staff-activity.ts';
import {isStaff,type StaffIdentity} from './staff.ts';
import type {CareConfig} from './care-store.ts';
import {inputRecord,textField,integerField,validId} from './care.ts';
import {TrainingError} from './training.ts';
export function removalWindow(at=new Date()){
 const month=billingMonth(at),next=new Date(month+'-01T12:00:00Z');next.setUTCMonth(next.getUTCMonth()+1);
 const collectionAt=israelMidnight(next.toISOString().slice(0,7)+'-01'),cutoffAt=new Date(Date.parse(collectionAt)-48*3600000).toISOString();
 return {collectionAt,cutoffAt,locked:at.getTime()>=Date.parse(cutoffAt)};
}
export function requireRemovalWindow(at=new Date()){if(removalWindow(at).locked)throw new TrainingError('הסרות מחיוב חסומות ב־48 השעות האחרונות של החודש לפי שעון ישראל. ניתן להגיש או לאשר בחודש הבא.',409);}
export type BillingSeat={id:string;workspaceId:string;clientId:string|null;state:'active'|'pending_removal'|'removed';version:number;requestedAt:string|null;reason:string;updatedAt:string};
export function coachRemovalsStore(db:D1Database,config:CareConfig={},clock=()=>new Date()){return {
 async request(u:StaffIdentity,payload:unknown){const p=inputRecord(payload),workspace=validId(p.workspaceId),client=textField(p.clientId,'מתאמן',200,1),reason=textField(p.reason,'סיבת הסרה',600,5),version=integerField(p.version,'גרסה',1,1000000);requireRemovalWindow(clock());const at=clock(),window=removalWindow(at);const row=await db.prepare(`UPDATE coach_billing_seats SET state='pending_removal',version=version+1,requested_at=?,reason=?,updated_at=? WHERE workspace_id=? AND client_id=? AND version=? AND state IN ('active','pending_removal') AND EXISTS(SELECT 1 FROM coach_workspaces WHERE id=? AND owner_id=?) AND ?<? AND strftime('%Y-%m-%dT%H:%M:%fZ','now')<? RETURNING id`).bind(at.toISOString(),reason,at.toISOString(),workspace,client,version,workspace,u.userId,at.toISOString(),window.cutoffAt,window.cutoffAt).first();if(!row)throw new TrainingError('השיוך, בקשת ההסרה או ההרשאות השתנו. רעננו.',409);return {ok:true};},
 async decide(u:StaffIdentity,payload:unknown){if(!isStaff(u,config.ownerProgramEmails))throw new TrainingError('אישור הסרה מחיוב זמין למנהל בלבד.',403);const p=inputRecord(payload),id=textField(p.id,'בקשה',32,32);if(!/^[a-f0-9]{32}$/.test(id))throw new TrainingError('מזהה בקשה לא תקין.');const version=integerField(p.version,'גרסה',1,1000000);if(p.decision!=='approve'&&p.decision!=='reject')throw new TrainingError('בחרו אישור או דחייה.');if(p.confirmed!==true)throw new TrainingError('יש לאשר את החלטת ההסרה.');requireRemovalWindow(clock());const at=clock(),window=removalWindow(at);const row=await db.prepare(`UPDATE coach_billing_seats SET state=?,version=version+1,decided_at=?,decided_by=?,updated_at=? WHERE id=? AND version=? AND state='pending_removal' AND ?<? AND strftime('%Y-%m-%dT%H:%M:%fZ','now')<? RETURNING id`).bind(p.decision==='approve'?'removed':'active',at.toISOString(),u.userId,at.toISOString(),id,version,at.toISOString(),window.cutoffAt,window.cutoffAt).first();if(!row)throw new TrainingError('השיוך, בקשת ההסרה או ההרשאות השתנו. רעננו.',409);return {ok:true};}
};}
