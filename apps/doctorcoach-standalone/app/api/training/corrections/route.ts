import { getChatGPTUser } from '../../../chatgpt-auth';
import { getRawDb } from '../../../../db/raw';
import { careConfig } from '../../../../lib/care-server';
import { privateJson } from '../../../../lib/private-json';
import { apiError, readPayload } from '../../../../lib/api-helpers';
import { completedWorkoutCorrectionStore } from '../../../../lib/completed-workout-correction-store';
export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return privateJson({error:'יש להתחבר כדי לתקן אימון.'},{status:401});
  try {
    return privateJson(await completedWorkoutCorrectionStore(getRawDb(),careConfig()).load(user.userId,new URL(request.url).searchParams.get('session')??''));
  } catch(error) { return apiError(error); }
}
export async function PATCH(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return privateJson({error:'יש להתחבר כדי לתקן אימון.'},{status:401});
  try {
    return privateJson(await completedWorkoutCorrectionStore(getRawDb(),careConfig()).correct(user.userId,await readPayload(request,4000)));
  } catch(error) { return apiError(error); }
}
