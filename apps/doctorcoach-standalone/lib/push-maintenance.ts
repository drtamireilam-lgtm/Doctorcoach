import {isStaff,type StaffIdentity} from './staff.ts';
import {TrainingError} from './training.ts';
export async function pushMaintenance(user:StaffIdentity|null,admins:string|undefined,name:string,operations:{status:()=>Promise<unknown>;dispatch:()=>Promise<unknown>}){
 if(!isStaff(user,admins))throw new TrainingError('פעולה זו מוגבלת למנהל.',403);
 if(name==='push_status')return operations.status();
 if(name==='dispatch_notifications')return operations.dispatch();
 throw new TrainingError('כלי לא מוכר.',400);
}
