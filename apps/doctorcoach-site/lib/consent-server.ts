import {CONSENT_REVISION} from './intake.ts';
import {TrainingError} from './training.ts';
export function healthConsentGuard(userId:string){
 const ids=['terms','privacy','health','team'];
 return {
  sql:ids.map(()=>`COALESCE((SELECT accepted<>0 AND revision=? FROM user_consents
   WHERE user_id=? AND consent_id=? ORDER BY created_at DESC,rowid DESC LIMIT 1),0)`).join(' AND '),
  args:ids.flatMap(id=>[CONSENT_REVISION,userId,id]),
 };
}
export async function requireHealthConsent(db:D1Database,userId:string){
 const guard=healthConsentGuard(userId);
 const result=await db.prepare(`SELECT CASE WHEN ${guard.sql} THEN 1 ELSE 0 END AS allowed`).bind(...guard.args).first<{allowed:number}>();
 if(!result?.allowed)throw new TrainingError('יש לעדכן את ההסכמות בשאלון שבתיק שלי לפני שמירת מידע אישי. המידע הקיים נשמר.',403);
}
