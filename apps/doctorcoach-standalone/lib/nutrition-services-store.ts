import {servicesStore} from './services-store.ts';
import {careStore,type CareConfig} from './care-store.ts';
import {staffRoleGuard} from './care-write-guard.ts';
import {ServiceError} from './services.ts';
import type {StaffIdentity} from './staff.ts';
/** A named provider mapping plus an active dietitian role are both required. */
export function nutritionServicesStore(db:D1Database,config:CareConfig&{liorEmail?:string}={}){
 async function editor(user:StaffIdentity|null){
  if(!user)throw new ServiceError('יש להתחבר.',401);
  const email=config.liorEmail?.trim().toLowerCase();
  if(!email||user.email.toLowerCase()!==email)throw new ServiceError('חשבון ניהול התזונה של ליאור טרם הוגדר או שאינו תואם לחשבון המחובר.',403);
  const staff=await careStore(db,config).requireStaff(user);if(staff.role!=='dietitian')throw new ServiceError('נדרשת הרשאת דיאטן פעילה.',403);
  return servicesStore(db,undefined,{userId:user.userId,provider:'lior',guard:staffRoleGuard(email,'dietitian',config)});
 }
 return {async list(user:StaffIdentity|null){return (await editor(user)).listAdmin(user);},async save(user:StaffIdentity|null,input:unknown){return (await editor(user)).save(user,input);}};
}
