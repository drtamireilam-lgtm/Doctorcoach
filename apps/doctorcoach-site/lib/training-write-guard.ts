import type {TrainingSession} from './training.ts';

/** Parameters belong to the authenticated owner and persisted session, not the request. */
export function trainingWriteGuard(owner:string,session:Pick<TrainingSession,'planMode'|'programId'>){
 const access=session.planMode==='coached'?`EXISTS(
  SELECT 1 FROM training_access a JOIN care_programs p ON p.id=a.program_id AND p.client_id=a.user_id
  JOIN care_connections c ON c.client_id=p.client_id AND c.staff_email=p.author_email
  JOIN care_staff s ON s.email=p.author_email
  WHERE a.user_id=? AND a.mode='coached' AND a.program_id=? AND p.applied_at IS NOT NULL
    AND c.active=1 AND c.scope='care' AND s.active=1 AND s.role='coach')`:
  `EXISTS(SELECT 1 FROM training_access WHERE user_id=? AND mode='self' AND self_until>strftime('%Y-%m-%dT%H:%M:%fZ','now'))`;
 return {
  sql:`${access} AND EXISTS(SELECT 1 FROM user_intakes WHERE user_id=? AND completed=1)
   AND NOT EXISTS(SELECT 1 FROM medical_reviews WHERE client_id=? AND state IN ('pending','in_review'))`,
  args:[...(session.planMode==='coached'?[owner,session.programId??'']:[owner]),owner,owner],
 };
}
