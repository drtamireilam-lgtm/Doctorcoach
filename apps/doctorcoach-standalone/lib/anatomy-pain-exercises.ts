import {exercises} from './content.ts';
import {trainingAccess,assignedPlan} from './training-access.ts';
import {workspaceProgramId,workspaceAssignmentGuard} from './coach-workspace-guard.ts';
import {programAuthorGuard,type ProgramAuthorConfig} from './program-author.ts';
import {planExerciseName} from './custom-exercise-types.ts';
import {withOccurrenceIds,TrainingError,type PlanItem,type SessionExercise} from './training.ts';
import type {StaffIdentity} from './staff.ts';
import type {AnatomyPainData} from './anatomy-pain.ts';
export type PainExerciseOption={id:string;he:string;en:string;source:'builtin'|'personal'|'public'|'program'|'workout'};
export type PainCatalog={ownerId:string;exercises:PainExerciseOption[]};
export type PainGuard={sql:string;args:(string|number|null)[]};
const builtin=new Map(exercises.map(e=>[e.id,e]));
const yes=():PainGuard=>({sql:'1=1',args:[]});
const label=(id:string,he:unknown,en:unknown,source:PainExerciseOption['source']):PainExerciseOption=>({id,he:typeof he==='string'?he.slice(0,150):id,en:typeof en==='string'?en.slice(0,150):id,source});
const snapshot=(item:PlanItem&{name?:string},source:PainExerciseOption['source'])=>label(item.exerciseId,item.name??planExerciseName(item,builtin.get(item.exerciseId)?.name),item.customExercise?.en??builtin.get(item.exerciseId)?.en??item.name,source);
export function painExerciseResolver(db:D1Database,config:ProgramAuthorConfig={}){
 async function plan(owner:string):Promise<{items:PlanItem[];guard:PainGuard;itemGuards?:Map<string,PainGuard>}>{
  const access=await trainingAccess(db,owner,config);
  if(access.mode==='self'){
   const rows=await db.prepare('SELECT id,exercise_id,custom_exercise_json FROM program_items WHERE owner_id=? ORDER BY id').bind(owner).all<{id:number;exercise_id:string;custom_exercise_json:string|null}>();
   const items=rows.results.map(r=>({exerciseId:r.exercise_id,...r.custom_exercise_json?{customExercise:JSON.parse(r.custom_exercise_json)}:{}})) as PlanItem[];
   const guard:PainGuard={sql:`EXISTS(SELECT 1 FROM training_access WHERE user_id=? AND mode='self') AND NOT EXISTS(SELECT 1 FROM json_each(?) j WHERE NOT EXISTS(SELECT 1 FROM program_items p WHERE p.owner_id=? AND p.exercise_id=j.value))`,args:[owner,JSON.stringify([...new Set(items.map(i=>i.exerciseId))]),owner]};
   const itemGuards=new Map<string,PainGuard>();for(const row of rows.results)if(!itemGuards.has(row.exercise_id))itemGuards.set(row.exercise_id,{sql:`(${guard.sql}) AND EXISTS(SELECT 1 FROM program_items WHERE id=? AND owner_id=? AND exercise_id=? AND COALESCE(custom_exercise_json,'')=?)`,args:[...guard.args,row.id,owner,row.exercise_id,row.custom_exercise_json??'']});
   return {items,guard,itemGuards};
  }
  const p=access.programId?await assignedPlan(db,owner,access.programId,config):null;
  if(!p)return {items:[] as PlanItem[],guard:{sql:'0=1',args:[]} as PainGuard};
  const author=programAuthorGuard(config),guard=workspaceProgramId(p.id)?workspaceAssignmentGuard(owner,p.id,p.items_json):{sql:`EXISTS(SELECT 1 FROM training_access a JOIN care_programs p ON p.id=a.program_id AND p.client_id=a.user_id JOIN care_connections c ON c.client_id=p.client_id AND c.staff_email=p.author_email LEFT JOIN care_staff s ON s.email=p.author_email WHERE a.user_id=? AND a.mode='coached' AND a.program_id=? AND p.applied_at IS NOT NULL AND p.items_json=? AND c.active=1 AND c.scope='care' AND ${author.sql})`,args:[owner,p.id,p.items_json,...author.args]};
  return {items:JSON.parse(p.items_json) as PlanItem[],guard};
 }
 return {
  async catalog(user:StaffIdentity){
   const rows=await db.prepare("SELECT id,owner_id,state,definition_json FROM custom_exercises WHERE owner_id=? OR state='published' ORDER BY created_at DESC LIMIT 600").bind(user.userId).all<{id:string;owner_id:string;state:string;definition_json:string}>();
   const options=new Map(exercises.map(e=>[e.id,label(e.id,e.name,e.en,'builtin')]));
   for(const r of rows.results){const e=JSON.parse(r.definition_json);options.set(r.id,label(r.id,e.name,e.en,r.owner_id===user.userId?'personal':'public'));}
   const current=await plan(user.userId);let usesPlan=false;
   for(const item of current.items)if(!options.has(item.exerciseId)){options.set(item.exerciseId,snapshot(item,'program'));usesPlan=true;}
   const customGuard:PainGuard=rows.results.length?{sql:`(SELECT COUNT(*) FROM custom_exercises WHERE id IN (SELECT value FROM json_each(?)) AND (owner_id=? OR state='published'))=?`,args:[JSON.stringify(rows.results.map(r=>r.id)),user.userId,rows.results.length]}:yes();
   return {exercises:[...options.values()],guard:{sql:`(${customGuard.sql}) AND (${usesPlan?current.guard.sql:'1=1'})`,args:[...customGuard.args,...usesPlan?current.guard.args:[]]} as PainGuard};
  },
  async resolve(user:StaffIdentity,data:AnatomyPainData):Promise<{option:PainExerciseOption|null;guard:PainGuard;occurrenceId?:string}>{
   if(data.sessionId){
    const row=await db.prepare("SELECT items_json,status FROM training_sessions WHERE id=? AND owner_id=? AND status IN ('active','completed')").bind(data.sessionId,user.userId).first<{items_json:string;status:string}>();
    if(!row)throw new TrainingError('האימון אינו נגיש לחשבון שלך.',403);
    let item:SessionExercise|undefined;
    if(data.exerciseId){const items=withOccurrenceIds(JSON.parse(row.items_json) as SessionExercise[]),matches=items.filter(i=>i.exerciseId===data.exerciseId);item=data.occurrenceId?matches.find(i=>i.occurrenceId===data.occurrenceId):matches.length===1?matches[0]:undefined;if(!item)throw new TrainingError('בחרו את הופעת התרגיל המתאימה באימון.',409);}
    return {option:item?snapshot(item,'workout'):null,occurrenceId:item?.occurrenceId,guard:{sql:`EXISTS(SELECT 1 FROM training_sessions WHERE id=? AND owner_id=? AND status IN ('active','completed')${item?' AND items_json=?':''})`,args:[data.sessionId,user.userId,...item?[row.items_json]:[]]}};
   }
   if(!data.exerciseId)return {option:null,guard:yes()};
   const e=builtin.get(data.exerciseId);if(e)return {option:label(e.id,e.name,e.en,'builtin'),guard:yes()};
   const custom=await db.prepare("SELECT definition_json,owner_id FROM custom_exercises WHERE id=? AND (owner_id=? OR state='published')").bind(data.exerciseId,user.userId).first<{definition_json:string;owner_id:string}>();
   if(custom){const e=JSON.parse(custom.definition_json);return {option:label(data.exerciseId,e.name,e.en,custom.owner_id===user.userId?'personal':'public'),guard:{sql:"EXISTS(SELECT 1 FROM custom_exercises WHERE id=? AND definition_json=? AND (owner_id=? OR state='published'))",args:[data.exerciseId,custom.definition_json,user.userId]}};}
   const current=await plan(user.userId),item=current.items.find(i=>i.exerciseId===data.exerciseId);
   if(!item)throw new TrainingError('התרגיל אינו נגיש לחשבון שלך. אפשר לבחור תרגיל אחר או דיווח ללא שיוך.',403);
   const guard=current.itemGuards?.get(item.exerciseId)??current.guard;
   return {option:snapshot(item,'program'),guard};
  }
 };
}
