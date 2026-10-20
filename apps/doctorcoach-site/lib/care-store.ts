import {careConnectionGuard,combineCareGuards,staffRoleGuard} from './care-write-guard.ts';
import {healthConsentGuard,requireHealthConsent} from './consent-server.ts';
import {trainingAccess,noActiveWorkout} from './training-access.ts';
import {requireTrainingAllowed} from './safety-store.ts';
import {isStaff} from './staff.ts';
import type {StaffIdentity} from './staff.ts';
import {TrainingError} from './training.ts';
import {trainingStore} from './training-store.ts';
import {currentWeek,inputRecord,integerField,inviteHash,parseAssignedItems,parseProfile,textField,validEmail,validId} from './care.ts';
import type {CareBundle,CareCheckin,CareClient,CareNote,CareProfile,CareProgram,CareRole,CareStaff} from './care.ts';
export type CareConfig={adminEmails?:string;clinicianEmails?:string};
type ProfileRow={user_id:string;name:string;goal:string;experience:string;equipment:string;days:number;medical_json:string;version:number;updated_at:string};
const now=()=>new Date().toISOString();
export function careStore(db:D1Database,config:CareConfig={}){
  async function staffFor(email:string):Promise<CareStaff|null>{
    const normalized=email.toLowerCase();const row=await db.prepare('SELECT email,name,role,active FROM care_staff WHERE email=?').bind(normalized).first<CareStaff&{active:number}>();
    if(row)return row.active?{email:row.email,name:row.name,role:row.role}:null;
    if(isStaff({userId:'lookup',email:normalized},config.clinicianEmails))return {email:normalized,name:'ד״ר תמיר עילם',role:'clinician'};
    
    return null;
  }
  async function requireStaff(user:StaffIdentity|null):Promise<CareStaff>{if(!user)throw new TrainingError('יש להתחבר.',401);const staff=await staffFor(user.email);if(!staff)throw new TrainingError('הפעולה זמינה לצוות מורשה בלבד.',403);return staff;}
  async function authorize(user:StaffIdentity,clientId:string):Promise<{self:boolean;medical:boolean;nutrition:boolean;staff:CareStaff|null}>{
    if(user.userId===clientId)return {self:true,medical:true,nutrition:true,staff:null};
    const staff=await requireStaff(user);if(staff.role==='coordinator')throw new TrainingError('לתיאום תורים אין גישה לתיק הרפואי או לתוכניות.',403);const link=await db.prepare('SELECT id,medical_access,nutrition_access,scope FROM care_connections WHERE client_id=? AND staff_email=? AND active=1').bind(clientId,staff.email).first<{id:string;medical_access:number;nutrition_access:number;scope:string}>();
    if(!link||link.scope==='coordinator')throw new TrainingError('התיק אינו משויך לחשבון שלך.',403);
    return {self:false,medical:staff.role==='clinician'&&!!link.medical_access,nutrition:staff.role==='dietitian'&&!!link.nutrition_access,staff};
  }
  async function roster(){const result=await db.prepare('SELECT email,name,role,active FROM care_staff ORDER BY name').all<CareStaff&{active:number}>();const entries=new Map(result.results.map(r=>[r.email,r]));for(const email of [...(config.adminEmails??'').split(','),...(config.clinicianEmails??'').split(',')].map(e=>e.trim().toLowerCase()).filter(Boolean)){if(!entries.has(email)){const staff=await staffFor(email);if(staff)entries.set(email,{...staff,active:1});}}return [...entries.values()];}
async function previewInvite(user:StaffIdentity,payload:unknown){const p=inputRecord(payload);const hash=await inviteHash(p.code);const invite=await db.prepare('SELECT staff_json,expires_at,consumed_by FROM care_invites WHERE hash=?').bind(hash).first<{staff_json:string;expires_at:string;consumed_by:string|null}>();if(!invite||invite.expires_at<now()||(invite.consumed_by&&invite.consumed_by!==user.userId))throw new TrainingError('הקוד אינו זמין או שפג תוקפו. בקשו קוד חדש מהצוות.',404);const people=await Promise.all((JSON.parse(invite.staff_json) as CareStaff[]).map(async grant=>{const s=await staffFor(grant.email);if(s&&s.role!==grant.role&&(s.role==='coordinator'||grant.role==='coordinator'))throw new TrainingError('הרכב הצוות השתנה. בקשו הזמנה חדשה.',403);return s?{...s,role:(grant.role===s.role?s.role:'coach') as CareRole}:null;}));if(people.some(p=>!p))throw new TrainingError('הרכב הצוות השתנה. בקשו הזמנה חדשה.');return {hash,staff:people as CareStaff[],expiresAt:invite.expires_at};}
  async function bundle(user:StaffIdentity,clientId:string):Promise<CareBundle>{
    const access=await authorize(user,clientId);
    const activeProgram=(await trainingAccess(db,clientId)).programId;
    const [row,connections,notes,programs,checkins,training]=await Promise.all([
      db.prepare('SELECT * FROM care_profiles WHERE user_id=?').bind(clientId).first<ProfileRow>(),
      db.prepare('SELECT id,staff_email,medical_access,nutrition_access FROM care_connections WHERE client_id=? AND active=1').bind(clientId).all<{id:string;staff_email:string;medical_access:number;nutrition_access:number}>(),
      db.prepare(`SELECT id,author_name AS authorName,kind,content,shared,mention_email AS mentionEmail,created_at AS createdAt FROM care_notes WHERE client_id=? AND (kind='training' ${access.medical?"OR kind='medical'":''} ${access.nutrition?"OR kind='nutrition'":''}) ${access.self?'AND shared=1':''} ORDER BY created_at DESC LIMIT 100`).bind(clientId).all<Omit<CareNote,'shared'>&{shared:number}>(),
      db.prepare(`SELECT id,title,author_name AS authorName,items_json,created_at AS createdAt,applied_at AS appliedAt FROM care_programs WHERE client_id=? ${access.self?'AND id=?':''} ORDER BY CASE WHEN id=? THEN 0 ELSE 1 END,created_at DESC,id DESC LIMIT 20`).bind(clientId,...(access.self?[activeProgram??'']:[]),activeProgram??'').all<Omit<CareProgram,'items'>&{items_json:string}>(),
      db.prepare('SELECT id,week,sessions,pain,function_score AS functionScore,effort,content,response,reviewer,reviewed_at AS reviewedAt,created_at AS createdAt FROM care_checkins WHERE client_id=? ORDER BY week DESC LIMIT 26').bind(clientId).all<CareCheckin>(),
      trainingStore(db).feed(clientId),
    ]);
    const profile:CareProfile|null=row?{userId:row.user_id,name:row.name,goal:row.goal,experience:row.experience,equipment:row.equipment,days:row.days,version:row.version,updatedAt:row.updated_at,...(access.medical?{medical:JSON.parse(row.medical_json)}:{})}:null;
    const team=(await Promise.all(connections.results.map(async c=>{const s=await staffFor(c.staff_email);return s?{id:c.id,name:s.name,role:(s.role==='clinician'&&c.medical_access?'clinician':s.role==='dietitian'&&c.nutrition_access?'dietitian':s.role==='coordinator'?'coordinator':'coach') as CareRole}:null;}))).filter((s):s is NonNullable<typeof s>=>!!s);
    if(!access.self){
      const options={clientId,email:access.staff!.email,role:access.staff!.role};
      const guard=combineCareGuards(careConnectionGuard(options,config),...(access.medical?[careConnectionGuard({...options,grant:'medical_access'},config)]:[]),...(access.nutrition?[careConnectionGuard({...options,grant:'nutrition_access'},config)]:[]));
      const allowed=await db.prepare(`SELECT CASE WHEN ${guard.sql} THEN 1 ELSE 0 END allowed`).bind(...guard.args).first<{allowed:number}>();
      if(!allowed?.allowed)throw new TrainingError('הרשאות התיק השתנו בזמן הטעינה. רעננו לפני צפייה.',403);
    }
    return {activeProgramId:activeProgram,profile,connections:team,notes:notes.results.map(n=>({...n,shared:!!n.shared})),programs:programs.results.map(({items_json,...p})=>({...p,items:JSON.parse(items_json)})),checkins:checkins.results,training,canViewMedical:access.medical,canViewNutrition:access.nutrition,viewerRole:access.staff?.role??null,week:currentWeek()};
  }
  async function requireTeamRead(staff:CareStaff,clients:CareClient[]=[]){
    const guard=combineCareGuards(staffRoleGuard(staff.email,staff.role,config),{sql:"NOT EXISTS(SELECT 1 FROM json_each(?) captured WHERE NOT EXISTS(SELECT 1 FROM care_connections c WHERE c.client_id=captured.value AND c.staff_email=? AND c.active=1 AND c.scope='care'))",args:[JSON.stringify([...new Set(clients.map(c=>c.userId))]),staff.email]});
    const row=await db.prepare(`SELECT CASE WHEN ${guard.sql} THEN 1 ELSE 0 END AS allowed`).bind(...guard.args).first<{allowed:number}>();
    if(!row?.allowed)throw new TrainingError('הרשאות הצוות או שיוך המתאמנים השתנו בזמן הטעינה. רעננו לפני צפייה.',403);
  }
  async function clients(user:StaffIdentity):Promise<CareClient[]>{
    const staff=await requireStaff(user);
    if(staff.role==='coordinator'){await requireTeamRead(staff);return [];}
    const role=staffRoleGuard(staff.email,staff.role,config);
    const rows=await db.prepare(`SELECT p.user_id AS userId,p.name,p.goal,p.updated_at AS updatedAt,(SELECT COUNT(*) FROM care_checkins c WHERE c.client_id=p.user_id AND c.reviewed_at IS NULL) AS pendingCheckins,(SELECT COUNT(*) FROM media_assets m WHERE m.owner_id=p.user_id AND m.kind='review' AND m.status='ready' AND NOT EXISTS(SELECT 1 FROM media_feedback f WHERE f.asset_id=m.id)) AS pendingVideos FROM care_profiles p JOIN care_connections l ON l.client_id=p.user_id WHERE l.staff_email=? AND l.active=1 AND l.scope='care' AND ${role.sql} ORDER BY pendingCheckins+pendingVideos DESC,p.updated_at DESC`).bind(staff.email,...role.args).all<CareClient>();
    await requireTeamRead(staff,rows.results);
    return rows.results;
  }
  return {
    staffFor,requireStaff,authorize,bundle,
    async teamOverview(user:StaffIdentity){const me=await requireStaff(user);const people=await clients(user),staff=await roster();await requireTeamRead(me,people);return {me,clients:people,staff,canManage:isStaff(user,config.adminEmails)};},
    async roster(user:StaffIdentity){const me=await requireStaff(user),people=await roster();await requireTeamRead(me);return people;},
    async saveStaff(user:StaffIdentity,payload:unknown){if(!isStaff(user,config.adminEmails))throw new TrainingError('רק מנהל המערכת יכול לנהל הרשאות.',403);const p=inputRecord(payload);const email=validEmail(p.email);if(isStaff({userId:'lookup',email},config.clinicianEmails)||isStaff({userId:'lookup',email},config.adminEmails))throw new TrainingError('הרשאת חשבון הבעלים מנוהלת בהגדרות השרת.');const name=textField(p.name,'שם איש הצוות',100,2);if(!['coach','clinician','dietitian','coordinator'].includes(String(p.role))||typeof p.active!=='boolean')throw new TrainingError('יש לבחור תפקיד ומצב חשבון.');await db.prepare('INSERT INTO care_staff(email,name,role,active,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(email) DO UPDATE SET name=excluded.name,role=excluded.role,active=excluded.active,updated_at=excluded.updated_at').bind(email,name,p.role,p.active?1:0,now()).run();return roster();},
    async saveProfile(user:StaffIdentity,payload:unknown){const p=parseProfile(payload);const args=[p.name,p.goal,p.experience,p.equipment,p.days,JSON.stringify(p.medical),now()];const row=p.version===0?await db.prepare('INSERT INTO care_profiles(user_id,name,goal,experience,equipment,days,medical_json,updated_at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(user_id) DO NOTHING RETURNING user_id').bind(user.userId,...args).first():await db.prepare('UPDATE care_profiles SET name=?,goal=?,experience=?,equipment=?,days=?,medical_json=?,updated_at=?,version=version+1 WHERE user_id=? AND version=? RETURNING user_id').bind(...args,user.userId,p.version).first();if(!row)throw new TrainingError('השאלון עודכן בחלון אחר. טענו מחדש לפני שמירה.',409);return bundle(user,user.userId);},
    async createInvite(user:StaffIdentity,payload:unknown){
      const creator=await requireStaff(user),p=inputRecord(payload);
      if(!Array.isArray(p.emails)||!p.emails.length||p.emails.length>5)throw new TrainingError('בחרו 1–5 אנשי צוות.');
      const emails=[...new Set(p.emails.map(validEmail))];
      if(!emails.includes(creator.email))throw new TrainingError('ההזמנה חייבת לכלול את יוצר ההזמנה.');
      const people=await Promise.all(emails.map(staffFor));
      if(people.some(s=>!s))throw new TrainingError('אחד החשבונות אינו איש צוות פעיל.');
      const staff=people as CareStaff[],guard=combineCareGuards(...staff.map(s=>staffRoleGuard(s.email,s.role,config)));
      const code=crypto.randomUUID().replace(/-/g,'').toUpperCase(),at=now(),expiresAt=new Date(Date.now()+7*86400000).toISOString();
      const saved=await db.prepare(`INSERT INTO care_invites(hash,staff_json,created_by,expires_at,created_at) SELECT ?,?,?,?,? WHERE ${guard.sql} AND (SELECT COUNT(*) FROM care_invites WHERE created_by=? AND created_at>?)<20 RETURNING hash`)
      .bind(await inviteHash(code),JSON.stringify(staff),user.userId,expiresAt,at,...guard.args,user.userId,new Date(Date.now()-3600000).toISOString()).first();
      if(!saved){
        const allowed=await db.prepare(`SELECT CASE WHEN ${guard.sql} THEN 1 ELSE 0 END allowed`).bind(...guard.args).first<{allowed:number}>();
        if(!allowed?.allowed)throw new TrainingError('הרכב הצוות השתנה. צרו הזמנה חדשה.',403);
        throw new TrainingError('אפשר ליצור עד 20 הזמנות בשעה. נסו מאוחר יותר.',429);
      }
      return {code:code.match(/.{1,8}/g)!.join('-'),expiresAt};
    },
    previewInvite,
    async acceptInvite(user:StaffIdentity,payload:unknown){
      const p=inputRecord(payload);if(p.consent!==true)throw new TrainingError('יש לאשר שיתוף עם הצוות המוצג.');
      const invite=await previewInvite(user,p);await requireHealthConsent(db,user.userId);
      const stored=await db.prepare('SELECT staff_json,consumed_by FROM care_invites WHERE hash=?').bind(invite.hash).first<{staff_json:string;consumed_by:string|null}>();
      const original=JSON.parse(stored!.staff_json) as CareStaff[],staff=invite.staff;
      const current=await Promise.all(original.map(s=>staffFor(s.email)));
      if(current.some((s,i)=>!s||(original[i].role===s.role?s.role:'coach')!==staff[i]?.role))throw new TrainingError('הרכב הצוות השתנה. בקשו הזמנה חדשה.',403);
      const guard=combineCareGuards(...(current as CareStaff[]).map(s=>staffRoleGuard(s.email,s.role,config)),healthConsentGuard(user.userId),{sql:'EXISTS(SELECT 1 FROM care_profiles WHERE user_id=?)',args:[user.userId]});
      const at=now(),gate=`EXISTS(SELECT 1 FROM care_invites WHERE hash=? AND staff_json=? AND consumed_by IS NULL AND expires_at>?) AND ${guard.sql}`;
      const args=[invite.hash,stored!.staff_json,at,...guard.args];
      // Connections are written before consumption in one transaction. A consumed
      // invitation cannot restore a connection that its owner later revoked.
      await db.batch([
        ...staff.map(s=>db.prepare(`INSERT INTO care_connections(id,client_id,staff_email,medical_access,nutrition_access,created_at,scope) SELECT ?,?,?,?,?,?,? WHERE ${gate} ON CONFLICT(client_id,staff_email) DO UPDATE SET active=1,medical_access=excluded.medical_access,nutrition_access=excluded.nutrition_access,scope=excluded.scope`)
        .bind(crypto.randomUUID(),user.userId,s.email,s.role==='clinician'?1:0,s.role==='dietitian'?1:0,at,s.role==='coordinator'?'coordinator':'care',...args)),
        db.prepare(`UPDATE care_invites SET consumed_by=? WHERE hash=? AND staff_json=? AND consumed_by IS NULL AND expires_at>? AND ${guard.sql}`).bind(user.userId,...args),
      ]);
      const allowed=await db.prepare(`SELECT CASE WHEN ${guard.sql} THEN 1 ELSE 0 END allowed`).bind(...guard.args).first<{allowed:number}>();
      if(!allowed?.allowed)throw new TrainingError('הרשאות הצוות או ההסכמות השתנו. בקשו הזמנה חדשה.',403);
      const used=await db.prepare('SELECT consumed_by,expires_at FROM care_invites WHERE hash=?').bind(invite.hash).first<{consumed_by:string;expires_at:string}>();
      if(used?.consumed_by!==user.userId||used.expires_at<=at)throw new TrainingError('ההזמנה אינה זמינה עוד.',409);
      return bundle(user,user.userId);
    },
    async revoke(user:StaffIdentity,payload:unknown){const id=validId(inputRecord(payload).id);await db.prepare('UPDATE care_connections SET active=0 WHERE id=? AND client_id=?').bind(id,user.userId).run();return bundle(user,user.userId);},
    clients,
    async addNote(user:StaffIdentity,clientId:string,payload:unknown){
      const a=await authorize(user,clientId);
      if(a.self||!a.staff)throw new TrainingError('הערות מקצועיות נכתבות על ידי הצוות.',403);
      const p=inputRecord(payload);
      if(!['medical','training','nutrition'].includes(String(p.kind))||typeof p.shared!=='boolean')throw new TrainingError('פרטי ההערה אינם תקינים.');
      if(p.kind==='medical'&&!a.medical)throw new TrainingError('כתיבת הערה רפואית זמינה לרופא בלבד.',403);
      if(p.kind==='nutrition'&&!a.nutrition)throw new TrainingError('הערות תזונה זמינות לדיאטן המשויך בלבד.',403);
      await requireHealthConsent(db,clientId);
      const mention=p.mentionEmail?validEmail(p.mentionEmail):'',id=validId(p.id),content=textField(p.content,'הערה',4000,2);
      const options={clientId,...(p.kind==='medical'?{role:'clinician',grant:'medical_access' as const}:p.kind==='nutrition'?{role:'dietitian',grant:'nutrition_access' as const}:{})};
      const guard=combineCareGuards(careConnectionGuard({...options,email:a.staff.email},config),healthConsentGuard(clientId),...(mention?[careConnectionGuard({...options,email:mention},config)]:[]));
      const saved=await db.prepare(`INSERT INTO care_notes(id,client_id,author_id,author_name,kind,content,shared,mention_email,created_at) SELECT ?,?,?,?,?,?,?,?,? WHERE ${guard.sql} ON CONFLICT(id) DO NOTHING RETURNING id`).bind(id,clientId,user.userId,a.staff.name,p.kind,content,p.shared?1:0,mention,now(),...guard.args).first();
      if(!saved){
        const allowed=await db.prepare(`SELECT CASE WHEN ${guard.sql} THEN 1 ELSE 0 END AS allowed`).bind(...guard.args).first<{allowed:number}>();
        if(!allowed?.allowed)throw new TrainingError('הרשאות ההערה, הנמען או ההסכמות השתנו. רעננו לפני שמירה.',403);
        const previous=await db.prepare('SELECT client_id,author_id,kind,content,shared,mention_email FROM care_notes WHERE id=?').bind(id).first<{client_id:string;author_id:string;kind:string;content:string;shared:number;mention_email:string}>();
        if(!previous||previous.client_id!==clientId||previous.author_id!==user.userId||previous.kind!==p.kind||previous.content!==content||!!previous.shared!==p.shared||previous.mention_email!==mention)throw new TrainingError('מזהה ההערה כבר בשימוש.',409);
      }
    },
    async assign(user:StaffIdentity,clientId:string,payload:unknown){
      const a=await authorize(user,clientId);
      if(a.self||!a.staff||a.staff.role!=='coach')throw new TrainingError('שיוך תוכנית זמין למאמן המשויך בלבד.',403);
      await requireTrainingAllowed(db,clientId);
      const p=inputRecord(payload),id=validId(p.id),title=textField(p.title,'שם תוכנית',100,3);
      const items=JSON.stringify(parseAssignedItems(p.items)),email=a.staff.email;
      const revisionOf=p.revisionOf===undefined?null:validId(p.revisionOf);
      const draftVersion=p.draftVersion===undefined?null:integerField(p.draftVersion,'גרסת טיוטה',0,1000000);
      if(revisionOf===id)throw new TrainingError('עדכון תוכנית דורש מזהה חדש; הגרסה הקודמת נשמרת.');
      const existing=await db.prepare('SELECT client_id,author_email,title,items_json FROM care_programs WHERE id=?').bind(id).first<{client_id:string;author_email:string;title:string;items_json:string}>();
      if(existing){
        if(existing.client_id!==clientId||existing.author_email!==email||existing.title!==title||existing.items_json!==items)throw new TrainingError('מזהה התוכנית כבר בשימוש. רעננו לפני שליחה.',409);
        return; // Retrying an old request must not reactivate an older program.
      }
      await noActiveWorkout(db,clientId);
      if(revisionOf&&(await trainingAccess(db,clientId)).programId!==revisionOf)throw new TrainingError('התוכנית הפעילה השתנתה מאז תחילת העריכה. רעננו וטענו את הגרסה העדכנית.',409);
      const at=now();
      // Recheck scope and safety inside the atomic batch, not only before it.
      const gate=`EXISTS(SELECT 1 FROM care_connections c JOIN care_staff s ON s.email=c.staff_email WHERE c.client_id=? AND c.staff_email=? AND c.active=1 AND c.scope='care' AND s.active=1 AND s.role='coach')
        AND NOT EXISTS(SELECT 1 FROM training_sessions WHERE owner_id=? AND status='active')
        AND NOT EXISTS(SELECT 1 FROM medical_reviews WHERE client_id=? AND state IN ('pending','in_review'))
        AND EXISTS(SELECT 1 FROM user_intakes WHERE user_id=? AND completed=1)`;
      const scope=[clientId,email,clientId,clientId,clientId];
      const revisionGate=revisionOf?` AND EXISTS(SELECT 1 FROM training_access WHERE user_id=? AND mode='coached' AND program_id=?)`:'';
      const revisionScope=revisionOf?[clientId,revisionOf]:[];
      await db.batch([
        db.prepare(`INSERT INTO care_programs(id,client_id,author_name,author_email,title,items_json,created_at,applied_at)
          SELECT ?,?,?,?,?,?,?,? WHERE ${gate}${revisionGate} ON CONFLICT(id) DO NOTHING`)
          .bind(id,clientId,a.staff.name,email,title,items,at,at,...scope,...revisionScope),
        db.prepare(`INSERT INTO training_access(user_id,mode,program_id,updated_at)
          SELECT client_id,'coached',id,? FROM care_programs WHERE id=? AND client_id=? AND author_email=? AND title=? AND items_json=? AND ${gate}${revisionGate}
          ON CONFLICT(user_id) DO UPDATE SET mode='coached',program_id=excluded.program_id,updated_at=excluded.updated_at`)
          .bind(at,id,clientId,email,title,items,...scope,...revisionScope),
        db.prepare(`INSERT INTO audit_events(id,actor_id,subject_id,action,created_at)
          SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM training_access WHERE user_id=? AND mode='coached' AND program_id=?) AND ${gate}
          ON CONFLICT(id) DO NOTHING`)
          .bind('program-assigned:'+id,user.userId,clientId,'coach_program_assigned',at,clientId,id,...scope),
        ...(draftVersion===null?[]:[db.prepare(`UPDATE coach_program_drafts SET payload_json=NULL,version=version+1,updated_at=? WHERE coach_id=? AND client_id=? AND version=? AND EXISTS(SELECT 1 FROM training_access WHERE user_id=? AND program_id=? AND mode='coached')`).bind(at,user.userId,clientId,draftVersion,clientId,id)]),
      ]);
      if((await trainingAccess(db,clientId)).programId!==id)throw new TrainingError('השיוך לא הושלם: ההרשאות או מצב האימון השתנו. רעננו ונסו שוב.',409);
    },
    async applyProgram(_user:StaffIdentity,_payload:unknown){
      throw new TrainingError('רק המאמן המשויך יכול להקצות תוכנית פעילה. אין בחירה עצמאית של תוכנית ליווי.',403);
    },
    async checkin(user:StaffIdentity,payload:unknown){
      const p=inputRecord(payload);
      if(!await db.prepare('SELECT user_id FROM care_profiles WHERE user_id=?').bind(user.userId).first())throw new TrainingError('מלאו קודם שאלון פתיחה.');
      await requireHealthConsent(db,user.userId);
      const id=validId(p.id),week=currentWeek(),fields=[integerField(p.sessions,'אימונים',0,30),integerField(p.pain,'כאב',0,10),integerField(p.functionScore,'תפקוד',0,10),integerField(p.effort,'מאמץ',0,10),textField(p.content,'דיווח',2000)];
      const guard=combineCareGuards(healthConsentGuard(user.userId),{sql:'EXISTS(SELECT 1 FROM care_profiles WHERE user_id=?)',args:[user.userId]});
      const row=await db.prepare(`INSERT INTO care_checkins(id,client_id,week,sessions,pain,function_score,effort,content,created_at) SELECT ?,?,?,?,?,?,?,?,? WHERE ${guard.sql} ON CONFLICT DO NOTHING RETURNING id`).bind(id,user.userId,week,...fields,now(),...guard.args).first();
      if(!row){
        const allowed=await db.prepare(`SELECT CASE WHEN ${guard.sql} THEN 1 ELSE 0 END AS allowed`).bind(...guard.args).first<{allowed:number}>();
        if(!allowed?.allowed)throw new TrainingError('הפרופיל או ההסכמות השתנו. רעננו לפני שמירת הדיווח.',403);
        const existing=await db.prepare('SELECT id,sessions,pain,function_score,effort,content FROM care_checkins WHERE client_id=? AND week=?').bind(user.userId,week).first<{id:string;sessions:number;pain:number;function_score:number;effort:number;content:string}>();
        if(!existing||existing.id!==id||[existing.sessions,existing.pain,existing.function_score,existing.effort,existing.content].some((v,i)=>v!==fields[i]))throw new TrainingError('כבר נשלח דיווח לשבוע הנוכחי או שמזהה הדיווח בשימוש.',409);
      }
    },
    async reviewCheckin(user:StaffIdentity,clientId:string,payload:unknown){
      const a=await authorize(user,clientId);
      if(a.self||!a.staff)throw new TrainingError('מענה זמין לצוות המטפל.',403);
      await requireHealthConsent(db,clientId);
      const p=inputRecord(payload),id=validId(p.id),response=textField(p.response,'משוב',2000,2);
      const guard=combineCareGuards(careConnectionGuard({clientId,email:a.staff.email,role:a.staff.role},config),healthConsentGuard(clientId));
      const row=await db.prepare(`UPDATE care_checkins SET response=?,reviewer=?,reviewed_at=? WHERE id=? AND client_id=? AND reviewed_at IS NULL AND ${guard.sql} RETURNING id`).bind(response,a.staff.name,now(),id,clientId,...guard.args).first();
      if(!row){
        const allowed=await db.prepare(`SELECT CASE WHEN ${guard.sql} THEN 1 ELSE 0 END AS allowed`).bind(...guard.args).first<{allowed:number}>();
        if(!allowed?.allowed)throw new TrainingError('הרשאות הצוות או ההסכמות השתנו. רעננו לפני שמירת המשוב.',403);
        throw new TrainingError('הדיווח כבר קיבל מענה או שאינו זמין. טענו מחדש.',409);
      }
    },
  };
}
