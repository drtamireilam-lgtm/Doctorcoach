import {isStaff,type StaffIdentity} from './staff.ts';
export type ProgramAuthorConfig={ownerProgramEmails?:string;clinicianEmails?:string;operationsEmails?:string};
export function canAuthorPrograms(user:StaffIdentity,role:string,config:ProgramAuthorConfig){return role==='coach'||role==='clinician'&&isStaff(user,config.ownerProgramEmails);}
// The owner allowlist comes from server configuration, never caller payloads.
// A disabled/changed staff row overrides the configured-clinician fallback.
export function programAuthorGuard(config:ProgramAuthorConfig){
 const owners=(config.ownerProgramEmails??'').split(',').map(e=>e.trim().toLowerCase()).filter(Boolean);
 return {sql:`((s.active=1 AND s.role='coach') OR (c.staff_email IN (SELECT value FROM json_each(?)) AND ((s.active=1 AND s.role='clinician') OR s.email IS NULL)))`,args:[JSON.stringify(owners)]};
}
