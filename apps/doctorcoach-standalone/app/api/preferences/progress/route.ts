import {getChatGPTUser} from '../../../chatgpt-auth';
import {getRawDb} from '../../../../db/raw';
import {progressLayoutStore} from '../../../../lib/progress-layout';
import {privateJson} from '../../../../lib/private-json';
import {apiError,readPayload} from '../../../../lib/api-helpers';
import {TrainingError} from '../../../../lib/training';
export async function GET(){try{const user=await getChatGPTUser();if(!user)throw new TrainingError('יש להתחבר.',401);return privateJson(await progressLayoutStore(getRawDb()).get(user.userId));}catch(e){return apiError(e);}}
export async function POST(request:Request){try{const user=await getChatGPTUser();if(!user)throw new TrainingError('יש להתחבר.',401);return privateJson(await progressLayoutStore(getRawDb()).save(user.userId,await readPayload(request)));}catch(e){return apiError(e);}}
