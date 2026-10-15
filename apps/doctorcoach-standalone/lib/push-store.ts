import {CONSENT_REVISION} from './intake.ts';
import {inputRecord} from './care.ts';
import {TrainingError} from './training.ts';
import {pushDigest,pushEndpoint,sendWebPush,type PushConfig} from './web-push.ts';
import {notificationsStore} from './notifications-store.ts';
import {onboardingStore} from './onboarding-store.ts';
import type {StaffIdentity} from './staff.ts';
import type {CareConfig} from './care-store.ts';
type Device={id:string;user_id:string;email:string;endpoint:string;fingerprint:string;last_sent_at:string|null};
export function pushStore(db:D1Database,care:CareConfig={},config:PushConfig|null=null,fetcher:typeof fetch=fetch){
 async function allowed(id:string){const c=await onboardingStore(db,care).consentState(id);return !!c.notifications&&!!c.push;}
 async function consent(id:string){if(!await allowed(id))throw new TrainingError('יש לאשר עדכונים בתוך האפליקציה והתראות לטלפון באזור הפרטיות.',403);}
 async function owned(u:StaffIdentity,p:unknown){const data=inputRecord(p),endpoint=pushEndpoint(data.endpoint),id=await pushDigest(endpoint);const row=await db.prepare('SELECT * FROM push_devices WHERE id=? AND user_id=?').bind(id,u.userId).first<Device>();if(!row)throw new TrainingError('המכשיר אינו רשום לחשבון זה.',404);return row;}
 return {
 async status(u:StaffIdentity){return {configured:!!config,consented:await allowed(u.userId),publicKey:config?.publicKey??null,devices:(await db.prepare('SELECT id,created_at AS createdAt,last_sent_at AS lastSentAt FROM push_devices WHERE user_id=? ORDER BY created_at').bind(u.userId).all()).results};},
 async subscribe(u:StaffIdentity,p:unknown){if(!config)throw new TrainingError('שירות Push עדיין אינו מוגדר.',503);await consent(u.userId);const data=inputRecord(p),endpoint=pushEndpoint(data.endpoint),id=await pushDigest(endpoint);
 const old=await db.prepare('SELECT user_id FROM push_devices WHERE id=?').bind(id).first<{user_id:string}>();if(old&&old.user_id!==u.userId)throw new TrainingError('יש לבטל את רישום המכשיר בחשבון הקודם.',409);
 const saved=await db.prepare("INSERT INTO push_devices(id,user_id,email,endpoint,created_at) SELECT ?,?,?,?,? WHERE ((SELECT COUNT(*) FROM push_devices WHERE user_id=?)<5 OR EXISTS(SELECT 1 FROM push_devices WHERE id=? AND user_id=?)) AND COALESCE((SELECT accepted<>0 AND revision=? FROM user_consents WHERE user_id=? AND consent_id='notifications' ORDER BY created_at DESC,rowid DESC LIMIT 1),0) AND COALESCE((SELECT accepted<>0 AND revision=? FROM user_consents WHERE user_id=? AND consent_id='push' ORDER BY created_at DESC,rowid DESC LIMIT 1),0) ON CONFLICT(id) DO UPDATE SET email=excluded.email WHERE push_devices.user_id=excluded.user_id RETURNING id").bind(id,u.userId,u.email,endpoint,new Date().toISOString(),u.userId,id,u.userId,CONSENT_REVISION,u.userId,CONSENT_REVISION,u.userId).first();if(!saved){await consent(u.userId);throw new TrainingError('אפשר לרשום עד חמישה מכשירים לחשבון.',409);}return {ok:true};},
 async unsubscribe(u:StaffIdentity,p:unknown){const row=await owned(u,p);await db.prepare('DELETE FROM push_devices WHERE id=? AND user_id=?').bind(row.id,u.userId).run();return {ok:true};},
 async test(u:StaffIdentity,p:unknown){if(!config)throw new TrainingError('שירות Push עדיין אינו מוגדר.',503);await consent(u.userId);const row=await owned(u,p);const id=crypto.randomUUID(),at=new Date().toISOString();const claimed=await db.prepare("UPDATE push_devices SET last_test_at=? WHERE id=? AND user_id=? AND (last_test_at IS NULL OR last_test_at<?) RETURNING id").bind(at,row.id,u.userId,new Date(Date.now()-60000).toISOString()).first();if(!claimed)throw new TrainingError('אפשר לשלוח בדיקת Push פעם בדקה.',429);
 const current=await notificationsStore(db,care).list(u);if(!current.enabled||current.quiet)throw new TrainingError('עדכונים כבויים או שעות שקטות פעילות.',403);
 const live=await db.prepare('SELECT id FROM push_devices WHERE id=? AND user_id=? AND last_test_at=?').bind(row.id,u.userId,at).first();if(!live)throw new TrainingError('רישום המכשיר השתנה. הפעילו Push מחדש.',404);
 await consent(u.userId);const result=await sendWebPush(row.endpoint,config,fetcher);if(result.status===404||result.status===410){await db.prepare('DELETE FROM push_devices WHERE id=? AND user_id=? AND last_test_at=?').bind(row.id,u.userId,at).run();throw new TrainingError('הרישום פג. הפעילו Push מחדש.',410);}if(!result.ok)throw new TrainingError('שירות Push לא אישר את השליחה.',502);await db.prepare('UPDATE push_devices SET last_sent_at=? WHERE id=? AND user_id=? AND last_test_at=?').bind(at,row.id,u.userId,at).run();return {accepted:true,delivered:false};},
 async dispatch(){if(!config)return {configured:false,sent:0};
 // Rotate through bounded pages without starving later devices.
 const devices=await db.prepare('SELECT * FROM push_devices ORDER BY COALESCE(scanned_at,created_at),id LIMIT 50').all<Device>();let sent=0;
 for(const row of devices.results){const u={userId:row.user_id,email:row.email},at=new Date().toISOString();
 try{if(!await allowed(u.userId)){await db.prepare('UPDATE push_devices SET scanned_at=? WHERE id=?').bind(at,row.id).run();continue;}const list=await notificationsStore(db,care).list(u);const fingerprint=list.items.length?await pushDigest(JSON.stringify(list.items.map(i=>[i.id,i.text]).sort())):'';
 if(!list.enabled||list.quiet||!fingerprint||fingerprint===row.fingerprint){await db.prepare('UPDATE push_devices SET scanned_at=?,fingerprint=CASE WHEN ? THEN ? ELSE fingerprint END WHERE id=?').bind(at,!list.quiet?1:0,fingerprint,row.id).run();continue;}
 const claim=crypto.randomUUID(),won=await db.prepare('UPDATE push_devices SET claimed_at=?,scanned_at=?,claim_id=? WHERE id=? AND fingerprint=? AND (claimed_at IS NULL OR claimed_at<?) RETURNING id').bind(at,at,claim,row.id,row.fingerprint,new Date(Date.now()-60000).toISOString()).first();if(!won)continue;
 const latest=await notificationsStore(db,care).list(u);if(!latest.enabled||latest.quiet||!latest.items.length)continue;
 const live=await db.prepare('SELECT id FROM push_devices WHERE id=? AND user_id=? AND claim_id=?').bind(row.id,u.userId,claim).first();if(!live)continue;
 if(!await allowed(u.userId))continue;const result=await sendWebPush(row.endpoint,config,fetcher);
 if(result.status===404||result.status===410){await db.prepare('DELETE FROM push_devices WHERE id=? AND claim_id=?').bind(row.id,claim).run();continue;}
 if(result.ok){await db.prepare('UPDATE push_devices SET fingerprint=?,last_sent_at=?,claimed_at=NULL,claim_id=NULL WHERE id=? AND claim_id=?').bind(await pushDigest(JSON.stringify(latest.items.map(i=>[i.id,i.text]).sort())),at,row.id,claim).run();sent++;}
 }catch{/* Retry next scheduled run without logging endpoints, identity or secrets. */}}
 return {configured:true,sent};}
 };
}
