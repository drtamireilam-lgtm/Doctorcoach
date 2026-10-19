import {careStore,type CareConfig} from './care-store.ts';
import {inputRecord,textField,validId,integerField,parseAssignedItems} from './care.ts';
import {combineCareGuards} from './care-write-guard.ts';
import {healthConsentGuard} from './consent-server.ts';
import {workspaceClientGuard} from './coach-workspace-guard.ts';
import {availableCustomExercises} from './custom-exercises.ts';
import {trainingAccess} from './training-access.ts';
import {templateItems,templateSummary,type TemplateDraft} from './program-templates.ts';
import {TrainingError} from './training.ts';
import {isStaff,type StaffIdentity} from './staff.ts';
type Context={clientId:string;workspaceId?:string};
type Row={id:string;title:string;items_json:string;version:number;updated_at:string};
export function programTemplateStore(db:D1Database,config:CareConfig={}){
 async function gate(u:StaffIdentity,context:Context){
  if(isStaff(u,config.operationsEmails))throw new TrainingError('תבניות תוכנית זמינות למאמנים מורשים בלבד.',403);
  const clientId=textField(context.clientId,'מתאמן',200,1);let actor:{sql:string;args:(string|number)[]};
  if(context.workspaceId)actor=workspaceClientGuard(u.userId,validId(context.workspaceId),clientId);
  else{const care=careStore(db,config),a=await care.authorize(u,clientId);if(a.self||!a.program||!a.staff)throw new TrainingError('תבניות תוכנית זמינות למאמנים מורשים בלבד.',403);actor=care.programGuard(clientId,a.staff.email);}
  const g=combineCareGuards(actor,healthConsentGuard(clientId));await requireGate(g);return g;
 }
 async function requireGate(g:{sql:string;args:(string|number)[]}){if(!(await db.prepare(`SELECT CASE WHEN ${g.sql} THEN 1 ELSE 0 END allowed`).bind(...g.args).first<{allowed:number}>())?.allowed)throw new TrainingError('הרשאת המאמן, השיוך או ההסכמות השתנו. רעננו לפני המשך.',403);}
 async function list(u:StaffIdentity,context:Context){const g=await gate(u,context);const rows=await db.prepare('SELECT id,title,items_json,version,updated_at FROM coach_program_templates WHERE owner_id=? ORDER BY updated_at DESC,id DESC LIMIT 100').bind(u.userId).all<Row>();await requireGate(g);return rows.results.map(templateSummary);}
 return {list,async write(u:StaffIdentity,context:Context,payload:unknown){
  const g=await gate(u,context),p=inputRecord(payload),id=validId(p.id),at=new Date().toISOString();
  if(p.action==='create'){
   if(p.confirmed!==true||typeof p.keepWeights!=='boolean')throw new TrainingError('יש לאשר שמירת תבנית ללא פרטי מתאמן.');
   const title=textField(p.title,'שם תבנית',100,3),items=templateItems(p.items,await availableCustomExercises(db,u.userId),p.keepWeights),json=JSON.stringify(items);
   const r=await db.prepare(`INSERT INTO coach_program_templates(id,owner_id,title,items_json,version,created_at,updated_at) SELECT ?,?,?,?,1,?,? WHERE ${g.sql} AND (SELECT COUNT(*) FROM coach_program_templates WHERE owner_id=?)<100 ON CONFLICT(id) DO NOTHING RETURNING id`).bind(id,u.userId,title,json,at,at,...g.args,u.userId).first();
   if(!r){await requireGate(g);const old=await db.prepare('SELECT owner_id,title,items_json FROM coach_program_templates WHERE id=?').bind(id).first<{owner_id:string;title:string;items_json:string}>();if(!old||old.owner_id!==u.userId||old.title!==title||old.items_json!==json)throw new TrainingError('המזהה בשימוש או שהגעתם למגבלת 100 תבניות פרטיות.',409);}
   return {templates:await list(u,context)};
  }
  const version=integerField(p.version,'גרסת תבנית',1,1000000);
  if(p.action==='load'){
   const row=await db.prepare('SELECT id,title,items_json,version,updated_at FROM coach_program_templates WHERE id=? AND owner_id=? AND version=?').bind(id,u.userId,version).first<Row>();if(!row)throw new TrainingError('התבנית השתנתה או שאינה זמינה. רעננו את הספרייה.',409);
   // Resolve current own/published custom definitions; source-file-only exercises cannot travel.
   const items=parseAssignedItems(JSON.parse(row.items_json),await availableCustomExercises(db,u.userId));
   const access=await trainingAccess(db,context.clientId,config);await requireGate(g);
   const current=await db.prepare(`SELECT id FROM coach_program_templates WHERE id=? AND owner_id=? AND version=? AND ${g.sql}`).bind(id,u.userId,version,...g.args).first();if(!current)throw new TrainingError('התבנית השתנתה או שאינה זמינה. רעננו את הספרייה.',409);
   const draft:TemplateDraft={title:row.title,items,revisionOf:access.programId};return {draft};
  }
  if(p.action==='delete'){
   if(p.confirmed!==true)throw new TrainingError('יש לאשר מחיקת תבנית.');
   const r=await db.prepare(`DELETE FROM coach_program_templates WHERE id=? AND owner_id=? AND version=? AND ${g.sql} RETURNING id`).bind(id,u.userId,version,...g.args).first();if(!r){await requireGate(g);throw new TrainingError('התבנית השתנתה או שאינה זמינה. רעננו את הספרייה.',409);}return {templates:await list(u,context)};
  }
  if(p.action==='rename'){
   const title=textField(p.title,'שם תבנית',100,3);const r=await db.prepare(`UPDATE coach_program_templates SET title=?,version=version+1,updated_at=? WHERE id=? AND owner_id=? AND version=? AND ${g.sql} RETURNING id`).bind(title,at,id,u.userId,version,...g.args).first();if(!r){await requireGate(g);throw new TrainingError('התבנית השתנתה או שאינה זמינה. רעננו את הספרייה.',409);}return {templates:await list(u,context)};
  }
  throw new TrainingError('פעולת תבנית לא מוכרת.');
 }};
}
