import {careStore} from './care-store.ts';
import {staffRoleGuard} from './care-write-guard.ts';
import type {ProgramAuthorConfig} from './program-author.ts';
import {TrainingError} from './training.ts';
import {inputRecord,integerField,textField,validId} from './care.ts';
import {externalLink} from './services.ts';
import {isStaff} from './staff.ts';
import type {StaffIdentity} from './staff.ts';
import {trainingAccess,noActiveWorkout} from './training-access.ts';
const now=()=>new Date().toISOString();
// Owner's personal access only; never inferred from client payload or staff role alone.
const ownerSelf=(u:StaffIdentity,admins?:string)=>!!u.userId&&u.email.trim().toLowerCase()==='dr.tamireilam@gmail.com'&&isStaff(u,admins);
export function oneMonthAfter(value:string){const d=new Date(value),day=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+1);const last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();d.setUTCDate(Math.min(day,last));return d.toISOString();}
const orderColumns='id,user_id AS userId,email,price_agorot AS priceAgorot,payment_url AS paymentUrl,instructions,state,reference,starts_at AS startsAt,ends_at AS endsAt,created_at AS createdAt,version';
export type MembershipOrder={id:string;userId:string;email:string;priceAgorot:number;paymentUrl:string;instructions:string;state:string;reference:string;startsAt:string|null;endsAt:string|null;createdAt:string;version:number};
export type MembershipCatalog={priceAgorot:number|null;enabled:number;paymentUrl:string;instructions:string;version:number};
export function membershipStore(db:D1Database,adminEmails?:string,config:ProgramAuthorConfig&{personalSelfEmails?:string;operationsEmails?:string}={}){
 const staffFor=(u:StaffIdentity)=>careStore(db,config).staffFor(u.email);
 async function personalAvailable(u:StaffIdentity){return !!await staffFor(u)||ownerSelf(u,adminEmails);}
 const admin=(u:StaffIdentity)=>{if(!isStaff(u,adminEmails))throw new TrainingError('הרשאת מנהל נדרשת.',403);};
 async function catalog():Promise<MembershipCatalog>{return await db.prepare("SELECT price_agorot AS priceAgorot,enabled,payment_url AS paymentUrl,instructions,version FROM membership_catalog WHERE id='self_monthly'").first<MembershipCatalog>()??{priceAgorot:null,enabled:0,paymentUrl:'',instructions:'',version:0};}
 return {
 async get(user:StaffIdentity,manage=false){if(manage)admin(user);const c=await catalog();return {staffPermanentAvailable:!!await staffFor(user),personalSelfAvailable:await personalAvailable(user),ownerSelfAvailable:ownerSelf(user,adminEmails),catalog:manage||c.enabled?c:{...c,paymentUrl:'',instructions:''},access:await trainingAccess(db,user.userId,config),orders:(await db.prepare(`SELECT ${orderColumns} FROM membership_orders ${manage?'': 'WHERE user_id=?'} ORDER BY created_at DESC LIMIT 100`).bind(...(manage?[]:[user.userId])).all<MembershipOrder>()).results};},
async activateSelf(user:StaffIdentity){await noActiveWorkout(db,user.userId);const at=now(),staff=await staffFor(user);
 if(staff){const guard=staffRoleGuard(staff.email,staff.role,config),receipt=crypto.randomUUID();await db.batch([
 db.prepare(`INSERT INTO audit_events(id,actor_id,subject_id,action,created_at) SELECT ?,?,?,'staff_personal_activated',? WHERE ${guard.sql} AND NOT EXISTS(SELECT 1 FROM training_sessions WHERE owner_id=? AND status='active')`).bind(receipt,user.userId,user.userId,at,...guard.args,user.userId),
 db.prepare("INSERT INTO staff_personal_access(user_id,email,activated_at) SELECT ?,?,? WHERE EXISTS(SELECT 1 FROM audit_events WHERE id=?) ON CONFLICT(user_id) DO UPDATE SET email=excluded.email,activated_at=excluded.activated_at").bind(user.userId,staff.email,at,receipt),
 db.prepare("INSERT INTO training_access(user_id,mode,updated_at) SELECT ?,'self',? WHERE EXISTS(SELECT 1 FROM audit_events WHERE id=?) ON CONFLICT(user_id) DO UPDATE SET mode='self',updated_at=excluded.updated_at").bind(user.userId,at,receipt)]);if(!await db.prepare('SELECT id FROM audit_events WHERE id=?').bind(receipt).first())throw new TrainingError('הרשאת הצוות או האימון הפעיל השתנו. רעננו.',409);return {ok:true};}

 if(ownerSelf(user,adminEmails)){const personal={sql:'1=1',args:[] as string[]};
  const receipt=crypto.randomUUID(),end=oneMonthAfter(at);
  await db.batch([
   db.prepare(`INSERT INTO audit_events(id,actor_id,subject_id,action,created_at) SELECT ?,?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM training_sessions WHERE owner_id=? AND status='active') AND ${personal.sql}`).bind(receipt,user.userId,user.userId,ownerSelf(user,adminEmails)?'owner_self_activated':'personal_self_activated',at,user.userId,...personal.args),
   db.prepare("INSERT INTO training_access(user_id,mode,self_until,updated_at) SELECT ?,'self',?,? WHERE EXISTS(SELECT 1 FROM audit_events WHERE id=?) ON CONFLICT(user_id) DO UPDATE SET mode='self',self_until=CASE WHEN training_access.self_until>excluded.self_until THEN training_access.self_until ELSE excluded.self_until END,updated_at=excluded.updated_at").bind(user.userId,end,at,receipt),
  ]);
  if(!await db.prepare('SELECT id FROM audit_events WHERE id=?').bind(receipt).first()){await noActiveWorkout(db,user.userId);throw new TrainingError('מצב האימון השתנה. רעננו לפני מעבר.',409);}
  return {ok:true};
 }
 const row=await db.prepare("UPDATE training_access SET mode='self',updated_at=? WHERE user_id=? AND self_until>? AND NOT EXISTS(SELECT 1 FROM training_sessions WHERE owner_id=? AND status='active') RETURNING user_id").bind(at,user.userId,at,user.userId).first();if(!row){await noActiveWorkout(db,user.userId);throw new TrainingError('אין מנוי עצמאי בתוקף.',403);}return {ok:true};},
 async configure(user:StaffIdentity,payload:unknown){admin(user);const p=inputRecord(payload),price=integerField(p.priceAgorot,'מחיר באגורות',100,1000000),version=integerField(p.version,'גרסה',0,1000000);if(typeof p.enabled!=='boolean')throw new TrainingError('בחרו מצב מסלול.');const url=externalLink(p.paymentUrl),instructions=textField(p.instructions,'הוראות תשלום',1500);if(p.enabled&&!url&&!instructions)throw new TrainingError('הוסיפו קישור או הוראות תשלום לפני פתיחת המסלול.');const row=version===0?await db.prepare("INSERT INTO membership_catalog(id,price_agorot,enabled,payment_url,instructions) VALUES('self_monthly',?,?,?,?) ON CONFLICT DO NOTHING RETURNING id").bind(price,p.enabled?1:0,url,instructions).first():await db.prepare("UPDATE membership_catalog SET price_agorot=?,enabled=?,payment_url=?,instructions=?,version=version+1 WHERE id='self_monthly' AND version=? RETURNING id").bind(price,p.enabled?1:0,url,instructions,version).first();if(!row)throw new TrainingError('המחירון השתנה. רעננו לפני שמירה.',409);return {ok:true};},
 async request(user:StaffIdentity,payload:unknown){
  const p=inputRecord(payload),id=validId(p.id),catalogVersion=p.catalogVersion,price=p.expectedPrice;
  if(p.confirmed!==true)throw new TrainingError('יש לאשר את המחיר ואת תנאי הפעלת המסלול.');
  await noActiveWorkout(db,user.userId);
  type RequestRow={user_id:string;email:string;price_agorot:number;catalog_version:number|null};
  const previous=()=>db.prepare('SELECT user_id,email,price_agorot,catalog_version FROM membership_orders WHERE id=?').bind(id).first<RequestRow>();
  const retry=(o:RequestRow)=>{
   if(o.user_id!==user.userId)throw new TrainingError('מזהה הבקשה אינו זמין.',403);
   if(o.email.toLowerCase()!==user.email.toLowerCase()||o.price_agorot!==price||o.catalog_version!==catalogVersion)throw new TrainingError('מזהה הבקשה כבר משויך לפרטים אחרים. רעננו.',409);
   return {ok:true};
  };
  const existing=await previous();if(existing)return retry(existing);
  const c=await catalog();
  if(!c.enabled||!c.priceAgorot)throw new TrainingError('המנוי עדיין אינו פתוח לרכישה.',409);
  if(catalogVersion!==c.version||price!==c.priceAgorot)throw new TrainingError('המחיר עודכן. רעננו לפני פתיחת הבקשה.',409);
  const saved=await db.prepare(`INSERT INTO membership_orders(id,user_id,email,price_agorot,payment_url,instructions,created_at,catalog_version)
   SELECT ?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM membership_catalog WHERE id='self_monthly' AND enabled=1 AND version=? AND price_agorot=? AND payment_url=? AND instructions=?)
   AND NOT EXISTS(SELECT 1 FROM training_sessions WHERE owner_id=? AND status='active')
   AND NOT EXISTS(SELECT 1 FROM membership_orders WHERE user_id=? AND state IN ('pending','reported'))
   ON CONFLICT DO NOTHING RETURNING id`)
   .bind(id,user.userId,user.email,c.priceAgorot,c.paymentUrl,c.instructions,now(),c.version,c.version,c.priceAgorot,c.paymentUrl,c.instructions,user.userId,user.userId).first();
  if(!saved){
   await noActiveWorkout(db,user.userId);
   const winner=await previous();if(winner)return retry(winner);
   throw new TrainingError('המחירון השתנה או שכבר קיימת בקשת מנוי פתוחה. רעננו לפני שליחה נוספת.',409);
  }
  return {ok:true};
 },
 async update(user:StaffIdentity,payload:unknown){const p=inputRecord(payload),id=validId(p.id),version=integerField(p.version,'גרסה',1,1000000);const o=await db.prepare(`SELECT ${orderColumns} FROM membership_orders WHERE id=?`).bind(id).first<MembershipOrder>();if(!o)throw new TrainingError('הבקשה לא נמצאה.',404);if(p.action==='report'||p.action==='cancel'){if(o.userId!==user.userId)throw new TrainingError('אין הרשאה לבקשה זו.',403);}else admin(user);if(o.version!==version||!['pending','reported'].includes(o.state))throw new TrainingError('הבקשה עודכנה או כבר טופלה. רעננו.',409);
 if(p.action==='approve'){
  if(p.verified!==true)throw new TrainingError('יש לאמת קבלת תשלום בפועל.');
  const reference=textField(p.reference,'אסמכתת תשלום מאומתת',150,3);
  await noActiveWorkout(db,o.userId);
  const a=await db.prepare('SELECT mode,program_id,self_until,updated_at FROM training_access WHERE user_id=?').bind(o.userId).first<{mode:string;program_id:string|null;self_until:string|null;updated_at:string}>();
  const at=now(),start=a?.self_until&&a.self_until>at?a.self_until:at,end=oneMonthAfter(start),receipt=crypto.randomUUID();
  const accessSql=a?'EXISTS(SELECT 1 FROM training_access WHERE user_id=? AND mode=? AND program_id IS ? AND self_until IS ? AND updated_at=?)':'NOT EXISTS(SELECT 1 FROM training_access WHERE user_id=?)';
  const accessArgs=a?[o.userId,a.mode,a.program_id,a.self_until,a.updated_at]:[o.userId];
  // The receipt can only be created for this still-pending order and unchanged
  // entitlement. D1 commits decision, entitlement and audit together.
  await db.batch([
   db.prepare(`INSERT INTO audit_events(id,actor_id,subject_id,action,created_at) SELECT ?,?,?,'membership_approved',?
    WHERE EXISTS(SELECT 1 FROM membership_orders WHERE id=? AND user_id=? AND version=? AND state IN ('pending','reported'))
    AND NOT EXISTS(SELECT 1 FROM membership_orders WHERE verified_reference=?)
    AND NOT EXISTS(SELECT 1 FROM training_sessions WHERE owner_id=? AND status='active') AND ${accessSql}`)
    .bind(receipt,user.userId,o.userId,at,id,o.userId,version,reference,o.userId,...accessArgs),
   db.prepare("UPDATE membership_orders SET state='approved',verified_reference=?,reviewer=?,starts_at=?,ends_at=?,version=version+1 WHERE id=? AND user_id=? AND version=? AND state IN ('pending','reported') AND EXISTS(SELECT 1 FROM audit_events WHERE id=?)")
    .bind(reference,user.userId,start,end,id,o.userId,version,receipt),
   db.prepare("INSERT INTO training_access(user_id,mode,self_until,updated_at) SELECT ?,'self',?,? WHERE EXISTS(SELECT 1 FROM audit_events WHERE id=?) ON CONFLICT(user_id) DO UPDATE SET mode='self',self_until=excluded.self_until,updated_at=excluded.updated_at")
    .bind(o.userId,end,at,receipt),
  ]);
  if(!await db.prepare('SELECT id FROM audit_events WHERE id=?').bind(receipt).first()){
   await noActiveWorkout(db,o.userId);
   throw new TrainingError('הבקשה, המנוי או אסמכתת התשלום השתנו במקביל. רעננו לפני אישור.',409);
  }
  return {ok:true};
 }
 const state=p.action==='report'?'reported':p.action==='cancel'?'cancelled':p.action==='reject'?'rejected':null;if(!state)throw new TrainingError('פעולה לא מוכרת.');const reference=p.action==='report'?textField(p.reference,'אסמכתה',150,3):o.reference;const r=await db.prepare("UPDATE membership_orders SET state=?,reference=?,version=version+1 WHERE id=? AND version=? AND state IN ('pending','reported') RETURNING id").bind(state,reference,id,version).first();if(!r)throw new TrainingError('הבקשה עודכנה במקביל.',409);return {ok:true};
 },
 };
}
