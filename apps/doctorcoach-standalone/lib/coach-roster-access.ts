import {isStaff,type StaffIdentity} from './staff.ts';
import type {CareConfig} from './care-store.ts';
/** Clinic coaches and coordinators can read business counts, without client-file access. */
export function coachRosterGuard(user:StaffIdentity,config:CareConfig={}){
 if(isStaff(user,config.ownerProgramEmails))return {sql:'1=1',args:[] as string[]};
 const operations=isStaff(user,config.operationsEmails);
 return {sql:`(EXISTS(SELECT 1 FROM care_staff WHERE email=? AND active=1 AND role IN ('coach','coordinator')) OR (${operations?'1':'0'}=1 AND NOT EXISTS(SELECT 1 FROM care_staff WHERE email=? AND active=0)))`,args:[user.email.trim().toLowerCase(),user.email.trim().toLowerCase()]};
}
