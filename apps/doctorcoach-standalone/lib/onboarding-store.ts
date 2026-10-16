import {requestAccount} from './account-requests.ts';
import {careStore} from './care-store.ts';
import type {CareConfig} from './care-store.ts';
import type {StaffIdentity} from './staff.ts';
import {isStaff} from './staff.ts';
import {careConnectionGuard,combineCareGuards} from './care-write-guard.ts';
import {healthConsentGuard,requireHealthConsent} from './consent-server.ts';
import {inputRecord,integerField,textField,validId,validEmail} from './care.ts';
import {TrainingError} from './training.ts';
import {activeFlags,asText,CONSENT_REVISION,consents,parseAnswers,parseConsents,urgency} from './intake.ts';
import type {Answers,ConsentState,Intake,OnboardingData,Review} from './intake.ts';
const now=()=>new Date().toISOString();
export const reviewColumns='id,client_id AS clientId,flags_json,urgency,state,response,reviewer,version,created_at AS createdAt,updated_at AS updatedAt';
export function reviewDto(row:Omit<Review,'flags'>&{flags_json:string}):Review{const {flags_json,...rest}=row;return {...rest,flags:JSON.parse(flags_json)};}
export function onboardingStore(db:D1Database,config:CareConfig={}){
 const care=careStore(db,config);
 const audit=(actor:string,subject:string,action:string)=>db.prepare('INSERT INTO audit_events(id,actor_id,subject_id,action,created_at) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),actor,subject,action,now());
 async function consentState(userId:string){const rows=await db.prepare('SELECT consent_id,accepted,revision FROM user_consents WHERE user_id=? ORDER BY created_at DESC,rowid DESC').bind(userId).all<{consent_id:string;accepted:number;revision:string}>();const result:ConsentState={};for(const row of rows.results)if(!(row.consent_id in result))result[row.consent_id]=row.revision===CONSENT_REVISION&&!!row.accepted;return result;}
 async function team(){const rows=await db.prepare('SELECT email,name,role FROM care_staff WHERE active=1 AND role IN (\'clinician\',\'coach\',\'dietitian\',\'coordinator\') ORDER BY name').all<{email:string;name:string;role:string}>();const result=new Map(rows.results.map(r=>[r.email,r]));for(const email of (config.clinicianEmails??'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean)){const s=await care.staffFor(email);if(s)result.set(s.email,s);}return [...result.values()];}
 async function get(user:StaffIdentity):Promise<OnboardingData>{
 const [r,c,reviews,staff,people]=await Promise.all([db.prepare('SELECT * FROM user_intakes WHERE user_id=?').bind(user.userId).first<{answers_json:string;completed:number;tour_completed:number;version:number;updated_at:string}>(),consentState(user.userId),db.prepare(`SELECT ${reviewColumns} FROM medical_reviews WHERE client_id=? ORDER BY created_at DESC LIMIT 20`).bind(user.userId).all<Omit<Review,'flags'>&{flags_json:string}>(),care.staffFor(user.email),team()]);
 return {intake:r?{answers:JSON.parse(r.answers_json),completed:!!r.completed,tourCompleted:!!r.tour_completed,version:r.version,updatedAt:r.updated_at}:null,consents:c,consentRevision:CONSENT_REVISION,reviews:reviews.results.map(reviewDto),staffRole:staff?.role??null,canAdmin:isStaff(user,config.adminEmails),team:people,trainingBlocked:reviews.results.some(r=>['pending','in_review'].includes(r.state))};
 }
 return {get,team,consentState,
 async save(user:StaffIdentity,payload:unknown){
 const p=inputRecord(payload);const version=integerField(p.version,'גרסה',0,1000000);const complete=p.complete===true;
 const answers=parseAnswers(p.answers,complete);const selections=parseConsents(p.consents);if(p.consentRevision!==CONSENT_REVISION)throw new TrainingError('נוסח ההסכמות התעדכן. רעננו וקראו אותו לפני שמירה.',409);
 if(!answers.current_injury||!Array.isArray(answers.red_flags)||!answers.red_flags.length||asText(answers.name).length<2)throw new TrainingError('מלאו שם, מצב פציעה וסקר סימני אזהרה.');
 const people=await team();if(!Array.isArray(p.teamEmails))throw new TrainingError('יש לאשר את הרכב הצוות.');const allowed=p.teamEmails.map(validEmail);if(allowed.some(e=>!people.some(s=>s.email===e)))throw new TrainingError('הרכב הצוות השתנה. רעננו לפני אישור.',409);
 if(version===0||p.shareTeam===true){if(!Array.isArray(p.teamGrants)||p.teamGrants.length!==allowed.length||p.teamGrants.some(g=>!g||typeof g!=='object'||!('email' in g)||!('role' in g)||!allowed.includes(String(g.email))||!people.some(s=>s.email===g.email&&s.role===g.role)))throw new TrainingError('תפקידי הצוות התעדכנו. רעננו כדי לאשר את ההרשאות המוצגות.',409);}
 const [previousConsents,open]=await Promise.all([consentState(user.userId),db.prepare("SELECT id,flags_json,urgency FROM medical_reviews WHERE client_id=? AND state IN ('pending','in_review')").bind(user.userId).first<{id:string;flags_json:string;urgency:string}>()]);
 const at=now();const json=JSON.stringify(answers);const gate='EXISTS(SELECT 1 FROM user_intakes WHERE user_id=? AND version=? AND updated_at=? AND answers_json=?)';const bindGate=[user.userId,version+1,at,json];
 const first=version===0?db.prepare('INSERT INTO user_intakes(user_id,answers_json,completed,created_at,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(user_id) DO NOTHING').bind(user.userId,json,complete?1:0,at,at):db.prepare('UPDATE user_intakes SET answers_json=?,completed=MAX(completed,?),version=version+1,updated_at=? WHERE user_id=? AND version=?').bind(json,complete?1:0,at,user.userId,version);
 const statements=[first];
 for(const consent of consents)if(previousConsents[consent.id]!==selections[consent.id])statements.push(db.prepare(`INSERT INTO user_consents(id,user_id,consent_id,revision,accepted,created_at) SELECT ?,?,?,?,?,? WHERE ${gate}`).bind(crypto.randomUUID(),user.userId,consent.id,CONSENT_REVISION,selections[consent.id]?1:0,at,...bindGate));
 const goal=asText(answers.specific_goals)||asText(answers.goals)||'היכרות עם DoctorCoach';const freq:Record<string,number>={'כרגע לא מתאמן/ת':0,'1–2':2,'3–4':3,'5–6':5,'7+':7};
 const medical=JSON.stringify({painAreas:asText(answers.body_region),injuryHistory:asText(answers.prior_injuries),medicalHistory:asText(answers.medical_history)});
 statements.push(db.prepare(`INSERT INTO care_profiles(user_id,name,goal,experience,equipment,days,medical_json,updated_at) SELECT ?,?,?,?,?,?,?,? WHERE ${gate} ON CONFLICT(user_id) DO UPDATE SET name=excluded.name,goal=excluded.goal,experience=excluded.experience,equipment=excluded.equipment,days=excluded.days,medical_json=excluded.medical_json,version=care_profiles.version+1,updated_at=excluded.updated_at`).bind(user.userId,asText(answers.name),goal,asText(answers.experience),asText(answers.equipment),freq[asText(answers.training_frequency)]??0,medical,at,...bindGate));
 // Only the first consent or an explicit team update grants access; ordinary profile edits cannot undo revocation.
 if(version===0||p.shareTeam===true)for(const s of people.filter(s=>allowed.includes(s.email)))statements.push(db.prepare(`INSERT INTO care_connections(id,client_id,staff_email,medical_access,nutrition_access,created_at,scope) SELECT ?,?,?,?,?,?,? WHERE ${gate} ON CONFLICT(client_id,staff_email) DO UPDATE SET active=1,medical_access=excluded.medical_access,nutrition_access=excluded.nutrition_access,scope=excluded.scope`).bind(crypto.randomUUID(),user.userId,s.email,s.role==='clinician'?1:0,s.role==='dietitian'?1:0,at,s.role==='coordinator'?'coordinator':'care',...bindGate));
 if(p.shareTeam===true){for(const s of people.filter(s=>!allowed.includes(s.email)))statements.push(db.prepare(`UPDATE care_connections SET active=0 WHERE client_id=? AND staff_email=? AND ${gate}`).bind(user.userId,s.email,...bindGate));}
 const flags=activeFlags(answers);if(flags.length){const merged=[...new Set([...flags,...(open?JSON.parse(open.flags_json):[])])];const u=urgency({...answers,red_flags:merged});if(open)statements.push(db.prepare(`UPDATE medical_reviews SET flags_json=?,urgency=?,version=version+1,updated_at=? WHERE id=? AND state IN ('pending','in_review') AND ${gate}`).bind(JSON.stringify(merged),u,at,open.id,...bindGate));else statements.push(db.prepare(`INSERT INTO medical_reviews(id,client_id,flags_json,urgency,created_at,updated_at) SELECT ?,?,?,?,?,? WHERE ${gate} AND NOT EXISTS(SELECT 1 FROM medical_reviews WHERE client_id=? AND state IN ('pending','in_review'))`).bind(crypto.randomUUID(),user.userId,JSON.stringify(flags),u,at,at,...bindGate,user.userId));}
 statements.push(db.prepare(`INSERT INTO audit_events(id,actor_id,subject_id,action,created_at) SELECT ?,?,?,?,? WHERE ${gate}`).bind(crypto.randomUUID(),user.userId,user.userId,complete?'intake_complete':'intake_save',at,...bindGate));
 const results=await db.batch(statements);const changed=results[0]?.meta?.changes??(results[0] as unknown as {changes?:number})?.changes;
 if(!changed)throw new TrainingError('השאלון עודכן בחלון אחר. רעננו כדי להמשיך מהגרסה השמורה.',409);
 return get(user);
 },
 async tour(user:StaffIdentity){await db.prepare('UPDATE user_intakes SET tour_completed=1 WHERE user_id=? AND completed=1').bind(user.userId).run();return get(user);},
 async optionalConsent(user:StaffIdentity,payload:unknown){const p=inputRecord(payload);if(!['media','notifications','push'].includes(String(p.id))||typeof p.accepted!=='boolean')throw new TrainingError('העדפה לא תקינה.');await db.batch([db.prepare('INSERT INTO user_consents(id,user_id,consent_id,revision,accepted,created_at) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),user.userId,p.id,CONSENT_REVISION,p.accepted?1:0,now()),audit(user.userId,user.userId,'consent_update')]);return get(user);},
 async review(user:StaffIdentity,payload:unknown){
 const p=inputRecord(payload);const id=validId(p.id);
 const r=await db.prepare('SELECT client_id FROM medical_reviews WHERE id=?').bind(id).first<{client_id:string}>();
 if(!r)throw new TrainingError('הבקשה לא נמצאה.',404);
 const a=await care.authorize(user,r.client_id);
 if(!a.medical||a.self||a.staff?.role!=='clinician')throw new TrainingError('עדכון בדיקה רפואית זמין לרופא המשויך בלבד.',403);
 await requireHealthConsent(db,r.client_id);
 if(!['in_review','cleared'].includes(String(p.state)))throw new TrainingError('סטטוס בדיקה לא תקין.');
 const response=textField(p.response,'הנחיה למתאמן',2500,3);
 const version=integerField(p.version,'גרסה',1,1000000),at=now(),auditId=crypto.randomUUID();
 const guard=combineCareGuards(careConnectionGuard({clientId:r.client_id,email:user.email,role:'clinician',grant:'medical_access'},config),healthConsentGuard(r.client_id));
 // D1 batch is transactional: the unique audit receipt authorizes this update,
 // and either both statements commit or neither does. No result-meta dependency.
 await db.batch([
 db.prepare(`INSERT INTO audit_events(id,actor_id,subject_id,action,created_at)
 SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM medical_reviews WHERE id=? AND client_id=? AND version=? AND state IN ('pending','in_review')) AND ${guard.sql}`)
 .bind(auditId,user.userId,r.client_id,'medical_review_'+p.state,at,id,r.client_id,version,...guard.args),
 db.prepare("UPDATE medical_reviews SET state=?,response=?,reviewer=?,version=version+1,updated_at=? WHERE id=? AND client_id=? AND version=? AND state IN ('pending','in_review') AND EXISTS(SELECT 1 FROM audit_events WHERE id=?)")
 .bind(p.state,response,a.staff.name,at,id,r.client_id,version,auditId),
 ]);
 const receipt=await db.prepare('SELECT id FROM audit_events WHERE id=?').bind(auditId).first();
 if(!receipt){
 const allowed=await db.prepare(`SELECT CASE WHEN ${guard.sql} THEN 1 ELSE 0 END AS allowed`).bind(...guard.args).first<{allowed:number}>();
 if(!allowed?.allowed)throw new TrainingError('ההרשאה או ההסכמות השתנו. רעננו לפני עדכון הבדיקה.',403);
 throw new TrainingError('הבדיקה כבר עודכנה. רעננו.',409);
 }
 return {ok:true};
 },
 requestAccount:(user:StaffIdentity,payload:unknown)=>requestAccount(db,user,payload),
 async requests(user:StaffIdentity){return (await db.prepare('SELECT id,kind,state,created_at AS createdAt,requester_email IS NOT NULL AS identityVerified FROM account_requests WHERE user_id=? ORDER BY created_at DESC').bind(user.userId).all()).results;},
 async export(user:StaffIdentity){const data:Record<string,unknown>={exportedAt:now(),onboarding:await get(user),care:await care.bundle(user,user.userId)};data.membership=(await db.prepare('SELECT id,price_agorot,state,reference,starts_at,ends_at,created_at FROM membership_orders WHERE user_id=? ORDER BY created_at').bind(user.userId).all()).results;data.pilot=(await db.prepare('SELECT starts_at,ends_at FROM pilot_redemptions WHERE user_id=? ORDER BY starts_at').bind(user.userId).all()).results;data.trainingAccess=await db.prepare('SELECT mode,program_id,self_until FROM training_access WHERE user_id=?').bind(user.userId).first();
 for(const [key,table,col] of [['workoutReviewsReceived','staff_workout_reviews','client_id'],['workoutReviewsPerformed','staff_workout_reviews','staff_id'],['coachBillingMembership','coach_billing_seats','client_id'],['coachMembershipHistory','workspace_client_events','client_id'],['staffPersonalAccess','staff_personal_access','user_id'],['programSplit','self_program_splits','owner_id'],['programTemplates','coach_program_templates','owner_id'],['workspaceMessages','workspace_messages','client_id'],['workspaceMessageReads','workspace_chat_reads','client_id'],['coachWorkspace','coach_workspaces','owner_id'],['workspaceMemberships','workspace_clients','client_id'],['workspacePrograms','workspace_programs','client_id'],['importExerciseMappings','import_exercise_mappings','owner_id'],['customExercises','custom_exercises','owner_id'],['returnPlanHistory','return_plan_revisions','client_id'],['wellness','wellness_records','client_id'],['appointments','care_appointments','client_id'],['messages','team_messages','client_id'],['consentHistory','user_consents','user_id'],['favorites','exercise_favorites','owner_id'],['feedback','trainee_feedback','owner_id'],['media','media_assets','owner_id'],['passportDetails','passport_details','client_id'],['documents','private_documents','client_id'],['weeklyGoals','weekly_goals','client_id'],['workoutPreferences','workout_preferences','user_id'],['progressLayout','progress_layouts','user_id'],['notificationPreferences','notification_preferences','user_id'],['notificationDismissals','notification_dismissals','user_id']] as const){const rows=await db.prepare(`SELECT * FROM ${table} WHERE ${col}=?`).bind(user.userId).all<Record<string,unknown>>();data[key]=rows.results.map(row=>{const safe={...row};delete safe.object_key;return safe;});}data.coachMonthlyCharges=(await db.prepare('SELECT c.month,c.boundary_at,c.client_count,c.rate_agorot,c.amount_agorot,c.state,c.attempts,c.created_at,c.updated_at FROM coach_monthly_charges c JOIN coach_workspaces w ON w.id=c.workspace_id WHERE w.owner_id=?').bind(user.userId).all()).results;data.coachPaymentAuthorization=(await db.prepare('SELECT m.provider,m.state,m.updated_at FROM coach_payment_mandates m JOIN coach_workspaces w ON w.id=m.workspace_id WHERE w.owner_id=?').bind(user.userId).all()).results;data.teamTaskMetadata=(await db.prepare('SELECT id,channel,state,due_day,created_at,updated_at FROM care_tasks WHERE client_id=?').bind(user.userId).all()).results;data.documentLifecycle=(await db.prepare('SELECT l.document_id,l.version,l.delete_status,l.requested_at,l.reviewed_at,l.updated_at FROM document_lifecycle l JOIN private_documents d ON d.id=l.document_id WHERE d.client_id=?').bind(user.userId).all()).results;data.messageLinks=(await db.prepare('SELECT l.* FROM message_links l JOIN team_messages m ON m.id=l.message_id WHERE m.client_id=?').bind(user.userId).all()).results;data.nutritionCredential=(await db.prepare('SELECT email,qualification,reference,issuer,active,verified_at,version FROM nutrition_credentials WHERE email=?').bind(user.email.toLowerCase()).all()).results;await audit(user.userId,user.userId,'account_export').run();return data;},
 };
}
