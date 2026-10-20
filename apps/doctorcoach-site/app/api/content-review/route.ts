import {getChatGPTUser} from '../../chatgpt-auth';
import {getRawDb} from '../../../db/raw';
import {careConfig} from '../../../lib/care-server';
import {contentReviewStore} from '../../../lib/content-review-store';
import {apiError,readPayload} from '../../../lib/api-helpers';
import {privateJson} from '../../../lib/private-json';
import {TrainingError} from '../../../lib/training';
export async function GET(){try{const user=await getChatGPTUser();if(!user)throw new TrainingError('יש להתחבר.',401);return privateJson(await contentReviewStore(getRawDb(),careConfig()).list(user));}catch(e){return apiError(e);}}
export async function POST(request:Request){try{const user=await getChatGPTUser();if(!user)throw new TrainingError('יש להתחבר.',401);return privateJson(await contentReviewStore(getRawDb(),careConfig()).save(user,await readPayload(request)));}catch(e){return apiError(e);}}
