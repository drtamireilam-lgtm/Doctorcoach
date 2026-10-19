import {programSplitStore} from '../../../lib/program-split-store';
import {workoutPreferencesStore} from '../../../lib/workout-preferences';
import {careConfig} from '../../../lib/care-server';
import {trainingAccess} from '../../../lib/training-access';
import { privateJson } from '../../../lib/private-json';
import { getChatGPTUser } from '../../chatgpt-auth';
import { getRawDb } from '../../../db/raw';
import { trainingStore } from '../../../lib/training-store';
import { isRecord } from '../../../lib/training';
import { apiError, readPayload } from '../../../lib/api-helpers';
const unauthorized = () => privateJson({ error: 'יש להתחבר כדי לשמור תוכנית.' }, { status: 401 });

export async function GET() {
  const user = await getChatGPTUser(); if (!user) return unauthorized();
  try { return privateJson({ split:await programSplitStore(getRawDb(),careConfig()).get(user.userId),workoutPreference:await workoutPreferencesStore(getRawDb()).get(user.userId),items: await trainingStore(getRawDb(),careConfig()).getPlan(user.userId),access:await trainingAccess(getRawDb(),user.userId,careConfig()) }); }
  catch (error) { return apiError(error); }
}
export async function POST(request: Request) {
  const user = await getChatGPTUser(); if (!user) return unauthorized();
  try {
    const payload = await readPayload(request); const store = trainingStore(getRawDb(),careConfig());
    if(isRecord(payload)&&payload.action==='split')return privateJson({split:await programSplitStore(getRawDb(),careConfig()).save(user.userId,payload)});
    if (isRecord(payload) && 'templateId' in payload) return privateJson({ items: await store.addTemplate(user.userId, payload) });
    return privateJson({ item: await store.savePlan(user.userId, payload) });
  } catch (error) { return apiError(error); }
}
export async function DELETE(request: Request) {
  const user = await getChatGPTUser(); if (!user) return unauthorized();
  try { await trainingStore(getRawDb(),careConfig()).removePlan(user.userId, await readPayload(request)); return privateJson({ ok: true }); }
  catch (error) { return apiError(error); }
}

export async function PATCH(request:Request){
 const user=await getChatGPTUser();if(!user)return unauthorized();
 try{return privateJson({workoutPreference:await workoutPreferencesStore(getRawDb()).save(user.userId,await readPayload(request))});}
 catch(error){return apiError(error);}
}
