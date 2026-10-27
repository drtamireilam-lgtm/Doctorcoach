import {inputRecord,integerField,textField,validId} from './care.ts';
import {isStaff} from './staff.ts';
import type {StaffIdentity} from './staff.ts';
import {TrainingError} from './training.ts';
import {defaultServices,externalLink} from './services.ts';
import {servicesStore} from './services-store.ts';
import {careConnectionGuard,combineCareGuards,staffRoleGuard} from './care-write-guard.ts';
import type {Appointment} from './appointments.ts';
import {israelAppointmentTime} from './appointments.ts';
export type AppointmentFilters={view?:string;query?:string;dateFrom?:string;dateTo?:string;status?:string;offset?:number};
const columns=`id,client_id AS clientId,client_name AS clientName,service_id AS serviceId,title,provider,duration,price_agorot AS priceAgorot,preference,state,starts_at AS startsAt,ends_at AS endsAt,meeting_url AS meetingUrl,staff_note AS staffNote,payment_state AS paymentState,payment_reference AS paymentReference,version,created_at AS createdAt,updated_at AS updatedAt,feedback_message AS feedbackMessage,feedback_requested_at AS feedbackRequestedAt,feedback_response AS feedbackResponse,feedback_responded_at AS feedbackRespondedAt`;
const now=()=>new Date().toISOString();
export function appointmentsStore(db:D1Database,adminEmails?:string,options:{clinicalEmails?:string;operationsEmails?:string;rootAdminEmails?:string}={}){
 const clinical=(user:StaffIdentity)=>isStaff(user,options.clinicalEmails??adminEmails);
 const project=(a:Appointment,user:StaffIdentity,manage:boolean):Appointment=>manage&&!clinical(user)?{...a,preference:'',staffNote:'',feedbackMessage:'',feedbackResponse:'',feedbackRequestedAt:null,feedbackRespondedAt:null}:a;
 const globalGuard=(user:StaffIdentity)=>clinical(user)?(options.rootAdminEmails===undefined||isStaff(user,options.rootAdminEmails)?{sql:'1=1',args:[] as string[]}:staffRoleGuard(user.email,'clinician',{clinicianEmails:options.clinicalEmails})):staffRoleGuard(user.email,'coordinator',{operationsEmails:options.operationsEmails});
 function manageGuard(user:StaffIdentity,clientId:string){return isStaff(user,adminEmails)?globalGuard(user):careConnectionGuard({clientId,email:user.email,role:'coordinator',scope:'coordinator'},{});}
 async function canManage(user:StaffIdentity,clientId?:string){if(isStaff(user,adminEmails)){const guard=globalGuard(user);const allowed=await db.prepare(`SELECT CASE WHEN ${guard.sql} THEN 1 ELSE 0 END allowed`).bind(...guard.args).first<{allowed:number}>();return !!allowed?.allowed;}const staff=await db.prepare("SELECT email FROM care_staff WHERE email=? AND active=1 AND role='coordinator'").bind(user.email.toLowerCase()).first();if(!staff)return false;if(!clientId)return true;return !!await db.prepare("SELECT id FROM care_connections WHERE client_id=? AND staff_email=? AND active=1 AND scope='coordinator'").bind(clientId,user.email.toLowerCase()).first();}
 async function requireAdmin(user:StaffIdentity,clientId?:string){if(!await canManage(user,clientId))throw new TrainingError('ניהול תורים זמין לתיאום מורשה בלבד.',403);}
 const get=(id:string)=>db.prepare(`SELECT ${columns} FROM care_appointments WHERE id=?`).bind(id).first<Appointment>();
 async function currentService(id:string){const s=(await servicesStore(db,adminEmails).listPublic()).find(s=>s.id===id);if(!s)throw new TrainingError('השירות אינו זמין כעת.',404);return s;}
 return {
  async pendingCount(user:StaffIdentity){
   await requireAdmin(user);const coordinator=!isStaff(user,adminEmails);const role=staffRoleGuard(user.email,'coordinator',{});const global=globalGuard(user);
   const row=await db.prepare(`SELECT COUNT(*) n FROM care_appointments WHERE state='requested' ${coordinator?`AND ${role.sql} AND EXISTS(SELECT 1 FROM care_connections c WHERE c.client_id=care_appointments.client_id AND c.staff_email=? AND c.active=1 AND c.scope='coordinator')`:`AND ${global.sql}`}`).bind(...(coordinator?[...role.args,user.email.toLowerCase()]:global.args)).first<{n:number}>();return row?.n??0;
  },
  async list(user:StaffIdentity,manage=false,filters:AppointmentFilters={}){
   if(manage)await requireAdmin(user);
   const coordinator=manage&&!isStaff(user,adminEmails);
   const role=staffRoleGuard(user.email,'coordinator',{});
   const clauses:string[]=[],args:(string|number)[]=[];
   if(coordinator){clauses.push(`${role.sql} AND EXISTS(SELECT 1 FROM care_connections c WHERE c.client_id=care_appointments.client_id AND c.staff_email=? AND c.active=1 AND c.scope='coordinator')`);args.push(...role.args,user.email.toLowerCase());}
   if(manage&&!coordinator){const guard=globalGuard(user);clauses.push(guard.sql);args.push(...guard.args);}
   if(filters.view==='active')clauses.push("state NOT IN ('completed','cancelled','no_show')");
   if(filters.view==='history')clauses.push("state IN ('completed','cancelled','no_show')");
   if(filters.query){clauses.push('instr(lower(client_name),lower(?))>0');args.push(textField(filters.query,'חיפוש',100));}
   if(filters.status&&filters.status!=='all'){if(!['completed','cancelled','no_show'].includes(filters.status))throw new TrainingError('סטטוס היסטוריה אינו תקין.');clauses.push('state=?');args.push(filters.status);}
   for(const [field,value] of [['dateFrom',filters.dateFrom],['dateTo',filters.dateTo]] as const)if(value){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(value))throw new TrainingError('תאריך אינו תקין.');
    const start=israelAppointmentTime(value+'T00:00');
    const next=new Date(value+'T00:00:00Z');next.setUTCDate(next.getUTCDate()+1);
    clauses.push(field==='dateFrom'?'starts_at>=?':'starts_at<?');args.push(field==='dateFrom'?start:israelAppointmentTime(next.toISOString().slice(0,10)+'T00:00'));
   }
   const offset=filters.offset??0;if(!Number.isSafeInteger(offset)||offset<0||offset>1000000)throw new TrainingError('עמוד אינו תקין.');
   const records=manage?await db.prepare(`SELECT ${columns} FROM care_appointments ${clauses.length?'WHERE '+clauses.join(' AND '):''} ORDER BY ${filters.view==='active'?"CASE WHEN state='requested' THEN 0 WHEN state IN ('cancel_requested','followup') THEN 1 ELSE 2 END,":''}created_at DESC,id DESC LIMIT 100 OFFSET ?`).bind(...args,offset).all<Appointment>():await db.prepare(`SELECT ${columns} FROM care_appointments WHERE client_id=? ORDER BY created_at DESC LIMIT 50`).bind(user.userId).all<Appointment>();
   const services=await servicesStore(db,adminEmails).listPublic();
   if(coordinator){
    // Check the role even for an empty list, and every captured client in one
    // snapshot after catalog enrichment. Configured admin access is independent.
    const guard=combineCareGuards(role,{sql:"NOT EXISTS(SELECT 1 FROM json_each(?) captured WHERE NOT EXISTS(SELECT 1 FROM care_connections c WHERE c.client_id=captured.value AND c.staff_email=? AND c.active=1 AND c.scope='coordinator'))",args:[JSON.stringify([...new Set(records.results.map(a=>a.clientId))]),user.email.toLowerCase()]});
    const allowed=await db.prepare(`SELECT CASE WHEN ${guard.sql} THEN 1 ELSE 0 END AS allowed`).bind(...guard.args).first<{allowed:number}>();
    if(!allowed?.allowed)throw new TrainingError('הרשאות התורים השתנו בזמן הטעינה. רעננו לפני צפייה.',403);
   }
   if(manage&&!coordinator)await requireAdmin(user);
   return records.results.map(a=>{const s=services.find(s=>s.id===a.serviceId);return {...project(a,user,manage),bookingUrl:s?.bookingUrl??'',paymentInstructions:s?.paymentInstructions??'',paymentUrl:s?.priceConfirmed&&s.priceAgorot===a.priceAgorot&&a.state==='scheduled'&&a.paymentState==='unpaid'?s.paymentUrl:''};});
  },
  async create(user:StaffIdentity,payload:unknown){
   const p=inputRecord(payload),id=validId(p.id),serviceId=textField(p.serviceId,'שירות',64,3);
   const name=textField(p.clientName,'שם מלא',100,2),preference=textField(p.preference,'העדפות למועד',600,3);
   const retry=(existing:Appointment)=>{
    if(existing.clientId!==user.userId)throw new TrainingError('הבקשה אינה זמינה.',403);
    if(existing.serviceId!==serviceId||existing.priceAgorot!==p.expectedPrice||existing.clientName!==name||existing.preference!==preference)throw new TrainingError('מזהה הבקשה כבר משויך לפרטים אחרים.',409);
    return existing;
   };
   const existing=await get(id);if(existing)return retry(existing);
   const s=await currentService(serviceId);
   if(p.expectedPrice!==s.priceAgorot)throw new TrainingError('מחיר השירות השתנה. רעננו את הרשימה לפני שליחת הבקשה.',409);
   const fallback=defaultServices.find(d=>d.id===s.id);
   const defaultMatch=!!fallback&&fallback.title===s.title&&fallback.provider===s.provider&&fallback.durationMinutes===s.durationMinutes&&fallback.priceAgorot===s.priceAgorot&&fallback.status===s.status&&fallback.priceConfirmed===s.priceConfirmed;
   const serviceGuard={sql:`(EXISTS(SELECT 1 FROM consultation_services WHERE id=? AND title=? AND provider=? AND duration_minutes=? AND price_agorot=? AND status=? AND price_confirmed=?) OR (?=1 AND NOT EXISTS(SELECT 1 FROM consultation_services WHERE id=?)))`,
    args:[s.id,s.title,s.provider,s.durationMinutes,s.priceAgorot,s.status,s.priceConfirmed?1:0,defaultMatch?1:0,s.id]};
   const at=now();
   const row=await db.prepare(`INSERT INTO care_appointments(id,client_id,client_name,service_id,title,provider,duration,price_agorot,preference,created_at,updated_at)
    SELECT ?,?,?,?,?,?,?,?,?,?,? WHERE ${serviceGuard.sql} AND (SELECT COUNT(*) FROM care_appointments WHERE client_id=? AND state IN ('requested','scheduled','cancel_requested'))<5
    ON CONFLICT(id) DO NOTHING RETURNING ${columns}`)
    .bind(id,user.userId,name,s.id,s.title,s.provider,s.durationMinutes,s.priceAgorot,preference,at,at,...serviceGuard.args,user.userId).first<Appointment>();
   if(row)return row;
   const winner=await get(id);if(winner)return retry(winner);
   const current=await db.prepare(`SELECT CASE WHEN ${serviceGuard.sql} THEN 1 ELSE 0 END allowed`).bind(...serviceGuard.args).first<{allowed:number}>();
   if(!current?.allowed)throw new TrainingError('פרטי השירות השתנו. רעננו לפני שליחת בקשה חדשה.',409);
   throw new TrainingError('יש כבר חמש בקשות פעילות. המתינו למענה או בטלו בקשה קודמת.');
  },
  async update(user:StaffIdentity,payload:unknown){const p=inputRecord(payload);const id=validId(p.id);const version=integerField(p.version,'גרסה',1,1000000);const record=await get(id);if(!record)throw new TrainingError('הבקשה לא נמצאה.',404);const own=record.clientId===user.userId;if(!own&&!await canManage(user,record.clientId))throw new TrainingError('אין הרשאה לבקשה זו.',403);if(record.version!==version)throw new TrainingError('הבקשה עודכנה. רעננו לפני שינוי נוסף.',409);
   let set='';let values:(string|number|null)[]=[];let condition='';let additional:(string|number)[]=[];
   if(p.action==='requestCancel'){if(!own)throw new TrainingError('פעולה זו זמינה למתאמן.',403);if(!['requested','scheduled'].includes(record.state))throw new TrainingError('לא ניתן לבקש ביטול במצב הנוכחי.');set="state='cancel_requested'";}
   else if(p.action==='submitFeedback'){if(!own||!record.feedbackRequestedAt||record.feedbackRespondedAt)throw new TrainingError('אין בקשת משוב פתוחה עבור החשבון הזה.',403);set="feedback_response=?,feedback_responded_at=?";values=[textField(p.content,'משוב',2000,3),now()];condition=' AND feedback_requested_at IS NOT NULL AND feedback_responded_at IS NULL';}
   else if(p.action==='reportPayment'){if(!own||record.state!=='scheduled'||record.paymentState!=='unpaid')throw new TrainingError('לא ניתן לדווח תשלום במצב הנוכחי.',403);set="payment_state='reported',payment_reference=?";values=[textField(p.reference,'אסמכתא',200,3)];}
   else {await requireAdmin(user,record.clientId);
    if(['complete','noShow','followup','requestFeedback'].includes(String(p.action))&&!clinical(user))throw new TrainingError('פעולה זו זמינה לרופא או למנהל בלבד.',403);
    if(p.action==='requestFeedback'){if(!['completed','followup'].includes(record.state)||!record.endsAt||record.endsAt>now()||record.feedbackRequestedAt)throw new TrainingError('ניתן לשלוח בקשת משוב אחת בלבד לאחר סיום המפגש.');set="feedback_message=?,feedback_requested_at=?";values=[textField(p.content,'בקשת משוב',600,3),now()];condition=' AND feedback_requested_at IS NULL';}
    else if(p.action==='schedule'){if(!['requested','scheduled','followup'].includes(record.state))throw new TrainingError('לא ניתן לאשר מועד במצב הנוכחי.');const service=await currentService(record.serviceId);if(!service.priceConfirmed||service.priceAgorot!==record.priceAgorot||service.durationMinutes!==record.duration||service.provider!==record.provider)throw new TrainingError('יש לאשר את המחיר ופרטי השירות. אם המחיר או פרטי המפגש השתנו, יש לבקש הזמנה חדשה.');const raw=textField(p.startsAt,'מועד',40,10);const start=new Date(raw);if(!/Z$|[+-]\d{2}:\d{2}$/.test(raw)||!Number.isFinite(start.getTime())||start.getTime()<=Date.now())throw new TrainingError('יש לבחור מועד עתידי תקין.');const end=new Date(start.getTime()+record.duration*60000).toISOString();set="state='scheduled',starts_at=?,ends_at=?,meeting_url=?,staff_note=?";values=[start.toISOString(),end,externalLink(p.meetingUrl??''),clinical(user)?textField(p.staffNote??'','הנחיות למפגש',1200):record.staffNote];condition=" AND NOT EXISTS(SELECT 1 FROM care_appointments other WHERE other.id!=? AND other.provider=? AND other.state IN ('scheduled','cancel_requested') AND other.starts_at<? AND other.ends_at>?)";additional=[id,record.provider,end,start.toISOString()];}
    else if(p.action==='cancel'){if(!['requested','scheduled','cancel_requested'].includes(record.state))throw new TrainingError('לא ניתן לבטל במצב הנוכחי.');set="state='cancelled',staff_note=?,payment_state=CASE WHEN payment_state IN ('reported','confirmed') THEN 'refund_pending' ELSE payment_state END";values=[clinical(user)?textField(p.staffNote??'','הודעת ביטול',1200):record.staffNote];}
    else if(p.action==='followup'){if(record.state!=='scheduled')throw new TrainingError('מעקב זמין לאחר קביעת מפגש.');set="state='followup',staff_note=?";values=[textField(p.staffNote??'','הנחיות מעקב',1200)];}
    else if(p.action==='noShow'){if(record.state!=='scheduled'||!record.endsAt||record.endsAt>now())throw new TrainingError('אפשר לסמן אי הגעה רק לאחר המועד שאושר.');set="state='no_show'";}
    else if(p.action==='complete'){if(record.state!=='scheduled'||!record.endsAt||record.endsAt>now())throw new TrainingError('אפשר לסמן סיום רק לאחר המועד שאושר.');set="state='completed'";}
    else if(p.action==='verifyPayment'){if(!['scheduled','completed','no_show'].includes(record.state)||!['reported','unpaid'].includes(record.paymentState)||p.verified!==true)throw new TrainingError('יש לאשר בדיקה של העסקה אצל ספק הסליקה.');set="payment_state='confirmed',payment_reference=?,payment_verified_by=?";values=[textField(p.reference,'אסמכתא שנבדקה',200,3),user.userId];}
    else if(p.action==='markRefunded'){if(record.paymentState!=='refund_pending'||p.verified!==true)throw new TrainingError('יש לאשר ביצוע החזר אצל ספק הסליקה.');set="payment_state='refunded',payment_reference=?,payment_verified_by=?";values=[textField(p.reference,'אסמכתת החזר',200,3),user.userId];}
    else throw new TrainingError('פעולה לא מוכרת.');
   }
   const ownerAction=p.action==='requestCancel'||p.action==='reportPayment'||p.action==='submitFeedback';
   const access=ownerAction?{sql:'client_id=?',args:[user.userId]}:manageGuard(user,record.clientId);
   const fallback=defaultServices.find(s=>s.id===record.serviceId);
   const defaultMatch=!!fallback&&fallback.status!=='draft'&&fallback.priceConfirmed&&fallback.priceAgorot===record.priceAgorot&&fallback.durationMinutes===record.duration&&fallback.provider===record.provider;
   const serviceGuard=p.action==='schedule'?{sql:"(EXISTS(SELECT 1 FROM consultation_services WHERE id=? AND status<>'draft' AND price_confirmed=1 AND price_agorot=? AND duration_minutes=? AND provider=?) OR (?=1 AND NOT EXISTS(SELECT 1 FROM consultation_services WHERE id=?)))",args:[record.serviceId,record.priceAgorot,record.duration,record.provider,defaultMatch?1:0,record.serviceId]}:{sql:'1=1',args:[]};
   const guard=combineCareGuards(access,serviceGuard);
   const row=await db.prepare(`UPDATE care_appointments SET ${set},version=version+1,updated_at=? WHERE id=? AND client_id=? AND version=? AND state=? AND payment_state=? AND ${guard.sql}${condition} RETURNING ${columns}`).bind(...values,now(),id,record.clientId,version,record.state,record.paymentState,...guard.args,...additional).first<Appointment>();
   if(!row){
    if(!ownerAction){const allowed=await db.prepare(`SELECT CASE WHEN ${access.sql} THEN 1 ELSE 0 END allowed`).bind(...access.args).first<{allowed:number}>();if(!allowed?.allowed)throw new TrainingError('הרשאת תיאום התורים השתנתה. רעננו לפני עדכון.',403);}
    throw new TrainingError(p.action==='schedule'?'פרטי השירות השתנו, המועד חופף או שהבקשה עודכנה. רעננו לפני שינוי נוסף.':'הבקשה עודכנה בחלון אחר. רעננו ונסו שוב.',409);
   }
   return project(row,user,!own);
  },
 };
}
