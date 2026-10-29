import type {ProgramAuthorConfig} from './program-author.ts';
import {isStaff,type StaffIdentity,isAdmin} from './staff.ts';
import {inputRecord,integerField,textField,validId,inviteHash} from './care.ts';
import {TrainingError} from './training.ts';
import {trainingAccess,noActiveWorkout} from './training-access.ts';
type Code={id:string;label:string;durationDays:number;maxUses:number;usedCount:number;active:number;expiresAt:string;createdAt:string};
const columns='id,label,duration_days AS durationDays,max_uses AS maxUses,used_count AS usedCount,active,expires_at AS expiresAt,created_at AS createdAt';
export function pilotStore(db:D1Database,admins?:string,config:ProgramAuthorConfig={}){
 const admin=(u:StaffIdentity)=>{if(!isAdmin(u,admins))throw new TrainingError('ניהול פיילוט זמין לצוות הניהול בלבד.',403);};
 return {
 async get(u:StaffIdentity,manage=false){if(manage){admin(u);return {codes:(await db.prepare(`SELECT ${columns} FROM pilot_codes ORDER BY created_at DESC LIMIT 100`).all<Code>()).results};}return {access:await trainingAccess(db,u.userId,config),redemptions:(await db.prepare('SELECT starts_at AS startsAt,ends_at AS endsAt FROM pilot_redemptions WHERE user_id=? ORDER BY starts_at DESC').bind(u.userId).all()).results};},
 async create(u:StaffIdentity,payload:unknown){admin(u);const p=inputRecord(payload),label=textField(p.label,'שם הפיילוט',100,2),days=integerField(p.durationDays,'ימי ניסיון',1,90),max=integerField(p.maxUses,'מספר משתתפים',1,1000),enrollmentDays=integerField(p.enrollmentDays,'ימים להצטרפות',1,90);const bytes=crypto.getRandomValues(new Uint8Array(10)),code='PILOT-'+[...bytes].map(b=>b.toString(16).padStart(2,'0')).join('').toUpperCase(),id=crypto.randomUUID(),at=new Date().toISOString(),expires=new Date(Date.now()+enrollmentDays*86400000).toISOString();
 await db.prepare('INSERT INTO pilot_codes(id,code_hash,label,duration_days,max_uses,expires_at,created_at,created_by) VALUES(?,?,?,?,?,?,?,?)').bind(id,await inviteHash(code),label,days,max,expires,at,u.userId).run();return {id,code,expiresAt:expires};},
 async close(u:StaffIdentity,payload:unknown){admin(u);const p=inputRecord(payload),id=validId(p.id);await db.prepare('UPDATE pilot_codes SET active=0 WHERE id=?').bind(id).run();return {ok:true};},
 async redeem(u:StaffIdentity,payload:unknown){const p=inputRecord(payload),hash=await inviteHash(p.code),at=new Date().toISOString();const attempt=await db.prepare("INSERT INTO audit_events(id,actor_id,subject_id,action,created_at) SELECT ?,?,?,'pilot_code_attempt',? WHERE (SELECT COUNT(*) FROM audit_events WHERE actor_id=? AND action='pilot_code_attempt' AND created_at>?)<20 RETURNING id").bind(crypto.randomUUID(),u.userId,u.userId,at,u.userId,new Date(Date.now()-3600000).toISOString()).first();if(!attempt)throw new TrainingError('נסיונות רבים מדי. נסו שוב בהמשך.',429);
 const code=await db.prepare('SELECT id,duration_days,max_uses,used_count,active,expires_at FROM pilot_codes WHERE code_hash=?').bind(hash).first<{id:string;duration_days:number;max_uses:number;used_count:number;active:number;expires_at:string}>();
 if(!code)throw new TrainingError('קוד הפיילוט אינו זמין או שפג תוקפו.',403);
 const previous=await db.prepare('SELECT ends_at AS endsAt FROM pilot_redemptions WHERE code_id=? AND user_id=?').bind(code.id,u.userId).first<{endsAt:string}>();if(previous)return {ok:true,alreadyRedeemed:true,endsAt:previous.endsAt};
 await noActiveWorkout(db,u.userId);const end=new Date(Date.now()+code.duration_days*86400000).toISOString(),receipt=crypto.randomUUID();
 await db.batch([
 db.prepare("INSERT INTO audit_events(id,actor_id,subject_id,action,created_at) SELECT ?,?,?,'pilot_redeemed',? WHERE EXISTS(SELECT 1 FROM pilot_codes WHERE id=? AND active=1 AND expires_at>? AND used_count<max_uses) AND NOT EXISTS(SELECT 1 FROM pilot_redemptions WHERE code_id=? AND user_id=?) AND NOT EXISTS(SELECT 1 FROM training_sessions WHERE owner_id=? AND status='active')").bind(receipt,u.userId,u.userId,at,code.id,at,code.id,u.userId,u.userId),
 db.prepare('INSERT INTO pilot_redemptions(code_id,user_id,starts_at,ends_at) SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM audit_events WHERE id=?)').bind(code.id,u.userId,at,end,receipt),
 db.prepare('UPDATE pilot_codes SET used_count=used_count+1 WHERE id=? AND EXISTS(SELECT 1 FROM audit_events WHERE id=?)').bind(code.id,receipt),
 db.prepare("INSERT INTO training_access(user_id,mode,self_until,updated_at) SELECT ?,'self',?,? WHERE EXISTS(SELECT 1 FROM audit_events WHERE id=?) ON CONFLICT(user_id) DO UPDATE SET mode='self',self_until=CASE WHEN training_access.self_until>excluded.self_until THEN training_access.self_until ELSE excluded.self_until END,updated_at=excluded.updated_at").bind(u.userId,end,at,receipt),
 ]);
 if(!await db.prepare('SELECT id FROM audit_events WHERE id=?').bind(receipt).first()){const retry=await db.prepare('SELECT ends_at AS endsAt FROM pilot_redemptions WHERE code_id=? AND user_id=?').bind(code.id,u.userId).first<{endsAt:string}>();if(retry)return {ok:true,alreadyRedeemed:true,endsAt:retry.endsAt};await noActiveWorkout(db,u.userId);throw new TrainingError('קוד הפיילוט אינו זמין או שמכסת המשתתפים התמלאה.',403);}
 return {ok:true,alreadyRedeemed:false,endsAt:end};
 },
 };
}
