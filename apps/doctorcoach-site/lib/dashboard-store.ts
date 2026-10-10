import {careStore} from './care-store.ts';
import {staffRoleGuard} from './care-write-guard.ts';
import type {CareConfig} from './care-store.ts';
import {isStaff} from './staff.ts';
import type {StaffIdentity} from './staff.ts';
import {TrainingError} from './training.ts';
import {onboardingStore,reviewColumns,reviewDto} from './onboarding-store.ts';
import {messagingStore} from './messaging-store.ts';
import {asText} from './intake.ts';
import type {Answers,Review} from './intake.ts';
import {currentWeek,inputRecord,validId} from './care.ts';
export function dashboardStore(db:D1Database,config:CareConfig={}){
 const care=careStore(db,config);
 return {
 async get(user:StaffIdentity){const staff=await care.staffFor(user.email);const admin=isStaff(user,config.adminEmails);if(!staff&&!admin)throw new TrainingError('העמוד זמין לצוות בלבד.',403);
const threads=await messagingStore(db,config).threads(user);const rows=staff?(await db.prepare('SELECT p.user_id AS id,p.name,p.goal,p.updated_at AS updatedAt,c.medical_access,c.nutrition_access,c.scope FROM care_profiles p JOIN care_connections c ON c.client_id=p.user_id WHERE c.staff_email=? AND c.active=1 AND c.scope=? ORDER BY p.updated_at DESC LIMIT 100').bind(staff.email,staff.role==='coordinator'?'coordinator':'care').all<{id:string;name:string;goal:string;updatedAt:string;medical_access:number;nutrition_access:number;scope:string}>()).results:[];
 const clients=[];const reviews:Review[]=[];
 for(const row of rows){const intake=await db.prepare('SELECT answers_json,created_at,completed FROM user_intakes WHERE user_id=?').bind(row.id).first<{answers_json:string;created_at:string;completed:number}>();const a:Answers=intake?JSON.parse(intake.answers_json):{};
 const appointments=(await db.prepare("SELECT id,title,state,starts_at AS startsAt,payment_state AS paymentState FROM care_appointments WHERE client_id=? AND state IN ('requested','scheduled','cancel_requested','followup') ORDER BY created_at DESC LIMIT 10").bind(row.id).all()).results;
 const clinical=staff?.role==='clinician'&&!!row.medical_access&&row.scope==='care';if(clinical){const rs=await db.prepare(`SELECT ${reviewColumns} FROM medical_reviews WHERE client_id=? AND state IN ('pending','in_review') ORDER BY created_at DESC`).bind(row.id).all<Omit<Review,'flags'>&{flags_json:string}>();reviews.push(...rs.results.map(reviewDto));}
 const scheduling=staff?.role==='coordinator';if(!scheduling&&row.scope==='coordinator')continue;
 const lastCheckin=scheduling?null:await db.prepare('SELECT MAX(week) AS week FROM care_checkins WHERE client_id=?').bind(row.id).first<{week:string|null}>();
 clients.push({id:row.id,name:row.name,phone:asText(a.phone),updatedAt:row.updatedAt,createdAt:intake?.created_at??row.updatedAt,appointments,unread:threads.filter(t=>t.clientId===row.id).reduce((n,t)=>n+t.unread,0),...(scheduling?{}:{goal:row.goal,restrictions:asText(a.professional_restrictions),lastCheckin:lastCheckin?.week??null,checkinOverdue:(lastCheckin?.week??'')<currentWeek(),...(clinical?{intake:a}:{})})});}
 const requests=admin?(await db.prepare("SELECT r.id,r.user_id AS userId,p.name,r.kind,r.state,r.created_at AS createdAt FROM account_requests r LEFT JOIN care_profiles p ON p.user_id=r.user_id WHERE r.state='pending' ORDER BY r.created_at LIMIT 100").all()).results:[];
 const audit=admin?(await db.prepare('SELECT id,action,created_at AS createdAt FROM audit_events ORDER BY created_at DESC LIMIT 30').all()).results:[];
 if(staff){
  const guard=staffRoleGuard(staff.email,staff.role,config);
  // Revalidate the captured role and every assembled client grant in one DB
  // read. Never return a partly stale clinical response after revocation.
  const current=await db.prepare(`SELECT CASE WHEN ${guard.sql} THEN 1 ELSE 0 END allowed,
   COALESCE((SELECT json_group_array(json_object('id',client_id,'scope',scope,'medical',medical_access,'nutrition',nutrition_access)) FROM care_connections WHERE staff_email=? AND active=1),'[]') AS links`)
   .bind(...guard.args,staff.email).first<{allowed:number;links:string}>();
  const links=JSON.parse(current?.links??'[]') as {id:string;scope:string;medical:number;nutrition:number}[];
  const changed=!current?.allowed||rows.some(row=>!links.some(l=>l.id===row.id&&l.scope===row.scope&&l.medical===row.medical_access&&l.nutrition===row.nutrition_access));
  const channelRoles:Record<string,string>={medical:'clinician',nutrition:'dietitian',training:'coach',scheduling:'coordinator'};
  const lostThread=threads.some(t=>t.clientId!==user.userId&&!links.some(l=>l.id===t.clientId&&staff.role===channelRoles[t.channel]&&l.scope===(t.channel==='scheduling'?'coordinator':'care')&&(t.channel!=='medical'||!!l.medical)&&(t.channel!=='nutrition'||!!l.nutrition)));
  if(changed||lostThread)throw new TrainingError('הרשאות לוח הצוות השתנו בזמן הטעינה. רעננו לפני צפייה.',403);
 }
 return {role:staff?.role??'admin',canAdmin:admin,clients,reviews,requests,audit,unread:threads.reduce((n,t)=>n+t.unread,0),newUsers:clients.filter(c=>c.createdAt>new Date(Date.now()-7*86400000).toISOString()).length};
 },
 async completeRequest(user:StaffIdentity,payload:unknown){if(!isStaff(user,config.adminEmails))throw new TrainingError('הרשאת מנהל נדרשת.',403);const p=inputRecord(payload);if(p.confirmed!==true)throw new TrainingError('יש לאשר שהבקשה טופלה בפועל.');const id=validId(p.id);await db.prepare("UPDATE account_requests SET state='handled',updated_at=? WHERE id=? AND state='pending'").bind(new Date().toISOString(),id).run();return {ok:true};},
 };
}
