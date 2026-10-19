import type {CareConfig} from './care-store.ts';
type Options={clientId:string;email?:string;role?:string;scope?:'care'|'coordinator';grant?:'medical_access'|'nutrition_access'};
export function staffRoleGuard(email:string,role:string,config:CareConfig){
 if(config.exclusiveMedical&&role==='clinician'&&!(config.clinicianEmails??'').split(',').some(e=>e.trim().toLowerCase()===email.toLowerCase()))return {sql:'0=1',args:[] as string[]};
 if(role==='coordinator'&&(config.operationsEmails??'').split(',').some(e=>e.trim().toLowerCase()===email.toLowerCase()))return {sql:'NOT EXISTS(SELECT 1 FROM care_staff WHERE email=? AND active=0)',args:[email.toLowerCase()]};
 const fallback=role==='clinician'&&(config.clinicianEmails??'').split(',').some(e=>e.trim().toLowerCase()===email.toLowerCase());
 return {sql:`(EXISTS(SELECT 1 FROM care_staff WHERE email=? AND active=1 AND role=?) OR (${fallback?'1':'0'}=1 AND NOT EXISTS(SELECT 1 FROM care_staff WHERE email=?)))`,args:[email.toLowerCase(),role,email.toLowerCase()]};
}
export function careConnectionGuard(o:Options,config:CareConfig){
 const configured=[...new Set((o.role==='coordinator'?config.operationsEmails??'':config.clinicianEmails??'').split(',').map(e=>e.trim().toLowerCase()).filter(Boolean))];
 const fallback=configured.length&&(!o.role||o.role==='clinician'||o.role==='coordinator');
 return {
  sql:`EXISTS(SELECT 1 FROM care_connections c LEFT JOIN care_staff s ON s.email=c.staff_email
   WHERE c.client_id=? ${o.email?'AND c.staff_email=?':''} AND c.active=1 AND c.scope=?
   ${o.grant?`AND c.${o.grant}<>0`:''}
   ${config.exclusiveMedical&&(o.role==='clinician'||o.grant==='medical_access')?`AND c.staff_email IN (SELECT trim(value) FROM json_each(?))`:''}
   AND ((s.active=1 AND ${o.role?'s.role=?':"s.role<>'coordinator'"})
    OR (s.email IS NULL AND ${fallback?`c.staff_email IN (${configured.map(()=>'?').join(',')})`:'0=1'})))`,
  args:[o.clientId,...(o.email?[o.email.toLowerCase()]:[]),o.scope??'care',...(config.exclusiveMedical&&(o.role==='clinician'||o.grant==='medical_access')?[JSON.stringify(configured)]:[]),...(o.role?[o.role]:[]),...(fallback?configured:[])],
 };
}
export function combineCareGuards(...guards:{sql:string;args:(string|number)[]}[]){
 return {sql:guards.map(g=>'('+g.sql+')').join(' AND '),args:guards.flatMap(g=>g.args)};
}
