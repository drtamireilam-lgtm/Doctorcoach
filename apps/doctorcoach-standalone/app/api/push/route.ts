import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../chatgpt-auth';
import {getRawDb} from '../../../db/raw';
import {careConfig} from '../../../lib/care-server';
import {pushStore} from '../../../lib/push-store';
import {pushConfig} from '../../../lib/push-config';
import {apiError,readPayload} from '../../../lib/api-helpers';
import {privateJson} from '../../../lib/private-json';
import {inputRecord} from '../../../lib/care';
import {TrainingError} from '../../../lib/training';
export async function GET(){try{const u=await getChatGPTUser();if(!u)throw new TrainingError('יש להתחבר.',401);return privateJson(await pushStore(getRawDb(),careConfig(),pushConfig(env)).status(u));}catch(e){return apiError(e);}}
export async function POST(request:Request){try{const u=await getChatGPTUser();if(!u)throw new TrainingError('יש להתחבר.',401);if(request.headers.get('Sec-Fetch-Site')==='cross-site')throw new TrainingError('הבקשה אינה מאושרת.',403);const p=inputRecord(await readPayload(request)),store=pushStore(getRawDb(),careConfig(),pushConfig(env));if(p.action==='subscribe')return privateJson(await store.subscribe(u,p));if(p.action==='unsubscribe')return privateJson(await store.unsubscribe(u,p));if(p.action==='test')return privateJson(await store.test(u,p));throw new TrainingError('פעולת Push לא מוכרת.');}catch(e){return apiError(e);}}
