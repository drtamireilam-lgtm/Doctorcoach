import {getChatGPTUser} from '../../chatgpt-auth';
import {getRawDb} from '../../../db/raw';
import {careConfig} from '../../../lib/care-server';
import {notificationsStore} from '../../../lib/notifications-store';
import {notificationPreferencesStore} from '../../../lib/notification-preferences';
import {apiError,readPayload} from '../../../lib/api-helpers';
import {privateJson} from '../../../lib/private-json';
import {TrainingError} from '../../../lib/training';
export async function GET(request:Request){try{
 const user=await getChatGPTUser();
 if(!user)throw new TrainingError('יש להתחבר.',401);
 if(new URL(request.url).searchParams.get('settings')==='1')return privateJson(await notificationPreferencesStore(getRawDb()).get(user.userId));
 return privateJson(await notificationsStore(getRawDb(),careConfig()).list(user));
}catch(error){return apiError(error);}}

export async function POST(request:Request){try{const user=await getChatGPTUser();if(!user)throw new TrainingError('יש להתחבר.',401);const payload=await readPayload(request) as {action?:string};const store=notificationPreferencesStore(getRawDb());return privateJson(payload.action==='dismiss'?await store.dismiss(user.userId,payload):await store.save(user.userId,payload));}catch(error){return apiError(error);}}
