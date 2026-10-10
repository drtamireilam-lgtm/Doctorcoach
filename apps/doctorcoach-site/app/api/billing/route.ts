import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../chatgpt-auth';
import {getRawDb} from '../../../db/raw';
import {billingSandbox} from '../../../lib/billing-sandbox';
import {careConfig} from '../../../lib/care-server';
import {apiError,readPayload} from '../../../lib/api-helpers';
import {privateJson} from '../../../lib/private-json';
import {TrainingError} from '../../../lib/training';
const store=()=>billingSandbox(getRawDb(),{...careConfig(),mode:env.DOCTORCOACH_BILLING_MODE});
export async function GET(request:Request){try{const u=await getChatGPTUser();if(!u)throw new TrainingError('יש להתחבר.',401);return privateJson(await store().list(u,new URL(request.url).searchParams.get('manage')==='1'));}catch(e){return apiError(e);}}
export async function POST(request:Request){try{const u=await getChatGPTUser();if(!u)throw new TrainingError('יש להתחבר.',401);const p=await readPayload(request) as {action?:string},s=store();return privateJson(p.action==='configure'?await s.configure(u,p):p.action==='create'?await s.create(u,p):p.action==='event'?await s.event(u,p):(()=>{throw new TrainingError('פעולה לא מוכרת.');})());}catch(e){return apiError(e);}}
