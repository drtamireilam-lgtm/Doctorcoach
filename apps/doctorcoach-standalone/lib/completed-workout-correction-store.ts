import {TrainingError,type TrainingSession,isRecord} from './training.ts';
import {trainingSessionFromRow} from './training-store.ts';
import {trainingAccess} from './training-access.ts';
import {trainingWriteGuard} from './training-write-guard.ts';
import {requireHealthConsent,healthConsentGuard} from './consent-server.ts';
import {requireTrainingAllowed} from './safety-store.ts';
import {combineCareGuards} from './care-write-guard.ts';
import type {ProgramAuthorConfig} from './program-author.ts';
import {parseCompletedSetCorrection,canCorrectCompletedSet} from './completed-workout-corrections.ts';
type Row=Parameters<typeof trainingSessionFromRow>[0]&{owner_id:string};
const namespace='doctorcoachCompletedSetCorrection';
async function fingerprint(value:unknown){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value))))].map(n=>n.toString(16).padStart(2,'0')).join('');}
export function completedWorkoutCorrectionStore(db:D1Database,config:ProgramAuthorConfig={}) {
 async function entry(owner:string,id:string){const row=await db.prepare("SELECT * FROM training_sessions WHERE id=? AND owner_id=? AND status='completed' AND retrospective_json IS NULL").bind(id,owner).first<Row>();if(!row)throw new TrainingError('תיעוד האימון לא נמצא.',404);return row;}
 async function proof(owner:string,id:string,requestId:string){return db.prepare(`SELECT snapshot_json FROM retrospective_workout_revisions WHERE session_id=? AND owner_id=? AND json_extract(snapshot_json,'$.${namespace}.requestId')=?`).bind(id,owner,requestId).first<{snapshot_json:string}>();}
 async function retry(owner:string,id:string,requestId:string,hash:string):Promise<TrainingSession|null>{const row=await proof(owner,id,requestId);if(!row)return null;const meta=JSON.parse(row.snapshot_json)[namespace];if(meta.fingerprint!==hash)throw new TrainingError('מזהה התיקון כבר שימש לתוכן אחר.',409);return trainingSessionFromRow(await entry(owner,id));}
 return {
  async load(owner:string,sessionId:string){const row=await entry(owner,sessionId),access=await trainingAccess(db,owner,config);return {session:trainingSessionFromRow(row),canSave:access.canStart};},
  async correct(owner:string,value:unknown){
   const payload=parseCompletedSetCorrection(value);
   await requireHealthConsent(db,owner);await requireTrainingAllowed(db,owner);
   const access=await trainingAccess(db,owner,config);if(!access.canStart)throw new TrainingError('אין כרגע הרשאה לתיקון אימון.',403);
   const hash=await fingerprint(payload),oldRetry=await retry(owner,payload.sessionId,payload.requestId,hash);if(oldRetry)return oldRetry;
   const row=await entry(owner,payload.sessionId),session=trainingSessionFromRow(row);
   if(session.version!==payload.version)throw new TrainingError('התיעוד השתנה. טענו מחדש לפני תיקון.',409);
   // Mutate the raw JSON only: old/unknown metadata and untouched results are retained.
   const items:unknown=JSON.parse(row.items_json);
   if(!Array.isArray(items))throw new TrainingError('תיעוד האימון אינו תקין.');
   const matching=session.items.filter(i=>i.occurrenceId===payload.occurrenceId&&i.exerciseId===payload.exerciseId);
   if(matching.length!==1||!canCorrectCompletedSet(session,matching[0],payload.setIndex))throw new TrainingError('אפשר לתקן רק סט כוח שבוצע בחלק המרכזי של אימון שהושלם.');
   // withOccurrenceIds can derive IDs for older records; retain that compatibility without rewriting them.
   const index=session.items.indexOf(matching[0]),item=items[index];
   if(!isRecord(item)||!Array.isArray(item.results)||!isRecord(item.results[payload.setIndex]))throw new TrainingError('תיעוד הסט אינו תקין.');
   const result=item.results[payload.setIndex];
   if(result.weight!==payload.weight)result.weightSource='manual';
   result.amount=payload.amount;result.weight=payload.weight;result.actualRpe=payload.actualRpe;
   const json=JSON.stringify(items),operationId=crypto.randomUUID(),at=new Date().toISOString();
   const snapshot=JSON.stringify({session:row,[namespace]:{requestId:payload.requestId,fingerprint:hash,operationId}});
   const guard=combineCareGuards(trainingWriteGuard(owner,{planMode:access.mode,programId:access.programId},config),healthConsentGuard(owner));
   const absent=`NOT EXISTS(SELECT 1 FROM retrospective_workout_revisions WHERE session_id=? AND owner_id=? AND json_extract(snapshot_json,'$.${namespace}.requestId')=?)`;
   const where=`id=? AND owner_id=? AND version=? AND status='completed' AND retrospective_json IS NULL AND items_json=? AND ${guard.sql}`;
   const args=[payload.sessionId,owner,payload.version,row.items_json,...guard.args];
   await db.batch([
    db.prepare(`INSERT INTO retrospective_workout_revisions(session_id,owner_id,version,snapshot_json,corrected_at) SELECT id,owner_id,version,?,? FROM training_sessions WHERE ${where} AND ${absent} ON CONFLICT DO NOTHING`).bind(snapshot,at,...args,payload.sessionId,owner,payload.requestId),
    db.prepare(`UPDATE training_sessions SET items_json=?,version=version+1 WHERE ${where} AND EXISTS(SELECT 1 FROM retrospective_workout_revisions WHERE session_id=? AND owner_id=? AND version=? AND snapshot_json=?)`).bind(json,...args,payload.sessionId,owner,payload.version,snapshot),
    // Own only this invocation's row. A zero-row guarded UPDATE must not create retry proof.
    db.prepare(`DELETE FROM retrospective_workout_revisions WHERE session_id=? AND owner_id=? AND version=? AND snapshot_json=? AND NOT EXISTS(SELECT 1 FROM training_sessions WHERE id=? AND owner_id=? AND version=? AND items_json=?)`).bind(payload.sessionId,owner,payload.version,snapshot,payload.sessionId,owner,payload.version+1,json),
   ]);
   const saved=await retry(owner,payload.sessionId,payload.requestId,hash);
   if(!saved)throw new TrainingError('התיעוד או ההרשאות השתנו. טענו מחדש לפני תיקון.',409);
   return saved;
  },
 };
}
