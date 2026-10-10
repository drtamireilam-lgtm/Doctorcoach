import {getChatGPTUser} from '../../chatgpt-auth';
import {getRawDb} from '../../../db/raw';
import {careConfig} from '../../../lib/care-server';
import {onboardingStore} from '../../../lib/onboarding-store';
import {apiError,readPayload} from '../../../lib/api-helpers';
import {privateJson} from '../../../lib/private-json';
import {inputRecord} from '../../../lib/care';
import {TrainingError} from '../../../lib/training';
export async function GET(){try{const u=await getChatGPTUser();if(!u)throw new TrainingError('יש להתחבר לחשבון.',401);return privateJson(await onboardingStore(getRawDb(),careConfig()).get(u));}catch(e){return apiError(e);}}
export async function POST(request:Request){try{const u=await getChatGPTUser();if(!u)throw new TrainingError('יש להתחבר לחשבון.',401);const p=inputRecord(await readPayload(request));const s=onboardingStore(getRawDb(),careConfig());return privateJson(p.action==='tour'?await s.tour(u):p.action==='consent'?await s.optionalConsent(u,p):p.action==='review'?await s.review(u,p):await s.save(u,p));}catch(e){return apiError(e);}}
