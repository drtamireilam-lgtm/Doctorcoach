import {getChatGPTUser} from '../../chatgpt-auth';
import {getRawDb} from '../../../db/raw';
import {careConfig} from '../../../lib/care-server';
import {teamTasksStore} from '../../../lib/team-tasks-store';
import {privateJson} from '../../../lib/private-json';
import {apiError,readPayload} from '../../../lib/api-helpers';
import {inputRecord,textField} from '../../../lib/care';
export async function GET(request:Request){const u=await getChatGPTUser();if(!u)return privateJson({error:'יש להתחבר.'},{status:401});try{const s=teamTasksStore(getRawDb(),careConfig()),q=new URL(request.url).searchParams;if(q.has('history'))return privateJson({events:await s.history(u,q.get('history')!)});return privateJson(await s.list(u,q.has('client')?textField(q.get('client'),'מתאמן',200,1):undefined));}catch(e){return apiError(e);}}
export async function POST(request:Request){const u=await getChatGPTUser();if(!u)return privateJson({error:'יש להתחבר.'},{status:401});if(request.headers.get('Sec-Fetch-Site')==='cross-site')return privateJson({error:'הבקשה אינה מאושרת.'},{status:403});try{const s=teamTasksStore(getRawDb(),careConfig()),p=inputRecord(await readPayload(request));return privateJson(p.action==='create'?await s.create(u,p):await s.update(u,p));}catch(e){return apiError(e);}}
