import {getChatGPTUser} from '../../chatgpt-auth';
import {getRawDb} from '../../../db/raw';
import {careConfig} from '../../../lib/care-server';
import {mediaStore} from '../../../lib/media-store';
import {inputRecord} from '../../../lib/care';
import {apiError,readPayload} from '../../../lib/api-helpers';
import {TrainingError} from '../../../lib/training';
import {privateJson} from '../../../lib/private-json';
import {isAdmin} from '../../../lib/staff';
export async function GET(request:Request){try{const user=await getChatGPTUser();const p=new URL(request.url).searchParams,config=careConfig();return privateJson({videos:await mediaStore(getRawDb(),config).list(user,p.get('kind')==='review'?'review':'demo',p.get('client')??undefined,p.get('manage')==='1'),canManageDemo:isAdmin(user,config.adminEmails)});}catch(e){return apiError(e);}}
export async function POST(request:Request){try{const user=await getChatGPTUser();if(!user)throw new TrainingError('יש להתחבר.',401);const p=inputRecord(await readPayload(request));const store=mediaStore(getRawDb(),careConfig());if(p.action==='initialize')return privateJson(await store.initialize(user,p));if(p.action==='publish')await store.publish(user,p);else if(p.action==='feedback')await store.feedback(user,p);else throw new TrainingError('פעולה לא מוכרת.');return privateJson({ok:true});}catch(e){return apiError(e);}}
