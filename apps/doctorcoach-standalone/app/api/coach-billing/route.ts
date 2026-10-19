import {coachRemovalsStore} from '../../../lib/coach-removals';
import {readPayload} from '../../../lib/api-helpers';
import {inputRecord} from '../../../lib/care';
import {getChatGPTUser} from '../../chatgpt-auth';
import {getRawDb} from '../../../db/raw';
import {careConfig} from '../../../lib/care-server';
import {coachBillingStore} from '../../../lib/coach-billing-store';
import {privateJson} from '../../../lib/private-json';
import {apiError} from '../../../lib/api-helpers';
export async function GET(request:Request){const u=await getChatGPTUser();if(!u)return privateJson({error:'יש להתחבר.'},{status:401});try{return privateJson(await coachBillingStore(getRawDb(),careConfig()).report(u,new URL(request.url).searchParams.get('month')??undefined));}catch(e){return apiError(e);}}

export async function POST(request:Request){const u=await getChatGPTUser();if(!u)return privateJson({error:'יש להתחבר.'},{status:401});try{const p=inputRecord(await readPayload(request)),s=coachRemovalsStore(getRawDb(),careConfig());if(p.action==='requestRemoval')return privateJson(await s.request(u,p));if(p.action==='decideRemoval')return privateJson(await s.decide(u,p));return privateJson({error:'פעולה לא מוכרת.'},{status:400});}catch(e){return apiError(e);}}
