import {getChatGPTUser} from '../../chatgpt-auth';
import {getRawDb} from '../../../db/raw';
import {careConfig} from '../../../lib/care-server';
import {weeklyProgressStore} from '../../../lib/weekly-progress-store';
import {apiError,readPayload} from '../../../lib/api-helpers';
import {privateJson} from '../../../lib/private-json';
import {TrainingError} from '../../../lib/training';
export async function GET(request:Request){try{const user=await getChatGPTUser();if(!user)throw new TrainingError('יש להתחבר.',401);const q=new URL(request.url).searchParams;return privateJson(await weeklyProgressStore(getRawDb(),careConfig()).report(user,q.get('client')??user.userId,q.get('week')??undefined));}catch(e){return apiError(e);}}
export async function POST(request:Request){try{const user=await getChatGPTUser();if(!user)throw new TrainingError('יש להתחבר.',401);return privateJson(await weeklyProgressStore(getRawDb(),careConfig()).saveGoal(user,await readPayload(request)));}catch(e){return apiError(e);}}
