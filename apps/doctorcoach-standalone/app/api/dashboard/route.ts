import {getChatGPTUser} from '../../chatgpt-auth';
import {getRawDb} from '../../../db/raw';
import {careConfig} from '../../../lib/care-server';
import {dashboardStore} from '../../../lib/dashboard-store';
import {apiError,readPayload} from '../../../lib/api-helpers';
import {privateJson} from '../../../lib/private-json';
import {TrainingError} from '../../../lib/training';
export async function GET(){try{const u=await getChatGPTUser();if(!u)throw new TrainingError('יש להתחבר לחשבון צוות.',401);return privateJson(await dashboardStore(getRawDb(),careConfig()).get(u));}catch(e){return apiError(e);}}
export async function POST(request:Request){try{const u=await getChatGPTUser();if(!u)throw new TrainingError('יש להתחבר.',401);return privateJson(await dashboardStore(getRawDb(),careConfig()).completeRequest(u,await readPayload(request)));}catch(e){return apiError(e);}}
