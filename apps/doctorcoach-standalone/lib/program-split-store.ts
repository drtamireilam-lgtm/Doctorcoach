import type {ProgramAuthorConfig} from './program-author.ts';
import {parseSplit,type ProgramSplit} from './program-split.ts';
import {trainingWriteGuard} from './training-write-guard.ts';
import {healthConsentGuard,requireHealthConsent} from './consent-server.ts';
import {combineCareGuards} from './care-write-guard.ts';
import {requireSelfAccess,noActiveWorkout} from './training-access.ts';
import {requireTrainingAllowed} from './safety-store.ts';
import {TrainingError} from './training.ts';
export function programSplitStore(db:D1Database,config:ProgramAuthorConfig={}){return {
 async get(owner:string):Promise<ProgramSplit|null>{const row=await db.prepare('SELECT payload_json,version FROM self_program_splits WHERE owner_id=?').bind(owner).first<{payload_json:string;version:number}>();return row?{...JSON.parse(row.payload_json),version:row.version}:null;},
 async save(owner:string,input:unknown):Promise<ProgramSplit>{await requireSelfAccess(db,owner,config);await requireTrainingAllowed(db,owner);await requireHealthConsent(db,owner);await noActiveWorkout(db,owner);const p=parseSplit(input),at=new Date().toISOString();const g=combineCareGuards(trainingWriteGuard(owner,{planMode:'self',programId:null},config),healthConsentGuard(owner),{sql:"NOT EXISTS(SELECT 1 FROM training_sessions WHERE owner_id=? AND status='active') AND NOT EXISTS(SELECT 1 FROM program_items WHERE owner_id=? AND day_id NOT IN (SELECT json_extract(value,'$.id') FROM json_each(?)))",args:[owner,owner,JSON.stringify(p.days)]});const json=JSON.stringify({kind:p.kind,days:p.days});const row=p.version===0?await db.prepare(`INSERT INTO self_program_splits(owner_id,payload_json,version,updated_at) SELECT ?,?,1,? WHERE ${g.sql} ON CONFLICT(owner_id) DO NOTHING RETURNING version`).bind(owner,json,at,...g.args).first():await db.prepare(`UPDATE self_program_splits SET payload_json=?,version=version+1,updated_at=? WHERE owner_id=? AND version=? AND ${g.sql} RETURNING version`).bind(json,at,owner,p.version,...g.args).first();if(!row)throw new TrainingError('החלוקה השתנתה, יש אימון פעיל או שקיימים תרגילים מחוץ לחלוקה שנבחרה. העבירו אותם קודם ליום מתאים ורעננו.',409);return {...p,version:p.version+1};}
};}
