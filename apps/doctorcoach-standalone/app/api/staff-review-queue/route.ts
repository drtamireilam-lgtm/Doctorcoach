import {getChatGPTUser} from '../../chatgpt-auth';
import {getRawDb} from '../../../db/raw';
import {careConfig} from '../../../lib/care-server';
import {staffReviewQueueStore} from '../../../lib/staff-review-queue';
import {privateJson} from '../../../lib/private-json';
import {apiError,readPayload} from '../../../lib/api-helpers';
import {TrainingError} from '../../../lib/training';
export async function GET(request:Request){try{const user=await getChatGPTUser();if(!user)throw new TrainingError('יש להתחבר.',401);const store=staffReviewQueueStore(getRawDb(),careConfig()),id=new URL(request.url).searchParams.get('session');return privateJson(id?await store.session(user,id):await store.list(user));}catch(e){return apiError(e);}}
export async function POST(request:Request){try{const user=await getChatGPTUser();if(!user)throw new TrainingError('יש להתחבר.',401);return privateJson(await staffReviewQueueStore(getRawDb(),careConfig()).review(user,await readPayload(request)));}catch(e){return apiError(e);}}
