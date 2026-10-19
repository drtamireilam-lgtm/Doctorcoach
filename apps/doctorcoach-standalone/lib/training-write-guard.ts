import {selfTrainingGuard} from './staff-personal-access.ts';
import {workspaceProgramId,workspaceAssignmentGuard} from './coach-workspace-guard.ts';
import {programAuthorGuard,type ProgramAuthorConfig} from './program-author.ts';
import type {TrainingSession} from './training.ts';

/** Parameters belong to the authenticated owner and persisted session, not the request. */
export function trainingWriteGuard(owner:string,session:Pick<TrainingSession,'planMode'|'programId'>,config:ProgramAuthorConfig={}){
 const self=selfTrainingGuard(owner,config);const author=programAuthorGuard(config);const workspace=session.planMode==='coached'&&workspaceProgramId(session.programId)?workspaceAssignmentGuard(owner,session.programId!):null;
 const access=workspace?workspace.sql:session.planMode==='coached'?`EXISTS(
  SELECT 1 FROM training_access a JOIN care_programs p ON p.id=a.program_id AND p.client_id=a.user_id
  JOIN care_connections c ON c.client_id=p.client_id AND c.staff_email=p.author_email
  LEFT JOIN care_staff s ON s.email=p.author_email
  WHERE a.user_id=? AND a.mode='coached' AND a.program_id=? AND p.applied_at IS NOT NULL
    AND c.active=1 AND c.scope='care' AND ${author.sql})`:
  self.sql;
 return {
  sql:`${access} AND EXISTS(SELECT 1 FROM user_intakes WHERE user_id=? AND completed=1)
   AND NOT EXISTS(SELECT 1 FROM medical_reviews WHERE client_id=? AND state IN ('pending','in_review'))`,
  args:[...(workspace?workspace.args:session.planMode==='coached'?[owner,session.programId??'',...author.args]:self.args),owner,owner],
 };
}
