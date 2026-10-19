import {getChatGPTUser} from '../../chatgpt-auth';
import {getRawDb} from '../../../db/raw';
import {careConfig} from '../../../lib/care-server';
import {pilotStore} from '../../../lib/pilot-store';
import {apiError,readPayload} from '../../../lib/api-helpers';
import {privateJson} from '../../../lib/private-json';
import {TrainingError} from '../../../lib/training';
import {inputRecord} from '../../../lib/care';
export async function GET(request:Request){try{const u=await getChatGPTUser();if(!u)throw new TrainingError('יש להתחבר.',401);return privateJson(await pilotStore(getRawDb(),careConfig().adminEmails,careConfig()).get(u,new URL(request.url).searchParams.get('manage')==='1'));}catch(e){return apiError(e);}}
export async function POST(request:Request){try{const u=await getChatGPTUser();if(!u)throw new TrainingError('יש להתחבר.',401);const p=inputRecord(await readPayload(request)),s=pilotStore(getRawDb(),careConfig().adminEmails,careConfig());if(!['create','close','redeem'].includes(String(p.action)))throw new TrainingError('פעולה לא מוכרת.');return privateJson(p.action==='create'?await s.create(u,p):p.action==='close'?await s.close(u,p):await s.redeem(u,p));}catch(e){return apiError(e);}}
