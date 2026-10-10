import {env} from 'cloudflare:workers';
import {getRawDb} from '../db/raw';
import {careStore} from './care-store';
export const careConfig=()=>({adminEmails:env.DOCTORCOACH_ADMIN_EMAILS,clinicianEmails:env.DOCTORCOACH_CLINICIAN_EMAILS});
export const serverCare=()=>careStore(getRawDb(),careConfig());
