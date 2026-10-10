import {getChatGPTUser} from '../../chatgpt-auth';
import {getRawDb} from '../../../db/raw';
import {careConfig} from '../../../lib/care-server';
import {passportStore} from '../../../lib/passport-store';
import {apiError,readPayload} from '../../../lib/api-helpers';
import {privateJson} from '../../../lib/private-json';
import {TrainingError} from '../../../lib/training';
export async function GET(request:Request){try{const user=await getChatGPTUser();if(!user)throw new TrainingError('יש להתחבר.',401);return privateJson(await passportStore(getRawDb(),careConfig()).get(user,new URL(request.url).searchParams.get('client')??user.userId));}catch(e){return apiError(e);}}
export async function POST(request:Request){try{const user=await getChatGPTUser();if(!user)throw new TrainingError('יש להתחבר.',401);return privateJson(await passportStore(getRawDb(),careConfig()).save(user,await readPayload(request)));}catch(e){return apiError(e);}}
