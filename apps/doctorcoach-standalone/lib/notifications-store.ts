import {smartNotifications,type SmartNotification} from './smart-notifications.ts';
import {notificationPreferencesStore,quietNow} from './notification-preferences.ts';
import {careStore} from './care-store.ts';
import type {CareConfig} from './care-store.ts';
import type {StaffIdentity} from './staff.ts';
import {onboardingStore} from './onboarding-store.ts';
import {currentWeek} from './care.ts';
import {staffRoleGuard} from './care-write-guard.ts';
import {CONSENT_REVISION} from './intake.ts';
export function notificationsStore(db:D1Database,config:CareConfig={}){
 return {async list(u:StaffIdentity){
 const consent=await onboardingStore(db,config).consentState(u.userId);
 if(!consent.notifications)return {enabled:false,items:[]};
 const staff=await careStore(db,config).staffFor(u.email);
 const channel=staff?({clinician:'medical',coach:'training',dietitian:'nutrition',coordinator:'scheduling'}[staff.role]):'';
 const appointments=await db.prepare("SELECT id,starts_at FROM care_appointments WHERE client_id=? AND state='scheduled' AND starts_at>=? AND starts_at<=? ORDER BY starts_at,id LIMIT 50").bind(u.userId,new Date().toISOString(),new Date(Date.now()+86400000).toISOString()).all<{id:string;starts_at:string}>();
 // Keep recent confirmed cancellations visible independently of the original appointment date.
 // A stable ID prevents later refund updates from sending the cancellation again.
 const cancellations=await db.prepare("SELECT id FROM care_appointments WHERE client_id=? AND state='cancelled' AND updated_at>=? ORDER BY updated_at DESC,id LIMIT 50").bind(u.userId,new Date(Date.now()-7*86400000).toISOString()).all<{id:string}>();
 const feedbackRequests=await db.prepare("SELECT id FROM care_appointments WHERE client_id=? AND feedback_requested_at IS NOT NULL AND feedback_responded_at IS NULL ORDER BY feedback_requested_at DESC LIMIT 50").bind(u.userId).all<{id:string}>();
 const programs=await db.prepare('SELECT COUNT(*) AS n FROM care_programs WHERE client_id=? AND applied_at IS NULL').bind(u.userId).first<{n:number}>();
 const profile=await db.prepare('SELECT user_id FROM care_profiles WHERE user_id=?').bind(u.userId).first();
 const checked=await db.prepare('SELECT id FROM care_checkins WHERE client_id=? AND week=?').bind(u.userId,currentWeek()).first();
 // Compute unread counts last, in the same SQL snapshot as current consent.
 // Revoked staff access contributes no foreign count; personal history stays.
 const role=staff?staffRoleGuard(staff.email,staff.role,config):{sql:'0=1',args:[]};
 const unreadQuery=db.prepare(`WITH settings AS (SELECT COALESCE((SELECT accepted<>0 AND revision=? FROM user_consents WHERE user_id=? AND consent_id='notifications' ORDER BY created_at DESC,rowid DESC LIMIT 1),0) AS enabled), pending AS (SELECT m.rowid AS sequence FROM team_messages m WHERE m.author_id!=? AND m.rowid>COALESCE((SELECT CAST(r.read_through AS INTEGER) FROM message_reads r WHERE r.user_id=? AND r.client_id=m.client_id AND r.channel=m.channel),0) AND (m.client_id=? OR (m.channel=? AND ${role.sql} AND EXISTS(SELECT 1 FROM care_connections c WHERE c.client_id=m.client_id AND c.staff_email=? AND c.active=1 AND ((?='medical' AND c.scope='care' AND c.medical_access<>0) OR (?='nutrition' AND c.scope='care' AND c.nutrition_access<>0) OR (?='training' AND c.scope='care') OR (?='scheduling' AND c.scope='coordinator')))))) SELECT (SELECT enabled FROM settings) AS enabled,(SELECT COUNT(*) FROM pending) AS n,(SELECT COALESCE(MAX(sequence),0) FROM pending) AS latest`).bind(CONSENT_REVISION,u.userId,u.userId,u.userId,u.userId,channel,...role.args,staff?.email??'',channel,channel,channel,channel);
 const unread=await unreadQuery.first<{enabled:number;n:number;latest:number}>();
 if(!unread?.enabled)return {enabled:false,items:[]};
 const items:SmartNotification[]=[];
 if(unread?.n)items.push({id:'messages:'+unread.latest,category:'team',section:'messages',text:`${unread.n} הודעות חדשות`});
 for(const appointment of appointments.results)items.push({id:'appointments:'+JSON.stringify([appointment.id,appointment.starts_at]),category:'appointments',section:'appointments',text:'מפגש נקבע ב־24 השעות הקרובות'});
 for(const appointment of cancellations.results)items.push({id:'appointment-cancelled:'+appointment.id,category:'appointments',section:'appointments',text:'ביטול המפגש אושר. הפרטים מופיעים בתורים שלך'});
 for(const appointment of feedbackRequests.results)items.push({id:'consultation-feedback:'+appointment.id,category:'appointments',section:'appointments',text:'הצוות ביקש משוב על המפגש. אפשר להשיב בתורים שלי'});
 if(programs?.n)items.push({id:'program:'+currentWeek(),category:'team',section:'care',text:'תוכנית מהצוות ממתינה לאישור שלך'});
 if(profile&&!checked)items.push({id:'checkin:'+currentWeek(),category:'rehab',section:'care',text:'הדיווח השבועי שלך ממתין למילוי'});
 const prefs=await notificationPreferencesStore(db).get(u.userId);
 const dismissals=await db.prepare('SELECT notification_id FROM notification_dismissals WHERE user_id=?').bind(u.userId).all<{notification_id:string}>();
 const extra=await smartNotifications(db,u.userId);
 // Consent and message permissions are checked again after additional reads.
 const latest=await onboardingStore(db,config).consentState(u.userId);
 if(!latest.notifications)return {enabled:false,items:[]};
 const finalUnread=await unreadQuery.first<{enabled:number;n:number;latest:number}>();
 if(!finalUnread?.enabled)return {enabled:false,items:[]};
 const messageIndex=items.findIndex(i=>i.section==='messages');
 if(messageIndex>=0){if(!finalUnread.n)items.splice(messageIndex,1);else {items[messageIndex].text=finalUnread.n+' הודעות חדשות';items[messageIndex].id='messages:'+finalUnread.latest;}}
 const roleNow=staff?await careStore(db,config).staffFor(u.email):null;
 if(staff&&(!roleNow||roleNow.role!==staff.role))items.splice(0,items.length,...items.filter(i=>i.section!=='messages'));
 const dismissed=new Set(dismissals.results.map(d=>d.notification_id));
 const quiet=quietNow(prefs.preferences);
 return {enabled:true,quiet,items:quiet?[]:[...new Map([...items,...extra].filter(i=>prefs.preferences.categories[i.category]&&!dismissed.has(i.id)).map(i=>[i.id,i])).values()]};
 }};
}
