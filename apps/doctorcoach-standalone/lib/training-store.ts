import {cardioActivity,isCardioExerciseId,parseCardioPrescription} from './cardio.ts';
import {applyCardioAction,cardioActionFingerprint} from './cardio-player.ts';
import {finishFeedback} from './workout-finish.ts';
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
import { completion, resolveSessionExercise,withOccurrenceIds, defaultPrescription, isRecord, isScore, parsePlanItem, TrainingError, updateSet, updateWarmupSet, parseRpe, targetRpeForSet } from './training.ts';
import type { PlanItem, SessionExercise, TrainingFeed, TrainingSession } from './training.ts';

type Row = { finish_feedback_json:string|null; readiness_json:string|null; followup_json:string|null; plan_mode:'legacy'|'self'|'coached'; program_id:string|null; id: string; status: TrainingSession['status']; items_json: string; started_at: string; finished_at: string | null; pain_before: number; pain_after: number | null; planned_sets: number; completed_sets: number; version: number };
const selectPlan = `SELECT COALESCE(occurrence_id,day_id||':'||exercise_id) AS occurrenceId,day_id AS dayId,exercise_id AS exerciseId, sets, reps, unit, weight, notes, target_rpe AS targetRpe, effort_scale AS effortScale, target_rpes_json AS targetRpesJson, workout_section AS workoutSection,warmup_sets_json AS warmupSetsJson,load_json AS loadJson,side,tempo_json AS tempoJson,reps_max AS repsMax,weight_unspecified AS weightUnspecified,custom_exercise_json AS customExerciseJson,cardio_json AS cardioJson FROM program_items WHERE owner_id = ? ORDER BY id`;
const byId = new Map(exercises.map(exercise => [exercise.id, exercise]));
export const trainingSessionFromRow = (row: Row): TrainingSession => ({ finishFeedback:row.finish_feedback_json?JSON.parse(row.finish_feedback_json):null,readiness:row.readiness_json?JSON.parse(row.readiness_json):null,followup:row.followup_json?JSON.parse(row.followup_json):null,id: row.id, planMode:row.plan_mode,programId:row.program_id, status: row.status, items: withOccurrenceIds(JSON.parse(row.items_json) as SessionExercise[]), startedAt: row.started_at, finishedAt: row.finished_at, before: row.pain_before, after: row.pain_after, plannedSets: row.planned_sets, completedSets: row.completed_sets, version: row.version });

const toSession=trainingSessionFromRow;
export function trainingStore(db: D1Database,config:ProgramAuthorConfig={}) {
  async function getPlan(owner: string): Promise<PlanItem[]> {
    const prescribed=await allowedPlan(db,owner,config);if(prescribed!==null)return prescribed;
    return (await db.prepare(selectPlan).bind(owner).all<Omit<PlanItem,'weightUnspecified'>&{cardioJson:string|null;loadJson:string|null;warmupSetsJson:string|null;targetRpesJson:string|null;tempoJson:string|null;weightUnspecified:number;customExerciseJson:string|null;dayId:string}>()).results.map(({cardioJson,loadJson,warmupSetsJson,side,targetRpesJson,tempoJson,weightUnspecified,repsMax,customExerciseJson,dayId,...item})=>({...item,...(cardioJson?{cardio:parseCardioPrescription(JSON.parse(cardioJson))}:{}),...(loadJson?{load:JSON.parse(loadJson)}:{}),...(warmupSetsJson?{warmupSets:JSON.parse(warmupSetsJson)}:{}),...(side?{side}:{}),...(dayId!=='1'?{dayId}:{}),...(customExerciseJson?{customExercise:JSON.parse(customExerciseJson)}:{}),...(repsMax==null?{}:{repsMax}),...(weightUnspecified?{weightUnspecified:true}:{}),...(targetRpesJson?{targetRpes:JSON.parse(targetRpesJson)}:{}),...(tempoJson?{tempo:JSON.parse(tempoJson)}:{})}));
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
      const custom=(await availableCustomExercises(db,owner)).find(e=>e.id===payload.exerciseId);if(!isCardioExerciseId(payload.exerciseId)&&!byId.has(payload.exerciseId)&&!custom)throw new TrainingError('תרגיל לא מוכר.');
      const ownerItems=await getPlan(owner),matching=ownerItems.filter(i=>i.exerciseId===payload.exerciseId&&(payload.dayId===undefined||(i.dayId??'1')===payload.dayId));
      if(payload.occurrenceId===undefined&&matching.length>1)throw new TrainingError('בחרו הופעת תרגיל לפני עריכה.');
      const old=payload.occurrenceId===undefined?matching[0]:ownerItems.find(i=>i.occurrenceId===payload.occurrenceId);
      if(old&&old.exerciseId!==payload.exerciseId)throw new TrainingError('מזהה ההופעה שייך לתרגיל אחר.');
      const dayId=selfDayId(payload.dayId??old?.dayId);const split=await programSplitStore(db).get(owner);if(split&&!split.days.some(d=>d.id===dayId))throw new TrainingError('יום האימון אינו קיים בחלוקה שנבחרה.');
      const parsed=parsePlanItem(payload,custom?{...(old??customPrescription(custom)),customExercise:custom}:old);
      const item={...parsed,occurrenceId:parsed.occurrenceId??`${dayId}:${parsed.exerciseId}`,...(dayId!=='1'?{dayId}:{})};
      const guard=combineCareGuards(planGuard(owner),{sql:"(EXISTS(SELECT 1 FROM self_program_splits l,json_each(l.payload_json,'$.days') d WHERE l.owner_id=? AND json_extract(d.value,'$.id')=?) OR (? IN ('1','2','3','4','5','6','7') AND NOT EXISTS(SELECT 1 FROM self_program_splits WHERE owner_id=?)))",args:[owner,dayId,dayId,owner]});
      const saved=await db.prepare(`INSERT INTO program_items (owner_id, exercise_id, sets, reps, unit, weight, notes, target_rpe, effort_scale, target_rpes_json,workout_section,tempo_json,reps_max,weight_unspecified,custom_exercise_json,day_id,occurrence_id,warmup_sets_json,side,load_json,cardio_json) SELECT ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,? WHERE ${guard.sql} ON CONFLICT DO UPDATE SET day_id=excluded.day_id,occurrence_id=excluded.occurrence_id,sets = excluded.sets, reps = excluded.reps, unit = excluded.unit, weight = excluded.weight, notes = excluded.notes, target_rpe = excluded.target_rpe, effort_scale = excluded.effort_scale,target_rpes_json=excluded.target_rpes_json,workout_section=excluded.workout_section,tempo_json=excluded.tempo_json,reps_max=excluded.reps_max,weight_unspecified=excluded.weight_unspecified,custom_exercise_json=excluded.custom_exercise_json,warmup_sets_json=excluded.warmup_sets_json,side=excluded.side,load_json=excluded.load_json,cardio_json=excluded.cardio_json WHERE program_items.exercise_id=excluded.exercise_id RETURNING exercise_id`)
        .bind(owner, item.exerciseId, item.sets, item.reps, item.unit, item.weight, item.notes, item.targetRpe??null,item.effortScale??'rpe',item.targetRpes?JSON.stringify(item.targetRpes):null,item.workoutSection??'main',item.tempo?JSON.stringify(item.tempo):null,item.repsMax??null,item.weightUnspecified?1:0,item.customExercise?JSON.stringify(item.customExercise):null,dayId,item.occurrenceId,item.warmupSets?JSON.stringify(item.warmupSets):null,item.side??null,item.load?JSON.stringify(item.load):null,item.cardio?JSON.stringify(item.cardio):null,...guard.args).first();
      if(!saved){await requirePlanGuard(guard,owner);throw new TrainingError('מזהה הופעת התרגיל השתנה. רעננו לפני שמירה.',409);}
      return item;
    },
    async removePlan(owner: string, payload: unknown) {
      await requireSelfAccess(db,owner,config);
      if (!isRecord(payload) || typeof payload.exerciseId !== 'string' || !isCardioExerciseId(payload.exerciseId)&&!byId.has(payload.exerciseId)&&!customId(payload.exerciseId)) throw new TrainingError('תרגיל לא מוכר.');
      const ownerItems=await getPlan(owner),matching=ownerItems.filter(i=>i.exerciseId===payload.exerciseId&&(payload.dayId===undefined||(i.dayId??'1')===payload.dayId));
      if(payload.occurrenceId===undefined&&matching.length>1)throw new TrainingError('בחרו הופעת תרגיל לפני הסרה.');
      const selected=payload.occurrenceId===undefined?matching[0]:ownerItems.find(i=>i.occurrenceId===payload.occurrenceId&&i.exerciseId===payload.exerciseId);
      if(!selected){await requirePlanGuard(removeGuard(owner));return;}
      const guard=removeGuard(owner);
      const removed=await db.prepare(`DELETE FROM program_items WHERE owner_id=? AND COALESCE(occurrence_id,day_id||':'||exercise_id)=? AND ${guard.sql} RETURNING exercise_id`).bind(owner,selected.occurrenceId,...guard.args).first();
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
        return db.prepare(`INSERT INTO program_items (owner_id, exercise_id, sets, reps, unit, weight, notes,day_id) SELECT ?,?,?,?,?,0,?,? WHERE ${guard.sql} ON CONFLICT DO NOTHING`)
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
        db.prepare("SELECT COUNT(*) AS total, COALESCE(SUM(CASE WHEN finished_at >= ? THEN 1 ELSE 0 END), 0) AS week, COALESCE(SUM((SELECT COUNT(*) FROM json_each(training_sessions.items_json) item,json_each(item.value,'$.results') result WHERE COALESCE(json_extract(item.value,'$.workoutSection'),'main')='main' AND json_extract(result.value,'$.done')=1)), 0) AS sets FROM training_sessions WHERE owner_id = ? AND status = 'completed'").bind(cutoff, owner).first<{total: number; week: number; sets: number}>(),
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
      const fullPlan:PlanItem[] = prescribed?JSON.parse(prescribed.items_json):(await db.prepare(selectPlan).bind(owner).all<Omit<PlanItem,'weightUnspecified'>&{cardioJson:string|null;loadJson:string|null;warmupSetsJson:string|null;targetRpesJson:string|null;tempoJson:string|null;weightUnspecified:number;customExerciseJson:string|null;dayId:string}>()).results.map(({cardioJson,loadJson,warmupSetsJson,side,targetRpesJson,tempoJson,weightUnspecified,repsMax,customExerciseJson,dayId,...item})=>({...item,...(cardioJson?{cardio:parseCardioPrescription(JSON.parse(cardioJson))}:{}),...(loadJson?{load:JSON.parse(loadJson)}:{}),...(warmupSetsJson?{warmupSets:JSON.parse(warmupSetsJson)}:{}),...(side?{side}:{}),...(dayId!=='1'?{dayId}:{}),...(customExerciseJson?{customExercise:JSON.parse(customExerciseJson)}:{}),...(repsMax==null?{}:{repsMax}),...(weightUnspecified?{weightUnspecified:true}:{}),...(targetRpesJson?{targetRpes:JSON.parse(targetRpesJson)}:{}),...(tempoJson?{tempo:JSON.parse(tempoJson)}:{})}));
      const plan = selectWorkoutDay(withOccurrenceIds(fullPlan),payload.dayId);
      if(plan.some(item=>!item.cardio&&!byId.has(item.exerciseId)&&item.customExercise?.id!==item.exerciseId))throw new TrainingError('תרגיל בתוכנית אינו זמין. פנו למאמן לעדכון התוכנית לפני פתיחת האימון.',409);
      const items = plan.filter(item => !!item.cardio||byId.has(item.exerciseId)||item.customExercise?.id===item.exerciseId).map(item => ({ ...item, name: item.cardio?(item.cardio.customLabel??cardioActivity(item.cardio.activityId)!.name):item.customExercise?.name??byId.get(item.exerciseId)!.name,...(item.warmupSets?{warmupResults:item.warmupSets.map(set=>({...set,done:false}))}:{}), results: item.cardio?[]:Array.from({ length: item.sets }, () => ({ done: false, amount: item.reps, weight: item.weight })) }));
      if (!items.length) throw new TrainingError('יש להוסיף תרגילים לתוכנית לפני התחלת אימון.');
      const planned = items.reduce((sum, item) => sum + (item.cardio?0:item.sets), 0);
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
      if(['set','warmupSet','swap','nextLoad','effortScale','cardio'].includes(String(payload.action)))await requireTrainingAllowed(db,owner);
      const session = await getSession(owner, payload.id);
      if (!session) throw new TrainingError('האימון לא נמצא.', 404);
      if(['set','warmupSet','swap','nextLoad','effortScale','cardio'].includes(String(payload.action)))await requireHealthConsent(db,owner);
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
      if(payload.action==='cardio'&&session.items.some(i=>i.cardioResult?.actionIds.includes(String(payload.actionId)))){const selected=resolveSessionExercise(session.items,payload);if(selected.cardioResult?.actionPayloads?.[String(payload.actionId)]!==cardioActionFingerprint(payload))throw new TrainingError('מזהה פעולה כבר בשימוש.',409);return session;}
      if (session.status !== 'active' || session.version !== payload.version) throw new TrainingError('האימון עודכן בחלון אחר. מוצגת הגרסה העדכנית; נסו שוב.', 409, session);
      if(!['finish','cancel'].includes(String(payload.action))){const access=await trainingAccess(db,owner,config);if(!access.canStart||(access.mode==='coached'&&(session.planMode!=='coached'||session.programId!==access.programId))||(access.mode==='self'&&session.planMode==='coached'))throw new TrainingError('האימון אינו שייך למסלול או לתוכנית הפעילים. אפשר לסיים או לבטל אותו.',403);}
      let items = session.items; let status: TrainingSession['status'] = session.status; let after = session.after; let finishedAt = session.finishedAt;
      if(['set','warmupSet','swap','nextLoad','effortScale'].includes(String(payload.action))&&resolveSessionExercise(items,payload).cardio)throw new TrainingError('פעולת כוח אינה זמינה לפעילות אירובית.');
      if(payload.action==='cardio'){const selected=resolveSessionExercise(items,payload);if(!selected.cardio)throw new TrainingError('בחרו פעילות אירובית.');if(['start','resume'].includes(String(payload.command))&&items.some(i=>i!==selected&&i.cardioResult?.status==='running'))throw new TrainingError('פעילות אירובית אחרת פועלת. השהו או סיימו אותה לפני התחלת פעילות נוספת.',409,session);items=items.map(i=>i===selected?{...i,cardioResult:applyCardioAction(i.cardio!,i.cardioResult,payload)}:i);}
      else if(payload.action==='warmupSet'){
        items=updateWarmupSet(items,payload);
      } else if (payload.action === 'set') {
        if(payload.targetRpe!==undefined){
         const item=resolveSessionExercise(items,payload),index=Number(payload.setIndex),target=parseRpe(payload.targetRpe);
         if(!item||!Number.isInteger(payload.setIndex)||index<0||index>=item.results.length)throw new TrainingError('הסט לא נמצא באימון.');
         if(target!==targetRpeForSet(item,index)){
          if(session.planMode==='coached')throw new TrainingError('יעד המאמץ נקבע על ידי המאמן.',403);
          if(item.results[index].done)throw new TrainingError('לא ניתן לשנות יעד של סט שכבר בוצע.',409);
          items=items.map(i=>i!==item?i:!i.targetRpes&&i.targetRpe==null?{...i,targetRpe:target}:{...i,targetRpes:Array.from({length:i.sets},(_,j)=>j===index?target:targetRpeForSet(i,j))});
         }
        }
        items = updateSet(items, payload);
        if(payload.autoNextLoad===true&&payload.done===true){
         const item=resolveSessionExercise(items,payload)!;const index=Number(payload.setIndex);
         const suggestion=nextSetLoad(item,index,{...session,items},typeof payload.step==='number'?payload.step:2.5);
         const weight=suggestion.weight;
         if(weight!==null&&weight>0&&weight<=1000&&item.results[index+1]?.weightSource!=='manual'&&item.results[index+1]?.actualRpe==null&&(item.results[index+1]?.painDuring??0)===0)items=items.map(i=>i!==item?i:{...i,results:i.results.map((r,j)=>j===index+1?{...r,weight,weightSource:'automatic' as const,actualRpe:null}:r)});
        }
      }
      else if(payload.action==='effortScale'){
        if(!['rpe','rir'].includes(String(payload.effortScale))||!resolveSessionExercise(items,payload))throw new TrainingError('שיטת מאמץ לא תקינה.');
        const selected=resolveSessionExercise(items,payload);items=items.map(i=>i===selected?{...i,effortScale:payload.effortScale as 'rpe'|'rir'}:i);
      } else if(payload.action==='nextLoad'){
        const item=resolveSessionExercise(items,payload);const index=Number(payload.setIndex);if(!item||!Number.isInteger(payload.setIndex)||index<0||index>=item.results.length||typeof payload.step!=='number')throw new TrainingError('פרטי התאמת המשקל אינם תקינים.');
        const suggestion=nextSetLoad(item,index,session,payload.step);if(suggestion.weight===null)throw new TrainingError(suggestion.text);
        items=items.map(i=>i!==item?i:{...i,results:i.results.map((r,j)=>j===index+1?{...r,weight:suggestion.weight!,weightSource:'automatic' as const,actualRpe:null}:r)});
      } else if (payload.action === 'swap') {
        const current=resolveSessionExercise(items,payload);if(current.cardio)throw new TrainingError('לא ניתן להחליף אירובי בתרגיל כוח.');const replacement=byId.get(String(payload.replacementId))??(await availableCustomExercises(db,owner,session.planMode==='coached'?owner:undefined)).find(e=>e.id===payload.replacementId);
        if(session.planMode==='coached'){
          if(!current||!replacement||!current.approvedSubstitutions?.includes(replacement.id))throw new TrainingError('אפשר לבחור רק חלופה שהמאמן אישר בתוכנית.',403);
        }else await requireSelfAccess(db,owner,config);
        if(!current||!replacement||(current.results.some(r=>r.done)||current.warmupResults?.some(r=>r.done))||payload.confirmed!==true)throw new TrainingError('החלפה אפשרית לפני ביצוע סטים, ולאחר אישור בחירת החלופה.');
        const defaults=customId(replacement.id)?customPrescription(replacement as import('./custom-exercise-types.ts').CustomExercise):defaultPrescription(replacement.id),unit=session.planMode==='coached'?current.unit:defaults.unit,reps=unit===current.unit?current.reps:defaults.reps;
        const approvedSubstitutions=session.planMode==='coached'?[...current.approvedSubstitutions!.filter(id=>id!==replacement.id),current.exerciseId]:undefined;
        items=items.map(i=>i!==current?i:{...current,customExercise:defaults.customExercise,...(unit!==current.unit?{warmupSets:[],warmupResults:[]}:{}),approvedSubstitutions,exerciseId:replacement.id,name:replacement.name,unit,reps,repsMax:unit==='reps'?current.repsMax:null,tempo:unit==='reps'?current.tempo:null,weight:0,load:undefined,swappedFrom:current.swappedFrom??current.name,notes:current.swappedFrom?current.notes:`הוחלף מ־${current.name}. ${current.notes}`,results:Array.from({length:current.sets},()=>({done:false,amount:reps,weight:0,actualRpe:null}))});
      } else if (payload.action === 'finish') {
        if (!isScore(payload.after)) throw new TrainingError('דרגת הכאב צריכה להיות בין 0 ל־10.');
        if (!completion(items)&&!items.some(i=>i.cardioResult?.status==='completed')) throw new TrainingError('סמנו לפחות סט אחד שבוצע לפני שמירת האימון.');
        finishFeedback(payload.feedback);
        status = 'completed'; after = payload.after; finishedAt = new Date().toISOString();
      } else if (payload.action === 'cancel') { status = 'cancelled'; finishedAt = new Date().toISOString(); }
      else throw new TrainingError('פעולה לא מוכרת.');
      // Closing a workout remains possible after revocation; further training edits do not.
      const guard=['finish','cancel'].includes(String(payload.action))?null:combineCareGuards(trainingWriteGuard(owner,session,config),healthConsentGuard(owner));
      const row = await db.prepare(`UPDATE training_sessions SET items_json = ?, status = ?, pain_after = ?, finished_at = ?, completed_sets = ?, finish_feedback_json = ?, version = version + 1 WHERE id = ? AND owner_id = ? AND version = ? AND status = 'active' ${guard?`AND ${guard.sql}`:''} RETURNING *`)
        .bind(JSON.stringify(items), status, after, finishedAt, completion(items), payload.action==='finish'?JSON.stringify(finishFeedback(payload.feedback)):session.finishFeedback?JSON.stringify(session.finishFeedback):null, session.id, owner, session.version,...(guard?.args??[])).first<Row>();
      if (!row){
        const current=await getSession(owner,session.id);
        if(guard&&current?.status==='active'&&current.version===session.version)throw new TrainingError('ההרשאות, התוכנית או מצב המוכנות השתנו. השינוי לא נשמר; אפשר לסיים או לבטל את האימון.',403,current);
        throw new TrainingError('האימון עודכן במקביל. רעננו ונסו שוב.',409,current??undefined);
      }
      return toSession(row);
    },
  };
}
