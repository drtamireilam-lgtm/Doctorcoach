import {getChatGPTUser} from '../../chatgpt-auth';
import {getRawDb} from '../../../db/raw';
import {careConfig} from '../../../lib/care-server';
import {onboardingStore} from '../../../lib/onboarding-store';
import {apiError,readPayload} from '../../../lib/api-helpers';
import {privateJson} from '../../../lib/private-json';
import {TrainingError} from '../../../lib/training';
import {deletionStatus} from '../../../lib/account-deletion';
export async function GET(request:Request){try{const u=await getChatGPTUser({allowDeleted:true});if(!u)throw new TrainingError('יש להתחבר.',401);const db=getRawDb(),deletion=await deletionStatus(db,u.userId);if(deletion){if(new URL(request.url).searchParams.get('export')==='1')throw new TrainingError('החשבון נמצא בתהליך מחיקה או נמחק.',410);return privateJson({deletion,requests:[{id:deletion.requestId,kind:'deletion',state:deletion.state,createdAt:deletion.startedAt}]});}const s=onboardingStore(db,careConfig());if(new URL(request.url).searchParams.get('export')==='1')return privateJson(await s.export(u),{headers:{'Content-Disposition':'attachment; filename="DoctorCoach-my-data.json"'}});return privateJson({deletion:null,requests:await s.requests(u)});}catch(e){return apiError(e);}}
export async function POST(request:Request){try{const u=await getChatGPTUser();if(!u)throw new TrainingError('יש להתחבר.',401);return privateJson(await onboardingStore(getRawDb(),careConfig()).requestAccount(u,await readPayload(request)));}catch(e){return apiError(e);}}
