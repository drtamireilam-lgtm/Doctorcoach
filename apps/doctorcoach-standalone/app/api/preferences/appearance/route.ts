import {getChatGPTUser} from '../../../chatgpt-auth';
import {getRawDb} from '../../../../db/raw';
import {appearanceStore} from '../../../../lib/appearance-store';
import {privateJson} from '../../../../lib/private-json';
import {apiError,readPayload} from '../../../../lib/api-helpers';
import {TrainingError} from '../../../../lib/training';
export async function GET(){try{const user=await getChatGPTUser();if(!user)throw new TrainingError('יש להתחבר.',401);return privateJson({...await appearanceStore(getRawDb()).get(user.userId),ownerId:user.userId});}catch(e){return apiError(e);}}
export async function POST(request:Request){try{const user=await getChatGPTUser();if(!user)throw new TrainingError('יש להתחבר.',401);return privateJson({...await appearanceStore(getRawDb()).save(user.userId,await readPayload(request,2000)),ownerId:user.userId});}catch(e){return apiError(e);}}
