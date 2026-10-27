import type {ProgramAuthorConfig} from './program-author.ts';
/** Permanent personal privilege follows an authenticated staff identity, never a client payload. */
function personalGuard(ownerSql:string,ownerArgs:string[],config:ProgramAuthorConfig){
 const fallback=[...new Set([config.ownerProgramEmails,config.clinicianEmails,config.operationsEmails].filter(Boolean).join(',').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean))];
 return {sql:`EXISTS(SELECT 1 FROM staff_personal_access grant_access LEFT JOIN care_staff s ON s.email=grant_access.email WHERE grant_access.user_id=${ownerSql} AND ((s.active=1 AND s.role IN ('coach','clinician','dietitian','coordinator')) OR (s.email IS NULL AND grant_access.email IN (SELECT value FROM json_each(?)))))`,args:[...ownerArgs,JSON.stringify(fallback)]};
}
export function staffPersonalGuard(owner:string,config:ProgramAuthorConfig={}){return personalGuard('?', [owner],config);}
/** Fixed internal column expression for bounded management list projection. */
export function staffPersonalManagementGuard(config:ProgramAuthorConfig={}){return personalGuard('u.user_id',[],config);}
export function selfTrainingGuard(owner:string,config:ProgramAuthorConfig={}){const staff=staffPersonalGuard(owner,config);return {sql:`EXISTS(SELECT 1 FROM training_access WHERE user_id=? AND mode='self' AND (self_until>strftime('%Y-%m-%dT%H:%M:%fZ','now') OR ${staff.sql}))`,args:[owner,...staff.args]};}
