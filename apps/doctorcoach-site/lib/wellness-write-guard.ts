import {isStaff,type StaffIdentity} from './staff.ts';
import type {CareConfig} from './care-store.ts';
import type {WellnessKind} from './wellness.ts';
import {TrainingError} from './training.ts';
type Access={self:boolean;medical:boolean;nutrition:boolean};
export function requireWellnessWriteAccess(a:Access,kind:WellnessKind){
 if(['assessment','daily','weekly','rehab','readiness'].includes(kind)&&!a.self)throw new TrainingError('דיווח אישי נשמר על ידי המתאמן בלבד.',403);
 if(['plan','weeklyReview'].includes(kind)&&(a.self||!a.nutrition))throw new TrainingError('עדכון תוכנית ומענה תזונה זמינים לדיאטן המשויך בלבד.',403);
 if(['return','episode'].includes(kind)&&(a.self||!a.medical))throw new TrainingError('תוכנית חזרה לפעילות נקבעת על ידי הרופא המשויך.',403);
}
export function wellnessWriteGuard(user:StaffIdentity,clientId:string,kind:WellnessKind,config:CareConfig){
 if(user.userId===clientId)return {sql:'1=1',args:[] as (string|number)[]};
 const nutrition=['plan','weeklyReview'].includes(kind),role=nutrition?'dietitian':'clinician';
 return {
  sql:`EXISTS(SELECT 1 FROM care_connections c LEFT JOIN care_staff s ON s.email=c.staff_email
   WHERE c.client_id=? AND c.staff_email=? AND c.active=1 AND c.scope='care'
    AND c.${nutrition?'nutrition_access':'medical_access'}<>0
    AND ((s.active=1 AND s.role=?) OR (s.email IS NULL AND ?=1 AND ?='clinician')))`,
  // Configured clinician fallback applies only when no explicit staff row exists.
  args:[clientId,user.email.toLowerCase(),role,isStaff(user,config.clinicianEmails)?1:0,role],
 };
}
