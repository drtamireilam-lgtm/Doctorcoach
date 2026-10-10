import {requireSelfAccess} from './training-access.ts';
import {healthConsentGuard,requireHealthConsent} from './consent-server.ts';
import {combineCareGuards} from './care-write-guard.ts';
import {trainingWriteGuard} from './training-write-guard.ts';
import {requireTrainingAllowed} from './safety-store.ts';
import {inputRecord,integerField} from './care.ts';
import {TrainingError} from './training.ts';
const columns='id,owner_id AS ownerId,exercise_count AS exerciseCount,pain_before AS before,pain_after AS after,created_at AS createdAt';
export type LegacyLog={id:number;ownerId:string;exerciseCount:number;before:number;after:number;createdAt:string};
export function legacyLogsStore(db:D1Database){return {
 async list(owner:string){return (await db.prepare(`SELECT ${columns} FROM workout_logs WHERE owner_id=? ORDER BY id DESC LIMIT 50`).bind(owner).all<LegacyLog>()).results;},
 async save(owner:string,payload:unknown){
  const p=inputRecord(payload),before=integerField(p.before,'כאב לפני',0,10),after=integerField(p.after,'כאב אחרי',0,10);
  await requireHealthConsent(db,owner);await requireTrainingAllowed(db,owner);await requireSelfAccess(db,owner);
  const items=await db.prepare('SELECT id FROM program_items WHERE owner_id=?').bind(owner).all<{id:number}>();
  if(!items.results.length)throw new TrainingError('יש להוסיף תרגילים לתוכנית לפני רישום אימון.');
  const guard=combineCareGuards(healthConsentGuard(owner),trainingWriteGuard(owner,{planMode:'self',programId:null}));
  const saved=await db.prepare(`INSERT INTO workout_logs(owner_id,exercise_count,pain_before,pain_after) SELECT ?,COUNT(*),?,? FROM program_items WHERE owner_id=? HAVING COUNT(*)>0 AND ${guard.sql} RETURNING ${columns}`).bind(owner,before,after,owner,...guard.args).first<LegacyLog>();
  if(saved)return saved;
  await requireHealthConsent(db,owner);await requireTrainingAllowed(db,owner);await requireSelfAccess(db,owner);
  if(!await db.prepare('SELECT id FROM program_items WHERE owner_id=? LIMIT 1').bind(owner).first())throw new TrainingError('יש להוסיף תרגילים לתוכנית לפני רישום אימון.');
  throw new TrainingError('הרשאות האימון השתנו בזמן השמירה. רעננו לפני רישום נוסף.',403);
 }
};}
