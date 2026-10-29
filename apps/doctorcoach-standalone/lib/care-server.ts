import {env} from 'cloudflare:workers';
import {getRawDb} from '../db/raw';
import {careStore} from './care-store';
export const careConfig=()=>({userManagementEnabled:(env as unknown as Record<string,string>).DC_USER_MANAGEMENT_ENABLED==='true',adminEmails:[env.DOCTORCOACH_ADMIN_EMAILS,env.DOCTORCOACH_OPERATIONS_EMAILS].filter(Boolean).join(','),clinicianEmails:env.DOCTORCOACH_CLINICIAN_EMAILS,operationsEmails:env.DOCTORCOACH_OPERATIONS_EMAILS,ownerProgramEmails:(env.DOCTORCOACH_CLINICIAN_EMAILS??'').split(',').map(e=>e.trim().toLowerCase()).filter(e=>(env.DOCTORCOACH_ADMIN_EMAILS??'').split(',').some(a=>a.trim().toLowerCase()===e)).join(','),exclusiveMedical:true});
export const serverCare=()=>careStore(getRawDb(),careConfig());
