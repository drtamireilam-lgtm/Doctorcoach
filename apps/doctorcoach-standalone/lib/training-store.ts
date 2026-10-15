import {selfTrainingGuard} from './staff-personal-access.ts';
import {selfDayId} from './program-split.ts';
import {programSplitStore} from './program-split-store.ts';
import {workspaceProgramId,workspaceAssignmentGuard} from './coach-workspace-guard.ts';
import {availableCustomExercises} from './custom-exercises.ts';
import {customId,customPrescription} from './custom-exercise-types.ts';
import {programAuthorGuard,type ProgramAuthorConfig} from './program-author.ts';
import {todayIsrael} from './wellness.ts';
import {followupDay} from './workout-context.ts';
import {healthConsentGuard,requireHealthConsent} from './consent-server.ts';
import {combineCareGuards} from './care-write-guard.ts';
import {trainingAccess,requireSelfAccess,allowedPlan,assignedPlan} from './training-access.ts';
import {selectWorkoutDay} from './workout-days.ts';
import {trainingWriteGuard} from './training-write-guard.ts';
import {nextSetLoad} from './set-load.ts';
import {requireTrainingAllowed} from './safety-store.ts';
import { exercises, templates } from './content.ts';
import { completion, defaultPrescription, isRecord, isScore, parsePlanItem, TrainingError, updateSet, parseRpe, targetRpeForSet } from './training.ts';
import type { PlanItem, SessionExercise, TrainingFeed, TrainingSession } from './training.ts';

type Row = { readiness_json:string|null; followup_json:string|null; plan_mode:'legacy'|'self'|'coached'; program_id:string|null; id: string; status: TrainingSession['status']; items_json: string; started_at: string; finished_at: string | null; pain_before: number; pain_after: number | null; planned_sets: number; completed_sets: number; version: number };
const selectPlan = 'SELECT day_id AS dayId,exercise_id AS exerciseId, sets, reps, unit, weight, notes, target_rpe AS targetRpe, effort_scale AS effortScale, target_rpes_json AS targetRpesJson, workout_section AS workoutSection,tempo_json AS tempoJson,reps_max AS repsMax,weight_unspecified AS weightUnspecified,custom_exercise_json AS customExerciseJson FROM program_items WHERE owner_id = ? ORDER BY id';
const byId = new Map(exercises.map(exercise => [exercise.id, exercise]));
const toSession = (row: Row): TrainingSession => ({ readiness:row.readiness_json?JSON.parse(row.readiness_json):null,followup:row.followup_json?JSON.parse(row.followup_json):null,id: row.id, planMode:row.plan_mode,programId:row.program_id, status: row.status, items: JSON.parse(row.items_json) as SessionExercise[], startedAt: row.started_at, finishedAt: row.finished_at, before: row.pain_before, after: row.pain_after, plannedSets: row.planned_sets, completedSets: row.completed_sets, version: row.version });

export function trainingStore(db: D1Database,config:ProgramAuthorConfig={}) {
  async function getPlan(owner: string): Promise<PlanItem[]> {
    const prescribed=await allowedPlan(db,owner,config);if(prescribed!==null)return prescribed;
    return (await db.prepare(selectPlan).bind(owner).all<Omit<PlanItem,'weightUnspecified'>&{targetRpesJson:string|null;tempoJson:string|null;weightUnspecified:number;customExerciseJson:string|null;dayId:string}>()).results.map(({targetRpesJson,tempoJson,weightUnspecified,repsMax,customExerciseJson,dayId,...item})=>({...item,...(dayId!=='1'?{dayId}:{}),...(customExerciseJson?{customExercise:JSON.parse(customExerciseJson)}:{}),...(repsMax==null?{}:{repsMax}),...(weightUnspecified?{weightUnspecified:true}:{}),...(targetRpesJson?{targetRpes:JSON.parse(targetRpesJson)}:{}),...(tempoJson?{tempo:JSON.parse(tempoJson)}:{})}));
  }
  async function getSession(owner: string, id: string): Promise<TrainingSession | null> {
    const row = await db.prepare('SELECT * FROM training_sessions WHERE id = ? AND owner_id = ?').bind(id, owner).first<Row>();
    return row ? toSession(row) : null;
  }
  const planGuard=(owner:string)=>combineCareGuards(trainingWriteGuard(owner,{planMode:'self',programId:null},config),healthConsentGuard(owner));
  const removeGuard=(owner:string)=>selfTrainingGuard(owner,config);
  async function requirePlanGuard(guard:{sql:string;args:(string|number)[]},owner?:string){const allowed=await db.prepare(`SELECT CASE WHEN ${guard.sql} THEN 1 ELSE 0 END AS allowed`).bind(...guard.args).first<{allowed:number}>();if(!allowed?.allowed){if(owner)await requireHealthConsent(db,owner);throw new TrainingError('הרשאות התוכנית או המצב הרפואי השתנו. רעננו לפני עריכה.',403);}}
  return {
    getPlan,
    async savePlan(owner: string, payload: unknown) {
    await requireTrainingAllowed(db,owner);
      await requireSelfAccess(db,owner,config);
      await requireHealthConsent(db,owner);
      if (!isRecord(payload) || typeof payload.exerciseId !== 'string') throw new TrainingError('תרגיל לא מוכר.');
      const custom=(await availableCustomExercises(db,owner)).find(e=>e.id===payload.exerciseId);if(!byId.has(payload.exerciseId)&&!custom)throw new TrainingError('תרגיל לא מוכר.');
      const ownerItems=await getPlan(owner),matching=ownerItems.filter(i=>i.exerciseId===payload.exerciseId);if(payload.dayId===undefined&&matching.length>1)throw new TrainingError('בחרו את האימון של התרגיל לפני עריכה.');const dayId=selfDayId(payload.dayId??matching[0]?.dayId);const split=await programSplitStore(db).get(owner);if(split&&!split.days.some(d=>d.id===dayId))throw new TrainingError('יום האימון אינו קיים בחלוקה שנבחרה.');
      const old = ownerItems.find(item => item.exerciseId === payload.exerciseId&&(item.dayId??'1')===dayId);
      const parsed = parsePlanItem(payload, custom?{...(old??customPrescription(custom)),customExercise:custom}:old);const item={...parsed,...(dayId!=='1'?{dayId}:{})};
      const guard=combineCareGuards(planGuard(owner),{sql:"(EXISTS(SELECT 1 FROM self_program_splits l,json_each(l.payload_json,'$.days') d WHERE l.owner_id=? AND json_extract(d.value,'$.id')=?) OR (? IN ('1','2','3','4','5','6','7') AND NOT EXISTS(SELECT 1 FROM self_program_splits WHERE owner_id=?)))",args:[owner,dayId,dayId,owner]});
      const saved=await db.prepare(`INSERT INTO program_items (owner_id, exercise_id, sets, reps, unit, weight, notes, target_rpe, effort_scale, target_rpes_json,workout_section,tempo_json,reps_max,weight_unspecified,custom_exercise_json,day_id) SELECT ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,? WHERE ${guard.sql} ON CONFLICT(owner_id, exercise_id,day_id) DO UPDATE SET sets = excluded.sets, reps = excluded.reps, unit = excluded.unit, weight = excluded.weight, notes = excluded.notes, target_rpe = excluded.target_rpe, effort_scale = excluded.effort_scale,target_rpes_json=excluded.target_rpes_json,workout_section=excluded.workout_section,tempo_json=excluded.tempo_json,reps_max=excluded.reps_max,weight_unspecified=excluded.weight_unspecified,custom_exercise_json=excluded.custom_exercise_json RETURNING exercise_id`)
        .bind(owner, item.exerciseId, item.sets, item.reps, item.unit, item.weight, item.notes, item.targetRpe??null,item.effortScale??'rpe',item.targetRpes?JSON.stringify(item.targetRpes):null,item.workoutSection??'main',item.tempo?JSON.stringify(item.tempo):null,item.repsMax??null,item.weightUnspecified?1:0,item.customExercise?JSON.stringify(item.customExercise):null,dayId,...guard.args).first();
      if(!saved)await requirePlanGuard(guard,owner);
      return item;
    },
    async removePlan(owner: string, payload: unknown) {
      await requireSelfAccess(db,owner,config);
      if (!isRecord(payload) || typeof payload.exerciseId !== 'string' || !byId.has(payload.exerciseId)&&!customId(payload.exerciseId)) throw new TrainingError('תרגיל לא מוכר.');
      const matching=(await getPlan(owner)).filter(i=>i.exerciseId===payload.exerciseId);if(payload.dayId===undefined&&matching.length>1)throw new TrainingError('בחרו את האימון של התרגיל לפני הסרה.');const dayId=selfDayId(payload.dayId??matching[0]?.dayId);const guard=removeGuard(owner);
      const removed=await db.prepare(`DELETE FROM program_items WHERE owner_id = ? AND exercise_id = ? AND day_id=? AND ${guard.sql} RETURNING exercise_id`).bind(owner,payload.exerciseId,dayId,...guard.args).first();
      if(!removed)await requirePlanGuard(guard);
    },
    async addTemplate(owner: string, payload: unknown) {
    await requireTrainingAllowed(db,owner);
      await requireSelfAccess(db,owner,config);
      await requireHealthConsent(db,owner);
      if (!isRecord(payload)) throw new TrainingError('בקשה לא תקינה.');
      const template = templates.find(t => t.id === payload.templateId);
      if (!template) throw new TrainingError('תוכנית לדוגמה לא נמצאה.');
      const dayId=selfDayId(payload.dayId),split=await programSplitStore(db).get(owner);if(split&&!split.days.some(d=>d.id===dayId))throw new TrainingError('יום האימון אינו קיים בחלוקה שנבחרה.');const guard=combineCareGuards(planGuard(owner),{sql:"(EXISTS(SELECT 1 FROM self_program_splits l,json_each(l.payload_json,'$.days') d WHERE l.owner_id=? AND json_extract(d.value,'$.id')=?) OR (? IN ('1','2','3','4','5','6','7') AND NOT EXISTS(SELECT 1 FROM self_program_splits WHERE owner_id=?)))",args:[owner,dayId,dayId,owner]});
      await db.batch(template.ids.map(id => {
        const item = defaultPrescription(id);
        return db.prepare(`INSERT INTO program_items (owner_id, exercise_id, sets, reps, unit, weight, notes,day_id) SELECT ?,?,?,?,?,0,?,? WHERE ${guard.sql} ON CONFLICT(owner_id, exercise_id,day_id) DO NOTHING`)
          .bind(owner, id, item.sets, item.reps, item.unit, '',dayId,...guard.args);
      }));
      await requirePlanGuard(guard,owner);
      return getPlan(owner);
    },
    async feed(owner: string): Promise<TrainingFeed> {
      const cutoff = new Date(Date.now() - 7 * 86400000).toISOString();
      const [active, history, stats] = await Promise.all([
        db.prepare("SELECT * FROM training_sessions WHERE owner_id = ? AND status = 'active'").bind(owner).first<Row>(),
        db.prepare("SELECT * FROM training_sessions WHERE owner_id = ? AND status = 'completed' ORDER BY started_at DESC, id DESC LIMIT 50").bind(owner).all<Row>(),
        db.prepare("SELECT COUNT(*) AS total, COALESCE(SUM(CASE WHEN finished_at >= ? THEN 1 ELSE 0 END), 0) AS week, COALESCE(SUM(completed_sets), 0) AS sets FROM training_sessions WHERE owner_id = ? AND status = 'completed'").bind(cutoff, owner).first<{total: number; week: number; sets: number}>(),
      ]);
      return { active: active ? toSession(active) : null, history: history.results.map(toSession), stats: stats ?? { total: 0, week: 0, sets: 0 } };
    },
    async start(owner: string, payload: unknown): Promise<TrainingSession> {
    await requireTrainingAllowed(db,owner);
      if (!isRecord(payload) || typeof payload.requestId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(payload.requestId) || !isScore(payload.before)) throw new TrainingError('פרטי תחילת האימון אינם תקינים.');
      const existing = await getSession(owner, payload.requestId);
      if (existing) return existing;
      const active = await db.prepare("SELECT * FROM training_sessions WHERE owner_id = ? AND status = 'active'").bind(owner).first<Row>();
      if (active) return toSession(active);
      await requireHealthConsent(db,owner);
      const access=await trainingAccess(db,owner,config);if(!access.canStart)throw new TrainingError('יש לקבל תוכנית מהמאמן או להפעיל מנוי עצמאי לפני התחלת אימון.',403);
      // Load the exact authorized assignment, never re-resolve a possibly changed pointer.
      const prescribed=access.mode==='coached'?await assignedPlan(db,owner,access.programId,config):null;
      if(access.mode==='coached'&&!prescribed)throw new TrainingError('התוכנית או ההרשאות השתנו. רעננו לפני פתיחת האימון.',409);
      const fullPlan:PlanItem[] = prescribed?JSON.parse(prescribed.items_json):(await db.prepare(selectPlan).bind(owner).all<Omit<PlanItem,'weightUnspecified'>&{targetRpesJson:string|null;tempoJson:string|null;weightUnspecified:number;customExerciseJson:string|null;dayId:string}>()).results.map(({targetRpesJson,tempoJson,weightUnspecified,repsMax,customExerciseJson,dayId,...item})=>({...item,...(dayId!=='1'?{dayId}:{}),...(customExerciseJson?{customExercise:JSON.parse(customExerciseJson)}:{}),...(repsMax==null?{}:{repsMax}),...(weightUnspecified?{weightUnspecified:true}:{}),...(targetRpesJson?{targetRpes:JSON.parse(targetRpesJson)}:{}),...(tempoJson?{tempo:JSON.parse(tempoJson)}:{})}));
      const plan = selectWorkoutDay(fullPlan,payload.dayId);
      if(plan.some(item=>!byId.has(item.exerciseId)&&item.customExercise?.id!==item.exerciseId))throw new TrainingError('תרגיל בתוכנית אינו זמין. פנו למאמן לעדכון התוכנית לפני פתיחת האימון.',409);
      const items = plan.filter(item => byId.has(item.exerciseId)||item.customExercise?.id===item.exerciseId).map(item => ({ ...item, name: item.customExercise?.name??byId.get(item.exerciseId)!.name, results: Array.from({ length: item.sets }, () => ({ done: false, amount: item.reps, weight: item.weight })) }));
      if (!items.length) throw new TrainingError('יש להוסיף תרגילים לתוכנית לפני התחלת אימון.');
      const planned = items.reduce((sum, item) => sum + item.sets, 0);
      const author=programAuthorGuard(config);
      const workspace=prescribed&&workspaceProgramId(access.programId)?workspaceAssignmentGuard(owner,access.programId!,prescribed.items_json):null;
      const modeGate=workspace?workspace.sql:access.mode==='coached'?`EXISTS(
        SELECT 1 FROM training_access a JOIN care_programs p ON p.id=a.program_id AND p.client_id=a.user_id
        JOIN care_connections c ON c.client_id=p.client_id AND c.staff_email=p.author_email
        LEFT JOIN care_staff s ON s.email=p.author_email
        WHERE a.user_id=? AND a.mode='coached' AND a.program_id=? AND p.items_json=? AND p.applied_at IS NOT NULL
          AND c.active=1 AND c.scope='care' AND ${author.sql})`:
        selfTrainingGuard(owner,config).sql;
      const modeArgs=workspace?workspace.args:prescribed?[owner,access.programId,prescribed.items_json,...author.args]:selfTrainingGuard(owner,config).args;
      const consent=healthConsentGuard(owner);
      // Authorization and the write are one statement, closing the check/write race.
      await db.prepare(`INSERT INTO training_sessions (id, owner_id, status, items_json, started_at, pain_before, planned_sets,plan_mode,program_id,readiness_json)
        SELECT ?,?,?,?,?,?,?,?,?,(SELECT json_object('id',id,'day',day,'version',version,'capturedAt',?,'data',json(content_json)) FROM wellness_records WHERE client_id=? AND kind='readiness' AND day=? LIMIT 1) WHERE ${modeGate}
          AND EXISTS(SELECT 1 FROM user_intakes WHERE user_id=? AND completed=1)
          AND NOT EXISTS(SELECT 1 FROM medical_reviews WHERE client_id=? AND state IN ('pending','in_review'))
          AND ${consent.sql}
        ON CONFLICT DO NOTHING`)
        .bind(payload.requestId, owner, 'active', JSON.stringify(items), new Date().toISOString(), payload.before, planned,access.mode,access.programId,new Date().toISOString(),owner,todayIsrael(),...modeArgs,owner,owner,...consent.args).run();
      const result = await getSession(owner, payload.requestId);
      if (result) return result;
      const race = await db.prepare("SELECT * FROM training_sessions WHERE owner_id = ? AND status = 'active'").bind(owner).first<Row>();
      if (race) return toSession(race);
      await requireHealthConsent(db,owner);
      throw new TrainingError('התוכנית, ההרשאות או מצב המוכנות השתנו. רעננו לפני פתיחת האימון.', 409);
    },
    async patch(owner: string, payload: unknown): Promise<TrainingSession> {
      if (!isRecord(payload) || typeof payload.id !== 'string' || payload.id.length > 64 || !Number.isInteger(payload.version)) throw new TrainingError('בקשת אימון לא תקינה.');
      if(['set','swap','nextLoad','effortScale'].includes(String(payload.action)))await requireTrainingAllowed(db,owner);
      const session = await getSession(owner, payload.id);
      if (!session) throw new TrainingError('האימון לא נמצא.', 404);
      if(['set','swap','nextLoad','effortScale'].includes(String(payload.action)))await requireHealthConsent(db,owner);
      if(payload.action==='followup'){
        await requireHealthConsent(db,owner);
        if(session.status!=='completed'||!session.finishedAt)throw new TrainingError('דיווח למחרת זמין לאימון שהסתיים בלבד.',409);
        const day=followupDay(session.finishedAt);
        if(todayIsrael()<day)throw new TrainingError('אפשר לדווח החל מהיום שלאחר סיום האימון.',409);
        if(!isScore(payload.pain))throw new TrainingError('דרגת הכאב צריכה להיות בין 0 ל־10.');
        const followup={day,pain:payload.pain,recordedAt:new Date().toISOString()};
        const consent=healthConsentGuard(owner);
        const row=await db.prepare(`UPDATE training_sessions SET followup_json=?,version=version+1 WHERE id=? AND owner_id=? AND status='completed' AND version=? AND ${consent.sql} RETURNING *`).bind(JSON.stringify(followup),session.id,owner,payload.version,...consent.args).first<Row>();
        if(!row){await requireHealthConsent(db,owner);throw new TrainingError('האימון עודכן במקביל. רעננו לפני שמירת הדיווח.',409,(await getSession(owner,session.id))??undefined);}
        return toSession(row);
      }
      if (payload.action === 'finish' && session.status === 'completed') return session;
      if (payload.action === 'cancel' && session.status === 'cancelled') return session;
      if (session.status !== 'active' || session.version !== payload.version) throw new TrainingError('האימון עודכן בחלון אחר. מוצגת הגרסה העדכנית; נסו שוב.', 409, session);
      if(!['finish','cancel'].includes(String(payload.action))){const access=await trainingAccess(db,owner,config);if(!access.canStart||(access.mode==='coached'&&(session.planMode!=='coached'||session.programId!==access.programId))||(access.mode==='self'&&session.planMode==='coached'))throw new TrainingError('האימון אינו שייך למסלול או לתוכנית הפעילים. אפשר לסיים או לבטל אותו.',403);}
      let items = session.items; let status: TrainingSession['status'] = session.status; let after = session.after; let finishedAt = session.finishedAt;
      if (payload.action === 'set') {
        if(payload.targetRpe!==undefined){
         const item=items.find(i=>i.exerciseId===payload.exerciseId),index=Number(payload.setIndex),target=parseRpe(payload.targetRpe);
         if(!item||!Number.isInteger(payload.setIndex)||index<0||index>=item.results.length)throw new TrainingError('הסט לא נמצא באימון.');
         if(target!==targetRpeForSet(item,index)){
          if(session.planMode==='coached')throw new TrainingError('יעד המאמץ נקבע על ידי המאמן.',403);
          if(item.results[index].done)throw new TrainingError('לא ניתן לשנות יעד של סט שכבר בוצע.',409);
          items=items.map(i=>i!==item?i:!i.targetRpes&&i.targetRpe==null?{...i,targetRpe:target}:{...i,targetRpes:Array.from({length:i.sets},(_,j)=>j===index?target:targetRpeForSet(i,j))});
         }
        }
        items = updateSet(items, payload);
        if(payload.autoNextLoad===true&&payload.done===true){
         const item=items.find(i=>i.exerciseId===payload.exerciseId)!;const index=Number(payload.setIndex);
         const suggestion=nextSetLoad(item,index,{...session,items},typeof payload.step==='number'?payload.step:2.5);
         if(suggestion.weight!==null)items=items.map(i=>i!==item?i:{...i,results:i.results.map((r,j)=>j===index+1?{...r,weight:suggestion.weight!,actualRpe:null}:r)});
        }
      }
      else if(payload.action==='effortScale'){
        if(!['rpe','rir'].includes(String(payload.effortScale))||!items.some(i=>i.exerciseId===payload.exerciseId))throw new TrainingError('שיטת מאמץ לא תקינה.');
        items=items.map(i=>i.exerciseId===payload.exerciseId?{...i,effortScale:payload.effortScale as 'rpe'|'rir'}:i);
      } else if(payload.action==='nextLoad'){
        const item=items.find(i=>i.exerciseId===payload.exerciseId);const index=Number(payload.setIndex);if(!item||!Number.isInteger(payload.setIndex)||index<0||index>=item.results.length||typeof payload.step!=='number')throw new TrainingError('פרטי התאמת המשקל אינם תקינים.');
        const suggestion=nextSetLoad(item,index,session,payload.step);if(suggestion.weight===null)throw new TrainingError(suggestion.text);
        items=items.map(i=>i!==item?i:{...i,results:i.results.map((r,j)=>j===index+1?{...r,weight:suggestion.weight!,actualRpe:null}:r)});
      } else if (payload.action === 'swap') {
        const current=items.find(i=>i.exerciseId===payload.exerciseId),replacement=byId.get(String(payload.replacementId))??(await availableCustomExercises(db,owner,session.planMode==='coached'?owner:undefined)).find(e=>e.id===payload.replacementId);
        if(session.planMode==='coached'){
          if(!current||!replacement||!current.approvedSubstitutions?.includes(replacement.id))throw new TrainingError('אפשר לבחור רק חלופה שהמאמן אישר בתוכנית.',403);
        }else await requireSelfAccess(db,owner,config);
        if(!current||!replacement||items.some(i=>i.exerciseId===replacement.id)||current.results.some(r=>r.done)||payload.confirmed!==true)throw new TrainingError('החלפה אפשרית לפני ביצוע סטים, לתרגיל שאינו כבר באימון, ולאחר אישור בחירת החלופה.');
        const defaults=customId(replacement.id)?customPrescription(replacement as import('./custom-exercise-types.ts').CustomExercise):defaultPrescription(replacement.id),unit=session.planMode==='coached'?current.unit:defaults.unit,reps=unit===current.unit?current.reps:defaults.reps;
        const approvedSubstitutions=session.planMode==='coached'?[...current.approvedSubstitutions!.filter(id=>id!==replacement.id),current.exerciseId]:undefined;
        items=items.map(i=>i!==current?i:{...current,customExercise:defaults.customExercise,approvedSubstitutions,exerciseId:replacement.id,name:replacement.name,unit,reps,repsMax:unit==='reps'?current.repsMax:null,tempo:unit==='reps'?current.tempo:null,weight:0,swappedFrom:current.swappedFrom??current.name,notes:current.swappedFrom?current.notes:`הוחלף מ־${current.name}. ${current.notes}`,results:Array.from({length:current.sets},()=>({done:false,amount:reps,weight:0,actualRpe:null}))});
      } else if (payload.action === 'finish') {
        if (!isScore(payload.after)) throw new TrainingError('דרגת הכאב צריכה להיות בין 0 ל־10.');
        if (!completion(items)) throw new TrainingError('סמנו לפחות סט אחד שבוצע לפני שמירת האימון.');
        status = 'completed'; after = payload.after; finishedAt = new Date().toISOString();
      } else if (payload.action === 'cancel') { status = 'cancelled'; finishedAt = new Date().toISOString(); }
      else throw new TrainingError('פעולה לא מוכרת.');
      // Closing a workout remains possible after revocation; further training edits do not.
      const guard=['finish','cancel'].includes(String(payload.action))?null:combineCareGuards(trainingWriteGuard(owner,session,config),healthConsentGuard(owner));
      const row = await db.prepare(`UPDATE training_sessions SET items_json = ?, status = ?, pain_after = ?, finished_at = ?, completed_sets = ?, version = version + 1 WHERE id = ? AND owner_id = ? AND version = ? AND status = 'active' ${guard?`AND ${guard.sql}`:''} RETURNING *`)
        .bind(JSON.stringify(items), status, after, finishedAt, completion(items), session.id, owner, session.version,...(guard?.args??[])).first<Row>();
      if (!row){
        const current=await getSession(owner,session.id);
        if(guard&&current?.status==='active'&&current.version===session.version)throw new TrainingError('ההרשאות, התוכנית או מצב המוכנות השתנו. השינוי לא נשמר; אפשר לסיים או לבטל את האימון.',403,current);
        throw new TrainingError('האימון עודכן במקביל. רעננו ונסו שוב.',409,current??undefined);
      }
      return toSession(row);
    },
  };
}
